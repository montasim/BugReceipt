import { describe, expect, it } from 'vitest';
import {
  containsOffensiveLanguage,
  getOffensiveLanguageError,
  OFFENSIVE_LANGUAGE_ERROR,
} from '../src/application/content-moderation';

describe('content moderation', () => {
  it('uses the English obscenity matcher without flagging ordinary report text', async () => {
    await expect(containsOffensiveLanguage('Clicked Save and received a timeout')).resolves.toBe(
      false,
    );
    await expect(containsOffensiveLanguage('This fucking form is broken')).resolves.toBe(true);
    await expect(getOffensiveLanguageError('This fucking form is broken')).resolves.toBe(
      OFFENSIVE_LANGUAGE_ERROR,
    );
  });
});
