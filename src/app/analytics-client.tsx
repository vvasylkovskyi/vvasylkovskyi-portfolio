'use client';

import { useJune } from '@/hooks/useJune';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function Analytics() {
  const analytics = useJune();

  const pathname = usePathname();

  useEffect(() => {
    if (!analytics) {
      return;
    }

    analytics.page('Page', pathname, {
      url: pathname,
      path: pathname,
      title: pathname,
    });
  }, [pathname, analytics]);

  return null;
}
