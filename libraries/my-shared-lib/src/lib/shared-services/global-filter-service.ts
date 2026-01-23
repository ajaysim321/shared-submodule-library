import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GlobalFilterService {
  private filters: any = {
    queryParams: {},
    requestParams: {},
  };
  constructor(private http: HttpClient) { }
  private widgetId: string | null = null;
  private filterSubject = new Subject<any>();
  private currentSelectedFilter = new Subject<any>();
  private selectedFilters: { [key: string]: string | null } = {};

  filter$ = this.filterSubject.asObservable();
  currentFilter$ = this.currentSelectedFilter.asObservable();
  activeFilter!: any;
  dropdownOptions!: { [key: string]: string[] };

  isSelected(key: string, value: string): boolean {
    return this.selectedFilters[key] === value;
  }
  updateFilterSelection(
    key: string,
    values: any[],
    isQueryParam = false,
    widgetId?: string,
    emit: boolean = true
    ): void {
    // console.log('[GlobalFilterService] updateFilterSelection called with:', { key, values, isQueryParam });
    this.selectedFilters[key] = values?.[0] || null;

    if (isQueryParam) {
      this.filters.queryParams[key] = values;
    } else {
      this.filters.requestParams[key] = values;
    }
    this.widgetId = widgetId || null;
    if (emit) {
      const filterData = {
        ...this.filters,
        widgetId: this.widgetId,
        changedFilterKey: key
      };
      // console.log('[GlobalFilterService] Emitting filter data:', filterData);
      this.filterSubject.next(filterData);
      this.currentSelectedFilter.next({ key });
  }
  }


  resetFilterSelection(key: string, isQueryParam = false): void {
    delete this.selectedFilters[key];
    if (isQueryParam) {
      delete this.filters.queryParams[key];
    } else {
      delete this.filters.requestParams[key];
    }
    this.filterSubject.next({
      ...this.filters,
      widgetId: this.widgetId,
    });
  }

  deleteKey(key: string, isQueryParam = false): void {
    delete this.selectedFilters[key];
    if (isQueryParam) {
      delete this.filters.queryParams[key];
    } else {
      delete this.filters.requestParams[key];
    }
  }

  getCurrentFilters(): any {
    return this.filters;
  }
  updateAllFilters(newFilters: any): void {
    this.filters = newFilters;
    this.filterSubject.next(this.filters);
    this.currentSelectedFilter.next({});
  }

  clearAllFilters() {
    this.filterSubject.next({ queryParams: {}, requestParams: {}, widgetId: null, changedFilterKey: null });
    this.selectedFilters = {};
    this.currentSelectedFilter.next('');
  }

  initialTrigger() {
    this.filterSubject.next({ queryParams: {}, requestParams: {}, widgetId: null });
  }
 downloadExcel(apiUrl: string, filterPayload: any): Observable<Blob> {
  return this.http.post(apiUrl, filterPayload, {
    responseType: 'blob',
    withCredentials: false   // 👈 STOPS interceptor from reading undefined cookie
  });
}

}