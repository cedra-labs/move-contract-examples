import { useState, useCallback } from 'react';

export interface SectionLoaderState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface SectionLoaderActions {
  startLoading: () => void;
  stopLoading: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useSectionLoader = (initialState?: Partial<SectionLoaderState>) => {
  const [state, setState] = useState<SectionLoaderState>({
    isLoading: false,
    error: null,
    lastUpdated: null,
    ...initialState,
  });

  const startLoading = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));
  }, []);

  const stopLoading = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      lastUpdated: new Date(),
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error,
      lastUpdated: new Date(),
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      lastUpdated: null,
    });
  }, []);

  const executeWithLoader = useCallback(async <T>(
    asyncOperation: () => Promise<T>
  ): Promise<T | null> => {
    try {
      startLoading();
      const result = await asyncOperation();
      stopLoading();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      return null;
    }
  }, [startLoading, stopLoading, setError]);

  return {
    ...state,
    startLoading,
    stopLoading,
    setError,
    clearError,
    reset,
    executeWithLoader,
  };
};