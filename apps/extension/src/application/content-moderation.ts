import type { RegExpMatcher } from 'obscenity';

export const OFFENSIVE_LANGUAGE_ERROR =
  'Please revise this field. Offensive or abusive language is not allowed.';

let matcherPromise: Promise<RegExpMatcher> | undefined;

async function loadMatcher(): Promise<RegExpMatcher> {
  const { RegExpMatcher, englishDataset, englishRecommendedTransformers } =
    await import('obscenity');

  return new RegExpMatcher({
    ...englishDataset.build(),
    ...englishRecommendedTransformers,
  });
}

async function getMatcher(): Promise<RegExpMatcher> {
  matcherPromise ??= loadMatcher();
  return matcherPromise;
}

export async function containsOffensiveLanguage(message: string): Promise<boolean> {
  if (!message.trim()) return false;
  const matcher = await getMatcher();
  return matcher.hasMatch(message);
}

export async function getOffensiveLanguageError(message: string): Promise<string> {
  return (await containsOffensiveLanguage(message)) ? OFFENSIVE_LANGUAGE_ERROR : '';
}
