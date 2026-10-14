import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PortfolioDataset } from '../models/portfolio.models';
import { normalizePortfolioDataset } from '../core/portfolio-normalizer';
import { DataApiService } from './data-api.service';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private readonly api = inject(DataApiService);

  getPortfolioData(): Observable<PortfolioDataset> {
    return this.api.getPortfolio().pipe(map(normalizePortfolioDataset));
  }
}
