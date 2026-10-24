export const CONTACT_ROLES = [
  'Tour Manager',
  'Production Manager',
  'Stage Manager',
  'FOH Engineer',
  'Monitor Engineer',
  'Hospitality',
  'Security',
  'Other',
] as const;

export type ContactRole = (typeof CONTACT_ROLES)[number];

export type ContactRoleOption = {
  kind: 'listed' | 'custom';
  value: string;
  label: string;
};

export function filterContactRoles(
  query: string,
  roles: readonly string[] = CONTACT_ROLES,
): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...roles];
  return roles.filter((role) => role.toLowerCase().includes(needle));
}

export function hasExactContactRole(
  query: string,
  roles: readonly string[] = CONTACT_ROLES,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  return roles.some((role) => role.toLowerCase() === needle);
}

export function contactRoleOptions(
  query: string,
  roles: readonly string[] = CONTACT_ROLES,
): ContactRoleOption[] {
  const options: ContactRoleOption[] = filterContactRoles(query, roles).map((value) => ({
    kind: 'listed',
    value,
    label: value,
  }));
  const custom = query.trim();
  if (custom && !hasExactContactRole(custom, roles)) {
    options.push({
      kind: 'custom',
      value: custom,
      label: `Usar "${custom}"`,
    });
  }
  return options;
}
