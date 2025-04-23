'use client';

import { AnalyticsBrowser } from '@june-so/analytics-next';
import { useEffect, useState } from 'react';

export function useJune() {
  const [analytics, setAnalytics] = useState<AnalyticsBrowser | undefined>(undefined);
  const writeKey = 'wk-2dd323e31b2f419285fa63537d4fe583';

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
