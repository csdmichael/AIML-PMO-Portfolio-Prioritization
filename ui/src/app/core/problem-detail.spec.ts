import { describe, expect, it } from 'vitest';
import { ASSISTANT_WELCOME, businessText, problemMessage } from './problem-detail';

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

  it('describes database and analysis failures without implementation names or paths', () => {
    expect(businessText('OneLake file Files/exports/portfolio.json is missing. Run the Fabric pipeline.'))
      .toBe('database file database record is missing. Run the analytics service analysis refresh.');
    expect(businessText('The Foundry agent could not query OneLake via APIM.'))
      .toBe('The AI assistant could not query database via service.');
  });

  it('retains meaningful validation details while translating system terminology', () => {
    expect(problemMessage({ error: { detail: 'projectName: must contain at least 3 characters' } }, 'Failed.'))
      .toBe('projectName: must contain at least 3 characters');
    expect(problemMessage({ error: { detail: 'OneLake is unavailable.' } }, 'Failed.'))
      .toBe('database is unavailable.');
  });

  it('loads neutral assistant guidance from JSON rather than naming technologies', () => {
    expect(ASSISTANT_WELCOME).toContain('project priorities');
    expect(ASSISTANT_WELCOME).not.toMatch(/OneLake|Fabric|Foundry|SHAP|\bML\b/i);
  });
});
