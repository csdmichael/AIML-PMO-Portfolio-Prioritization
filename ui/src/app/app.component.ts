import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs';
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
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  analytics,
  analyticsOutline,
  arrowBackOutline,
  arrowForwardOutline,
  arrowUpOutline,
  barChartOutline,
  bookOutline,
  briefcaseOutline,
  calendarOutline,
  cashOutline,
  checkboxOutline,
  chevronDownOutline,
  chevronForwardOutline,
  chevronUpOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  closeCircleOutline,
  closeOutline,
  cloudUploadOutline,
  codeWorkingOutline,
  createOutline,
  documentAttachOutline,
  documentTextOutline,
  downloadOutline,
  easelOutline,
  ellipseOutline,
  flashOutline,
  funnelOutline,
  gitNetworkOutline,
  gridOutline,
  hardwareChipOutline,
  helpCircleOutline,
  layersOutline,
  logInOutline,
  openOutline,
  peopleOutline,
  personOutline,
  pieChartOutline,
  radioOutline,
  serverOutline,
  shieldCheckmarkOutline,
  sparkles,
  sparklesOutline,
  trendingUpOutline,
  warningOutline,
} from 'ionicons/icons';

addIcons({
  alertCircleOutline,
  analytics,
  analyticsOutline,
  arrowBackOutline,
  arrowForwardOutline,
  arrowUpOutline,
  barChartOutline,
  bookOutline,
  briefcaseOutline,
  calendarOutline,
  cashOutline,
  checkboxOutline,
  chevronDownOutline,
  chevronForwardOutline,
  chevronUpOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  closeCircleOutline,
  closeOutline,
  cloudUploadOutline,
  codeWorkingOutline,
  createOutline,
  documentAttachOutline,
  documentTextOutline,
  downloadOutline,
  easelOutline,
  ellipseOutline,
  flashOutline,
  funnelOutline,
  gitNetworkOutline,
  gridOutline,
  hardwareChipOutline,
  helpCircleOutline,
  layersOutline,
  logInOutline,
  openOutline,
  peopleOutline,
  personOutline,
  pieChartOutline,
  radioOutline,
  serverOutline,
  shieldCheckmarkOutline,
  sparkles,
  sparklesOutline,
  trendingUpOutline,
  warningOutline,
});

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
export class AppComponent implements OnInit {
  private readonly configService = inject(ConfigService);
  private readonly titleService = inject(Title);
  private readonly router = inject(Router);
  readonly store = inject(PortfolioStore);
  readonly navigationCollapsed = signal(false);
  readonly expandedCategories = signal<Record<string, boolean>>({ documentation: true });

  ngOnInit(): void {
    this.titleService.setTitle('PMO Portfolio Prioritization');

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (event.urlAfterRedirects.includes('/docs')) {
          this.expandedCategories.update((cats) => ({ ...cats, documentation: true }));
        }
      });
  }

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

  toggleCategory(categoryId: string): void {
    this.expandedCategories.update((map) => ({
      ...map,
      [categoryId]: !map[categoryId],
    }));
  }

  isCategoryExpanded(categoryId: string): boolean {
    return !!this.expandedCategories()[categoryId];
  }

  toggleNavigation(): void {
    if (window.matchMedia(this.splitPaneBreakpoint).matches) {
      this.navigationCollapsed.update((collapsed) => !collapsed);
    }
  }
}
