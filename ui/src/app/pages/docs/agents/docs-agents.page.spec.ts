import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DocsAgentsPageComponent } from './docs-agents.page';
import { AgentsDocConfig } from '../../../models/agents-doc.models';

const agents: AgentsDocConfig = {
  schemaVersion: 1,
  description: 'Test definitions',
  hostedIn: 'Test Foundry project',
  routing: 'Test routing',
  agents: [
    {
      id: 'intake',
      icon: 'create-outline',
      role: 'Project intake prefill',
      name: 'pmo-intake-agent',
      version: '2',
      trigger: 'Quick add',
      description: 'Fills project fields.',
      tools: [{ name: 'Bing grounding', kind: 'Foundry-managed web search', connection: 'pmo-bing-grounding', purpose: 'Searches the web.' }],
    },
    {
      id: 'recommendation',
      icon: 'sparkles-outline',
      role: 'Portfolio researcher',
      name: 'pmo-recommendation-agent',
      version: '2',
      trigger: 'Recommendations page',
      description: 'Recommends projects.',
      tools: [
        { name: 'query_portfolio', kind: 'OneLake MCP tool through APIM', connection: 'pmo-onelake-apim', purpose: 'Reads OneLake.' },
        { name: 'Bing grounding', kind: 'Foundry-managed web search', connection: 'pmo-bing-grounding', purpose: 'Checks public context.' },
      ],
    },
    {
      id: 'chat',
      icon: 'chatbubbles-outline',
      role: 'Portfolio chat',
      name: 'pmo-portfolio-copilot',
      version: '1',
      trigger: 'AI Copilot button',
      description: 'Answers portfolio questions.',
      tools: [{ name: 'query_portfolio', kind: 'OneLake MCP tool through APIM', connection: 'pmo-onelake-apim', purpose: 'Reads OneLake.' }],
    },
  ],
};

describe('AI agents and tools documentation', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DocsAgentsPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renders one card per agent with its role, name, and tools from the configuration', () => {
    const fixture = TestBed.createComponent(DocsAgentsPageComponent);
    http.expectOne('assets/config/agents.json').flush(agents);
    fixture.detectChanges();

    const cards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.agent-card'));
    expect(cards).toHaveLength(3);
    expect(cards[0].textContent).toContain('pmo-intake-agent');
    expect(cards[0].textContent).toContain('Project intake prefill');
    expect(cards[1].querySelectorAll('.tool-list li')).toHaveLength(2);
    expect(cards[2].textContent).toContain('pmo-portfolio-copilot');
  });
});
