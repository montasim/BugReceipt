import { useCallback, useEffect, useRef, useState } from 'react';
import { getOffensiveLanguageError } from '../application/content-moderation';

const LIVE_VALIDATION_DELAY_MS = 160;

export interface OffensiveLanguageValidation {
  error: string;
  checking: boolean;
  validateNow: () => Promise<string>;
}

export function useOffensiveLanguageValidation(value: string): OffensiveLanguageValidation {
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const validationSequence = useRef(0);

  const validate = useCallback(async (candidate: string, sequence: number) => {
    setChecking(true);
    try {
      const nextError = await getOffensiveLanguageError(candidate);
      if (sequence === validationSequence.current) setError(nextError);
      return nextError;
    } catch {
      if (sequence === validationSequence.current) setError('');
      return '';
    } finally {
      if (sequence === validationSequence.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    const sequence = ++validationSequence.current;
    if (!value.trim()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void validate(value, sequence);
    }, LIVE_VALIDATION_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [validate, value]);

  const validateNow = useCallback(() => {
    const sequence = ++validationSequence.current;
    return validate(value, sequence);
  }, [validate, value]);

  return {
    error: value.trim() ? error : '',
    checking: Boolean(value.trim()) && checking,
    validateNow,
  };
}
