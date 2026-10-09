export function preserveSearchPath(
  base: string,
  params: Record<string, string | string[] | undefined>
) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') qs.set(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) qs.append(key, item);
    }
  }
  const query = qs.toString();
  return query ? `${base}?${query}` : base;
}
