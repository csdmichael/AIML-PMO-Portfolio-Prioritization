import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PortfolioDataset } from '../models/portfolio.models';
import { DataApiService } from './data-api.service';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private readonly api = inject(DataApiService);

  getPortfolioData(): Observable<PortfolioDataset> {
    return this.api.getPortfolio();
  }
}
