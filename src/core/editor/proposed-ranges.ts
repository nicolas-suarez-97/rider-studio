export function proposalLocateNeedles(text?: string): string[] {
  const raw = (text || '').trim();
  if (!raw) return [];
  const preview = raw
    .replace(/^\[\[requisito:([^\]]*)\]\]\s*$/gm, '$1')
    .replace(/^\[\[aviso:([^\]]*)\]\]\s*$/gm, '[$1]')
    .replace(/^\[\[(?:tiers|contactos|columnas)(?::[^\]]*)?\]\]\s*$/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .trim();
  return preview && preview !== raw ? [raw, preview] : [raw];
}

export function trustedStoredRange<T extends { from: number; to: number }>(
  located: T | null | undefined,
  stored: T | undefined,
  storedSlice?: string,
  expectedText?: string,
): T | undefined {
  if (located) return located;
  if (!stored) return undefined;
  const needles = proposalLocateNeedles(expectedText);
  if (needles.length === 0) return stored;
  const slice = (storedSlice || '').trim();
  if (!slice) return undefined;
  const sliceLower = slice.toLowerCase();
  const matches = needles.some((needle) => {
    const expected = needle.toLowerCase();
    return sliceLower.includes(expected) || expected.includes(sliceLower);
  });
  return matches ? stored : undefined;
}

export function isSafeOldRangeToDelete(args: {
  oldSlice: string;
  proposedText?: string;
  baseText?: string;
}): boolean {
  const slice = (args.oldSlice || '').trim();
  if (!slice) return false;
  const sliceLower = slice.toLowerCase();
  const proposedNeedles = proposalLocateNeedles(args.proposedText);
  const looksProposed = proposedNeedles.some((needle) => {
    const expected = needle.toLowerCase();
    return sliceLower.includes(expected) || expected.includes(sliceLower);
  });
  return !looksProposed;
}
