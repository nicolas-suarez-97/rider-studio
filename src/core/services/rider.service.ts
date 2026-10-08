import { Rider } from '../models/Rider';

export interface IRiderService {
  getAll(): Promise<Rider[]>;
  getById(id: string): Promise<Rider | null>;
  save(rider: Rider): Promise<Rider>;
  delete(id: string): Promise<boolean>;
}

export class RiderService implements IRiderService {
  private baseUrl = '/api/riders';

  public async getAll(): Promise<Rider[]> {
    try {
      const res = await fetch(this.baseUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.riders)) {
        return data.riders.map((r: Parameters<typeof Rider.fromDatabase>[0]) => Rider.fromDatabase(r));
      }
      return [];
    } catch (err) {
      console.warn('[RiderService.getAll] Error fetching riders:', err);
      return [];
    }
  }

  public async getById(id: string): Promise<Rider | null> {
    try {
      const res = await fetch(`${this.baseUrl}?id=${id}`, { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`HTTP error: ${res.status}`);
      }
      const data = await res.json();
      if (data.rider) {
        return Rider.fromDatabase(data.rider);
      }
      return null;
    } catch (err) {
      console.warn(`[RiderService.getById] Error fetching rider ${id}:`, err);
      return null;
    }
  }

  public async save(rider: Rider): Promise<Rider> {
    const payload = rider.toDatabasePayload();
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save rider');
    }

    const data = await res.json();
    if (data.rider) {
      return Rider.fromDatabase(data.rider);
    }
    return rider;
  }

  public async delete(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}?id=${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (err) {
      console.error(`[RiderService.delete] Error deleting rider ${id}:`, err);
      return false;
    }
  }
}

export const riderService = new RiderService();
