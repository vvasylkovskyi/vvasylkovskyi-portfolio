'use client';

import { AnalyticsBrowser } from '@june-so/analytics-next';
import { useEffect, useState } from 'react';

export function useJune() {
  const [analytics, setAnalytics] = useState<AnalyticsBrowser | undefined>(undefined);
  const writeKey = process.env.NEXT_PUBLIC_JUNE_WRITE_KEY;

  useEffect(() => {
    if (!writeKey) {
      return;
    }

    const loadAnalytics = async () => {
      const response = AnalyticsBrowser.load({
        writeKey,
      });
      setAnalytics(response);
    };
    loadAnalytics();
  }, [writeKey]);

  return analytics;
}
