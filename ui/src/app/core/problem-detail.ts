import { ProblemDetail } from '../models/api.models';

/** The API's problem detail when it has one, otherwise the fallback message. */
export function problemMessage(err: unknown, fallback: string): string {
  const detail = (err as { error?: ProblemDetail } | null)?.error?.detail;
  return typeof detail === 'string' && detail.trim() ? detail : fallback;
}
