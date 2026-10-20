import { describe, expect, it } from 'vitest';
import { problemMessage } from './problem-detail';

describe('problemMessage', () => {
  it('shows the API problem detail when there is one', () => {
    expect(problemMessage({ error: { detail: 'Portfolio key is required.' } }, 'Fallback')).toBe(
      'Portfolio key is required.',
    );
  });

  it('falls back when the error carries no usable detail', () => {
    expect(problemMessage(new Error('network down'), 'Fallback')).toBe('Fallback');
    expect(problemMessage({ error: { detail: '   ' } }, 'Fallback')).toBe('Fallback');
  });
});
