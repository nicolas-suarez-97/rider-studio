'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  parseTipoParam,
  TYPE_VIEW_PARAM,
  type TypeView,
} from '@/core/constants/rider-type-tokens';

export function useTypeView(initial: TypeView = 'all') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typeView = parseTipoParam(searchParams.get(TYPE_VIEW_PARAM) ?? initial);

  const setTypeView = useCallback((next: TypeView) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete(TYPE_VIEW_PARAM);
    else params.set(TYPE_VIEW_PARAM, next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return { typeView, setTypeView };
}
