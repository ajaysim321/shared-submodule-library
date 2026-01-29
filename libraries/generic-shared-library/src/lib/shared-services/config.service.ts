import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';


@Injectable({
  providedIn: 'root',
})
export class ConfigService {

  private router = inject(Router);

  constructor(private http: HttpClient) { }

  getDashboardConfig(configFileName: string): Observable<any> {
    return this.http.get(`/assets/dashboard-config/${configFileName}`);
  }

  private buildPayload(requestParamFilters: any): any {
    const currentPath = this.router.url.split('?')[0]; // Remove query params
    const dashboardName = currentPath.startsWith('/') ? currentPath.substring(1) : currentPath;
    if (
      dashboardName === 'europe-impact-report' &&
      (!requestParamFilters || Object.keys(requestParamFilters).length === 0)
    ) {
      return {
        filter: {
          where: [],
          join: {},
          orderBy: {},
        },
      };
    }
    let staticFilters: any[] = [];
    const customerNameValue = requestParamFilters?.['customer_name'];

    if (dashboardName === 'customer-overview') {
      // added condition to filter out default customername in payload if customer name is selected 
      if (!customerNameValue && (!Array.isArray(customerNameValue) || customerNameValue.length > 0)) {
        staticFilters = [
          {
            attributeName: 'customer_name',
            operator: '!=',
            attributeValues: ['NA'],
            logicalOperator: 'AND',
          },
        ];
      }
    }else if(dashboardName === 'cspec-bridge'){
      if (!customerNameValue && (!Array.isArray(customerNameValue) || customerNameValue.length > 0)) {
        staticFilters = [

          {
            attributeName: 'latest_shop_order_flag',
            operator: '=',
            attributeValues: [true],
            logicalOperator: 'AND',
          },
        ];
      }

    } else if (dashboardName !== 'opportunity-overview' && dashboardName !=='europe-impact-report') {
      if (!customerNameValue && (!Array.isArray(customerNameValue) || customerNameValue.length > 0)) {
        staticFilters = [
          {
            attributeName: 'customer_name',
            operator: '!=',
            attributeValues: ['NA'],
            logicalOperator: 'AND',
          },
          {
            attributeName: 'latest_shop_order_flag',
            operator: '=',
            attributeValues: [true],
            logicalOperator: 'AND',
          },
        ];
      }
    }

    const dynamicFilters = Object.entries(requestParamFilters)
      .map(([key, value]) => {
        const rawValues = Array.isArray(value) ? value.flat(Infinity) : [value]; // recursively flatten the array to any depth eg. [[[]]].
        let updatedValues = rawValues.filter(v =>
          v !== null &&
          v !== undefined &&
          v !== '' &&
          !(Array.isArray(v) && v.length === 0)
        );



        if (updatedValues?.length === 0) return null;

        return {
          attributeName: key,
          operator: updatedValues.length > 1 ? 'IN' : '=',
          attributeValues: updatedValues,
          logicalOperator: 'AND'
        };
      })
      .filter((filter): filter is NonNullable<typeof filter> => filter !== null); //emoves null entries from the array.

    // Adjust logicalOperator handling
    if (dynamicFilters.length > 0) {
      dynamicFilters[dynamicFilters.length - 1].logicalOperator = '';
      if (staticFilters.length > 0) {
        staticFilters[staticFilters.length - 1].logicalOperator = 'AND';
      }
    } else {
      if (staticFilters.length > 0) {
        staticFilters[staticFilters.length - 1].logicalOperator = '';
      }
    }

    return {
      filter: {
        where: [...staticFilters, ...dynamicFilters],
        join: {},
        orderBy: {}
      }
    };
  }

  private buildQueryParams(queryParamFilters: any): HttpParams {
    let params = new HttpParams();
    for (const key in queryParamFilters) {
      const value = queryParamFilters[key];

      if (key === 'slider_range' && Array.isArray(value) && value.length === 2) {
        const start = parseInt(value[0], 10);
        const end = parseInt(value[1], 10);

        params = params.set('startRange', start.toString());
        console.log('Start Range:', start);
        params = params.set('endRange', end.toString());
      }
      else if (key === 'button') {
        params = params.set(value[0], true);
      }
      else {
        params = params.set(key, Array.isArray(value) ? value.join(',') : value);
      }
    }

    return params;
  }


  getConfig(url: string, filters?: any, method = 'post', isTable = false): Observable<any> {
    const useQueryParams = filters?.useQueryParams === true;

    if (filters && 'useQueryParams' in filters) {
      delete filters.useQueryParams;
    }

    const payload = this.buildPayload(filters?.requestParams || {});
    const queryParams = useQueryParams
      ? this.buildQueryParams(filters?.queryParams || {})
      : new HttpParams();

    if (!!isTable) {
      const currentPath = this.router.url.split('?')[0];
      const dashboardName = currentPath.startsWith('/') ? currentPath.substring(1) : currentPath;
      if (dashboardName === 'cspec-sales-bridge') {
        payload.filter.where = payload.filter.where.filter((elm: any) =>
          ['customer_name', 'customer_spec'].includes(elm.attributeName)
        );
      } else {
        payload.filter.where = payload.filter.where.filter((elm: any) => elm.attributeName === 'customer_spec');
      }

      if (payload?.filter?.where?.length > 0) {
        payload.filter.where[payload.filter.where.length - 1].logicalOperator = '';
      }
    }

    return method === 'post'
      ? this.http.post<any>(url, payload, { params: queryParams })
      : this.http.get(url, { params: queryParams });
  }

createPayload(filters: { [key: string]: any } = {}, entity: string = '', filterName: string = ''): any {
  const keys = Object.keys(filters);

  const where = keys.flatMap(key => {
    const value = filters[key];

    // Check if the key is 'filter' and its value is an array of rule objects
    const isFilterRuleArray = key === 'filter' && 
                              Array.isArray(value) && 
                              value.length > 0 && 
                              typeof value[0] === 'object' && 
                              value[0] !== null && 
                              'attributeName' in value[0];

    if (isFilterRuleArray) {
      return value; // It's from the dialog, return the rules directly
    }

    // Process other simple filters (or a 'filter' that is not a rule array)
    const values = (Array.isArray(value) ? value : [value])
      .filter(v => v !== null && v !== undefined && v !== '' && v !== 'All');

    if (values.length === 0) {
      return [];
    }

    return [{
      attributeName: key,
      operator: values.length > 1 ? 'IN' : '=',
      attributeValues: values,
      logicalOperator: 'AND' // Placeholder
    }];
  });

  // Now, fix the logical operators for the entire 'where' clause
  if (where.length > 0) {
    for (let i = 0; i < where.length - 1; i++) {
      // If a rule from the dialog already has an operator (like OR), respect it.
      // Otherwise, set it to AND.
      if (!where[i].logicalOperator) {
        where[i].logicalOperator = 'AND';
      }
    }
    // The very last item in the whole clause has no logical operator.
    where[where.length - 1].logicalOperator = '';
  }

  return {
 
    filterName,
    entity
  };
}


getApi(url: string, filters?: any, data?: any, method = 'post'): Observable<any> {
    const queryParamsForHttp = { ...(filters?.queryParams || {}) };
    const rawQueryString = filters?.rawQueryString;

    if (data?.embedQueryParams && Array.isArray(data.embeddedParams)) {
      const embeddedParts = [];
      for (const paramName of data.embeddedParams) {
        if (queryParamsForHttp[paramName]) {
          embeddedParts.push(queryParamsForHttp[paramName]);
          delete queryParamsForHttp[paramName]; // Remove from query params copy
        }
      }
      if (embeddedParts.length > 0) {
        // Ensure there are no trailing slashes on the base url
        const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        url = [baseUrl, ...embeddedParts].join('/');
      }
    }
    let payload;
    if (data?.skipDefaultPayload) {
      if (data.customPayload) {
    const requestParams = { ...(filters?.requestParams || {}) };
    // Wrap workflow_id in extra array before merging
    for (const key in requestParams) {
        if (key === 'workflow_id' && Array.isArray(requestParams[key])) {
            requestParams[key] = [ [...requestParams[key]] ];
        }
    }
    payload = { ...data.customPayload, ...requestParams };
}
 else {
        const requestParams = { ...(filters?.requestParams || {}) };
        if (requestParams.filter) {
          const { filter, ...otherParams } = requestParams;
          const filterPayload = Array.isArray(filter) ? (filter[0] || {}) : filter;
          payload = { ...otherParams, ...filterPayload };
        } else {
          payload = requestParams;
        }
        if (Object.keys(payload).length === 0) {
          payload = null;
        }
      }
    } else {
      payload = {
        functionName: data?.functionName || '',
        version: data?.version || '1.0',
        requestData: {
          filter: this.createPayload(
            filters?.requestParams || {},
            data?.entity || '',
            "filterA"
            // data?.orderBy || {}
          )
        }
      };
    }
  
    const useQueryParams = data?.useQueryParam !== false;
    let queryParams = new HttpParams();

    if (useQueryParams) {
      if (rawQueryString) {
        url = `${url}?${rawQueryString}`;
      } else {
        queryParams = this.buildQueryParams(queryParamsForHttp);
      }
    }
  
    return method === 'post'
      ? this.http.post<any>(url, payload, { params: queryParams })
      : this.http.get<any>(url, { params: queryParams });
  }

  getDropdownOptions(url: string, payload: any): Observable<any> {
    return this.http.post(url, payload);
  }

  getData(url: string) {
    return this.http.get(url)
  }
}
