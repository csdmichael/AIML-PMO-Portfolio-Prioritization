import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { IonBadge, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonIcon } from '@ionic/angular';
import { AgentsDocConfig } from '../../../models/agents-doc.models';

@Component({
  selector: 'app-docs-agents-page',
  standalone: true,
  imports: [CommonModule, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding docs-agents">
      @if (doc(); as d) {
        <header class="doc-header">
          <h2>AI agents and tools</h2>
          <p class="hosted">{{ d.hostedIn }}</p>
          <p class="routing">{{ d.routing }}</p>
        </header>

        <div class="agent-grid">
          @for (agent of d.agents; track agent.name) {
            <ion-card class="agent-card">
              <ion-card-header>
                <div class="agent-head">
                  <div class="agent-icon"><ion-icon [name]="agent.icon"></ion-icon></div>
                  <div>
                    <div class="agent-role">{{ agent.role }}</div>
                    <ion-card-title class="agent-name">
                      {{ agent.name }} <span class="version">v{{ agent.version }}</span>
                    </ion-card-title>
                  </div>
                </div>
              </ion-card-header>
              <ion-card-content>
                <p class="agent-desc">{{ agent.description }}</p>
                <p class="trigger"><strong>Used from:</strong> {{ agent.trigger }}</p>
                <h4 class="tools-heading">Tools it uses</h4>
                <ul class="tool-list">
                  @for (tool of agent.tools; track tool.name + tool.connection) {
                    <li>
                      <div class="tool-title">
                        <strong>{{ tool.name }}</strong>
                        <ion-badge color="medium">{{ tool.kind }}</ion-badge>
                      </div>
                      <div class="tool-purpose">{{ tool.purpose }}</div>
                      <div class="tool-connection">Connection: {{ tool.connection }}</div>
                    </li>
                  }
                </ul>
              </ion-card-content>
            </ion-card>
          }
        </div>
      } @else {
        <p>Loading agent definitions.</p>
      }
    </ion-content>
  `,
  styles: [`
    .doc-header h2 { margin: 0 0 6px; }
    .hosted, .routing { margin: 0 0 8px; color: #5b6573; max-width: 880px; }
    .agent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; margin-top: 16px; }
    .agent-card { margin: 0; }
    .agent-head { display: flex; gap: 12px; align-items: center; }
    .agent-icon { width: 44px; height: 44px; border-radius: 12px; background: #eef4fd; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #0078d4; }
    .agent-role { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #5b6573; }
    .agent-name { font-size: 1rem; font-family: monospace; }
    .version { font-size: 12px; color: #5b6573; margin-left: 6px; font-family: inherit; }
    .agent-desc { margin: 0 0 10px; font-size: 14px; }
    .trigger { font-size: 13px; color: #3b4454; margin: 0 0 10px; }
    .tools-heading { margin: 8px 0 6px; font-size: 13px; }
    .tool-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
    .tool-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 14px; }
    .tool-purpose { font-size: 13px; margin-top: 2px; }
    .tool-connection { font-size: 12px; color: #5b6573; font-family: monospace; margin-top: 2px; }
  `],
})
export class DocsAgentsPageComponent {
  private readonly http = inject(HttpClient);
  readonly doc = toSignal(this.http.get<AgentsDocConfig>('assets/config/agents.json'), { initialValue: null });
}
