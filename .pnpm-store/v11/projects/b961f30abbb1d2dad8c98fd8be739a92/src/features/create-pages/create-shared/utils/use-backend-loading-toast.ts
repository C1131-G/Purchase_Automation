import { goeyToast } from "goey-toast";
import { useEffect, useRef } from "react";

interface UseBackendLoadingToastProps {
  loading: boolean;
  loadingMessage: string;
  errorMessage?: string | null;
}

/**
 * Shows a persistent loading toast while backend work is in-flight,
 * then dismisses immediately when complete.
 */
export function useBackendLoadingToast({
  loading,
  loadingMessage,
  errorMessage = null,
}: UseBackendLoadingToastProps) {
  const loadingToastIdRef = useRef<string | number | null>(null);
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) {
      if (loadingToastIdRef.current === null) {
        loadingToastIdRef.current = goeyToast.info(loadingMessage, {
          duration: 24 * 60 * 60 * 1000,
        });
      }
      return;
    }

    if (loadingToastIdRef.current !== null) {
      goeyToast.dismiss(loadingToastIdRef.current);
      loadingToastIdRef.current = null;
    }
  }, [loading, loadingMessage]);

  useEffect(() => {
    const normalizedError = errorMessage?.trim() ?? "";
    if (!normalizedError) {
      return;
    }
    if (lastErrorRef.current === normalizedError) {
      return;
    }
    lastErrorRef.current = normalizedError;
    goeyToast.error(normalizedError);
  }, [errorMessage]);

  useEffect(
    () => () => {
      if (loadingToastIdRef.current !== null) {
        goeyToast.dismiss(loadingToastIdRef.current);
      }
    },
    [],
  );
}
