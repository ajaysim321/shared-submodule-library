import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GenericPayloadService {
  constructor(private http: HttpClient) {}

  buildPayload(requestParamFilters: any, staticFilters: any[] = []): any {
    const dynamicFilters = Object.entries(requestParamFilters)
      .map(([key, value]) => {
        const rawValues = Array.isArray(value) ? value.flat(Infinity) : [value];
        const updatedValues = rawValues.filter(v =>
          v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
        );

        if (updatedValues.length === 0) return null;

        return {
          attributeName: key,
          operator: updatedValues.length > 1 ? 'IN' : '=',
          attributeValues: updatedValues,
          logicalOperator: 'AND'
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    if (dynamicFilters.length > 0) dynamicFilters[dynamicFilters.length - 1].logicalOperator = '';
    if (staticFilters.length > 0 && dynamicFilters.length === 0) {
      staticFilters[staticFilters.length - 1].logicalOperator = '';
    }

    return {
      filter: {
        where: [...staticFilters, ...dynamicFilters],
        join: {},
        orderBy: {}
      }
    };
  }

  buildQueryParams(queryParamFilters: any): HttpParams {
    let params = new HttpParams();
    for (const key in queryParamFilters) {
      const value = queryParamFilters[key];

      if (key === 'slider_range' && Array.isArray(value) && value.length === 2) {
        const start = parseInt(value[0], 10);
        const end = parseInt(value[1], 10);
        params = params.set('startRange', start.toString());
        params = params.set('endRange', end.toString());
      } else if (key === 'button') {
        params = params.set(value[0], true);
      } else {
        params = params.set(key, Array.isArray(value) ? value.join(',') : value);
      }
    }

    return params;
  }

  sendRequest(url: string, payload: any, method: 'post' | 'get', queryParams: HttpParams): Observable<any> {
    return method === 'post' ? this.http.post(url, payload, { params: queryParams }) : this.http.get(url, { params: queryParams });
  }
}