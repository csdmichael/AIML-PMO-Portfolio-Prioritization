import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonMenuToggle,
  IonRouterOutlet,
} from '@ionic/angular';
import { ConfigService } from './services/config.service';
import { PortfolioStore } from './services/portfolio.store';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { AgentFabComponent } from './components/agent-fab/agent-fab.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    IonApp,
    IonSplitPane,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonMenuToggle,
    IonRouterOutlet,
    HeaderComponent,
    FooterComponent,
    AgentFabComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly configService = inject(ConfigService);
  readonly store = inject(PortfolioStore);

  get brandConfig() {
    return this.configService.config.brand;
  }

  get navigationItems() {
    return this.configService.config.navigation;
  }

  get splitPaneBreakpoint(): string {
    const xl = this.configService.config.breakpoints.xl;
    return `(min-width: ${xl}px)`;
  }
}
