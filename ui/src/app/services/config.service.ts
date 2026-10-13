import { Injectable, signal } from '@angular/core';
import { UiConfig } from '../models/ui-config.models';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly configSignal = signal<UiConfig | null>(null);

  get config(): UiConfig {
    const val = this.configSignal();
    if (!val) {
      throw new Error('UiConfig has not been initialized');
    }
    return val;
  }

  get config$() {
    return this.configSignal.asReadonly();
  }

  async load(): Promise<UiConfig> {
    const response = await fetch('assets/config/ui.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load ui.json: ${response.status} ${response.statusText}`);
    }
    const data = (await response.json()) as UiConfig;
    this.configSignal.set(data);
    this.applyCssTokens(data.tokens);
    return data;
  }

  private applyCssTokens(tokens: Record<string, string>): void {
    if (typeof document === 'undefined' || !document.documentElement) {
      return;
    }
    const root = document.documentElement;
    for (const [key, val] of Object.entries(tokens)) {
      root.style.setProperty(key, val);
    }
  }
}

export function initializeAppConfig(configService: ConfigService) {
  return () => configService.load();
}
