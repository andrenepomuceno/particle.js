import { createElement, Fragment, type ReactNode } from 'react';

/** The markup catalog strings may carry: one level of <kbd>, <b>, <i> or <code>, no attributes. */
const TAG = /<(kbd|b|i|code)>(.*?)<\/\1>/g;

/** Splits catalog text into strings and the elements its tags name; anything else stays literal text. */
export function richParts(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TAG)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(createElement(match[1]!, { key: match.index }, match[2]));
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Catalog text with its <kbd>, <b>, <i> and <code> rendered (never as HTML). */
export function Rich({ text }: { text: string }) {
  return createElement(Fragment, null, ...richParts(text));
}
