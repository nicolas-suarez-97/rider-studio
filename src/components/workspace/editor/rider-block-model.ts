export type NoticeTone = 'note' | 'required' | 'rejected';

export type ContactPerson = {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string;
};

export function emptyContact(index = 1): ContactPerson {
  return {
    id: `contact-${index}-${Math.random().toString(36).slice(2, 7)}`,
    role: '',
    name: '',
    phone: '',
    email: '',
  };
}

export function normalizePeople(value: unknown): ContactPerson[] {
  if (!Array.isArray(value) || value.length === 0) return [emptyContact(1)];
  return value.map((item, index) => {
    const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    return {
      id: typeof row.id === 'string' && row.id ? row.id : `contact-${index + 1}`,
      role: typeof row.role === 'string' ? row.role : '',
      name: typeof row.name === 'string' ? row.name : '',
      phone: typeof row.phone === 'string' ? row.phone : '',
      email: typeof row.email === 'string' ? row.email : '',
    };
  });
}
