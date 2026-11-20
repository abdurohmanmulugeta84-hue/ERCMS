/**
 * useFetch — generic data-fetching hook.
 *
 * Usage:
 *   const { data, isLoading, error, refetch } = useFetch(listEqubs, []);
 *
 * @param {Function} fetchFn  — async function that returns the data
 * @param {any[]}    deps     — dependency array (like useEffect); refetch when these change
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track whether the component is still mounted to avoid state updates on unmount
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (isMounted.current) {
        setData(result);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err?.response?.data?.detail || err?.message || 'An error occurred.');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute]);

  return { data, isLoading, error, refetch: execute };
}
