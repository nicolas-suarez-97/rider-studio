import { ChannelData } from '../types/rider.types';

export class ChannelInput implements ChannelData {
  constructor(
    public id: string,
    public ch: string,
    public name: string,
    public mic: string,
    public stand: string,
    public altMic?: string,
    public phantom?: boolean,
    public subSnake?: string
  ) {}

  public static create(
    ch: string,
    name: string,
    mic: string,
    stand: string,
    altMic?: string,
    phantom?: boolean,
    subSnake?: string
  ): ChannelInput {
    return new ChannelInput(
      `ch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ch,
      name,
      mic,
      stand,
      altMic,
      phantom,
      subSnake
    );
  }

  public static fromData(data: Partial<ChannelData>, index?: number): ChannelInput {
    const ch = data.ch || String((index ?? 0) + 1).padStart(2, '0');
    return new ChannelInput(
      data.id || `ch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ch,
      data.name || 'Canal',
      data.mic || 'Shure SM58',
      data.stand || 'Standard',
      data.altMic || '',
      data.phantom ?? false,
      data.subSnake || ''
    );
  }

  public toJSON(): ChannelData {
    return {
      id: this.id,
      ch: this.ch,
      name: this.name,
      mic: this.mic,
      stand: this.stand,
      altMic: this.altMic,
      phantom: this.phantom,
      subSnake: this.subSnake
    };
  }
}
