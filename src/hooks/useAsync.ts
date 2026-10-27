import { useCallback, useEffect, useState } from 'react';
import { ApiError, isCanceled, toApiError } from '../api/client';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

// Ejecuta `load` al montar (y cuando cambia `load`) y cancela la request anterior con AbortController.
// `load` debe venir memorizado con useCallback para no repetir la request en cada render.
export default function useAsync<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    load(controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((error: unknown) => {
        if (isCanceled(error)) return;
        setState({ status: 'error', error: toApiError(error) });
      });
    return () => controller.abort();
  }, [load, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { state, retry };
}
