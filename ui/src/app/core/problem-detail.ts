import { ProblemDetail } from '../models/api.models';
import language from '../../assets/config/business-language.json';

export const ASSISTANT_WELCOME = language.assistantWelcome;
const replacements = language.replacements.map(({ pattern, text }) => ({ pattern: new RegExp(pattern, 'gi'), text }));

/** Translate system messages only; recorded project names and evidence are left unchanged. */
export function businessText(message: string): string {
  return replacements.reduce((value, rule) => value.replace(rule.pattern, rule.text), message);
}

/** The API's problem detail when it has one, otherwise the fallback message. */
export function problemMessage(err: unknown, fallback: string): string {
  const detail = (err as { error?: ProblemDetail } | null)?.error?.detail;
  return businessText(typeof detail === 'string' && detail.trim() ? detail : fallback);
}
