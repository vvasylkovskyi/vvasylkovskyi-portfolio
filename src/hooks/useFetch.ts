import type { GenericResponse } from '@/types/types';
import { useEffect, useState } from 'react';

export const useFetch = <T>(url: string): GenericResponse<T> => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result: GenericResponse<T> = await response.json();
        setData(result as T);
        if (result.detail) {
          setErrorDetail(result.detail);
        } else {
          setErrorDetail(null);
        }
      } catch (err) {
        setErrorDetail((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [url]); // Fetch again if the URL changes

  return { data, isLoading, errorDetail };
};
