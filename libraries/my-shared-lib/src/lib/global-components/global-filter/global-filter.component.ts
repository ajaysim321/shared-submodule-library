import { CommonModule } from '@angular/common';
import { Component, Input, QueryList, ViewChildren } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ConfigService } from '../../shared-services/config.service';
import { HttpClient } from '@angular/common/http';
import { GlobalDropdownComponent } from '../global-dropdown/global-dropdown.component';
import { MatSliderComponent } from '../mat-slider/mat-slider.component';
import {
  debounceTime,
  distinctUntilChanged,
  elementAt,
  OperatorFunction,
  startWith,
} from 'rxjs';
import { MatIcon } from '@angular/material/icon';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '../button/button.component';
import saveAs from 'file-saver';
import { SearchContainerComponent } from '../search-container/search-container.component';

@Component({
  selector: 'app-global-filter',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    GlobalDropdownComponent,
    MatSliderComponent,
    MatIcon,
    ButtonComponent,
    SearchContainerComponent
  ],
  templateUrl: './global-filter.component.html',
  styleUrl: './global-filter.component.scss',
})
export class GlobalFilterComponent {
  @Input() config!: any;
  filters!: any[];
  options: any = {};
  filterForm: FormGroup = new FormGroup({});
  selectedKey: string = '';
  showResetButton = false;
  private defaultAppliedKeys = new Set<string>();
  private manualSelection: Set<string> = new Set();
  private autoPatchedKeys = new Set<string>();
  @ViewChildren(MatSliderComponent) sliders!: QueryList<MatSliderComponent>;
  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private globalFilterService: GlobalFilterService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    const { apiUrl } = this.config;
    this.filters = this.config?.content || [];
    this.showResetButton = this.filters.some(f => f.type !== 'search');
    const queryParams = this.route?.snapshot?.queryParams;

    this.filters.forEach((item: any) => {
      this.filterForm.addControl(item?.key, new FormControl(null));
    });

    //  Pre-fetch all static filters and apply defaults
    this.filters.forEach((filter, index) => {
      if (filter?.options === 'data' && filter?.apiUrl?.startsWith('assets/')) {
        this.http.get(filter?.apiUrl).subscribe((staticRes: any) => {
          const options = staticRes?.data || [];
          this.filters[index].optionsList = options;
          this.options[filter?.key] = options;

          const control = this.filterForm.get(filter?.key);
          const hasQueryParam = !!queryParams?.[filter?.key];
          const currentVal = control?.value;
          const isEmptyValue =
            currentVal === null ||
            (Array.isArray(currentVal) && currentVal.length === 0);

          const shouldApplyDefault =
            !hasQueryParam &&
            isEmptyValue &&
            options.length > 0 &&
            !this.defaultAppliedKeys.has(filter.key) &&
            filter?.isfirstOptionDefault;

          if (shouldApplyDefault) {
            const defaultValue = filter.isMultiSelect
              ? [options[0]]
              : options[0];
            control?.setValue(defaultValue, { emitEvent: false });
            this.defaultAppliedKeys.add(filter?.key);
          }
        });
      }
    });

    // Listen to valueChanges AFTER local dropdowns are pre-loaded
    let valueChange$ = this.filterForm.valueChanges.pipe(
      debounceTime(200), // avoid back-to-back calls
      distinctUntilChanged(
        (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)
      )
    );

    //  handling for customer_spec change on manual selection
    this.filterForm.get('customer_spec')?.valueChanges.subscribe((val) => {
      if (val !== null && val !== undefined && val !== '') {
        //  this.manualSelection.add('customer_spec');
        this.autoPatchedKeys.delete('customer_spec');
      }
    });
    //  handling for customer_name change on manual selection
    this.filterForm.get('customer_name')?.valueChanges.subscribe((val) => {
      if (val !== null && val !== undefined && val !== '') {
        this.autoPatchedKeys.delete('customer_name');
      }
    });

    // If no queryParams, auto-trigger with startWith
    if (!Object.keys(queryParams)?.length) {
      valueChange$ = this.filterForm.valueChanges.pipe(
        startWith(this.filterForm.value),
        debounceTime(200), // avoid back-to-back calls
      );
    }
    valueChange$
      .subscribe((val) => {
        const payload = {
          filter: {
            where: this.getWhereCondition(),
            join: {},
            orderBy: {},
          },
        };
        if (apiUrl) {
        this.configService
          .getDropdownOptions(apiUrl, payload)
          .subscribe((res) => {
            this.filters = this.filters.map((filter: any) => {
              if (!filter || !filter.key) {
                return filter;
              }
              if (res.hasOwnProperty(filter.key)) {
                const options = res[filter.key];

                const control = this.filterForm.get(filter.key);
                const hasQueryParam = !!queryParams?.[filter.key];
                const currentVal = control?.value;

                const isEmptyValue =
                  currentVal === null ||
                  (Array.isArray(currentVal) && currentVal?.length === 0);

                if (options?.length > 0 && !!filter?.isfirstOptionDefault) {
                  if (isEmptyValue || this.autoPatchedKeys.has(filter?.key)) {
                    const defaultValue = filter.isMultiSelect ? [options[0]] : options[0];
                    control?.setValue(defaultValue, { emitEvent: false });

                    this.globalFilterService.updateFilterSelection(
                      filter?.key,
                      defaultValue,
                      this.filters?.find((elm: any) => elm.key === filter?.key)?.isQueryParam || false
                    );
                    this.autoPatchedKeys.add(filter?.key);
                  }

              //  added logic for update patching value on select all 
               
                  if (filter?.key === 'customer_name') {
                 const selectedSpecs = this.filterForm.get('customer_spec')?.value || [];
                 const allSpecs = this.options['customer_spec'] || []; // all available specs

                 // If user selected more than one spec BUT not ALL specs
                 if (
                   Array.isArray(selectedSpecs) &&
                   selectedSpecs?.length > 0 && // more than one
                   selectedSpecs?.length < allSpecs.length // not ALL
                 ) {
                   const patchValue = [...options]; // select ALL available customer names
                   control?.setValue(patchValue, { emitEvent: false });

                   this.globalFilterService.updateFilterSelection(
                     filter.key,
                     patchValue,
                     filter?.isQueryParam || false
                   );

                   this.autoPatchedKeys.add(filter.key);
                 }
               }



                  if (options?.length && !this.autoPatchedKeys.has(filter?.key) && !!queryParams?.[filter?.key]) {
                    const defaultValue = filter?.isMultiSelect ? [options[0]] : options[0];
                    // control?.setValue(defaultValue, { emitEvent: false });

                    this.globalFilterService.updateFilterSelection(
                      filter.key,
                      currentVal,
                      this.filters.find((elm: any) => elm.key === filter.key)
                        ?.isQueryParam || false
                    );

                    this.autoPatchedKeys.add('customer_spec');
                  }
                }



                return {
                  ...filter,
                  optionsList: options,
                };
              }
              return filter;
            });
            if (!!res) {
              Object.entries(res)?.map(([key, value]) => {
                if (this.globalFilterService.activeFilter !== key) {
                  this.options[key] = value;
                }
              });
            }

            this.globalFilterService.dropdownOptions = this.options;

            // added logic to update the  customer name list as per customer spec selection 

            // const latestCustomerNames = this.globalFilterService.dropdownOptions['customer_name'] || [];
            // const currentCustomerNames = this.filterForm.get('customer_name')?.value || [];

            // const validSelection = Array.isArray(currentCustomerNames)
            //   ? currentCustomerNames.filter((name: string) =>
            //     latestCustomerNames.includes(name)
            //   )
            //   : latestCustomerNames.includes(currentCustomerNames)
            //     ? currentCustomerNames
            //     : null;

            // if (JSON.stringify(validSelection) !== JSON.stringify(currentCustomerNames)) {
            //   this.filterForm.get('customer_name')?.setValue(validSelection, { emitEvent: false });
            //   this.globalFilterService.updateFilterSelection(
            //     'customer_name',
            //     validSelection,
            //     this.filters?.find(elm => elm.key === 'customer_name')?.isQueryParam || false
            //   );

            // }
          });
        }
      });

    //  Handle query param
    const paramKeyToFormKeyMap: { [key: string]: string } = {
      customer_spec: 'customer_spec',
      customer_name: 'customer_name'
    };

    if (!!Object.keys(queryParams)?.length) {
      Object.keys(queryParams).forEach((paramKey) => {
        const formKey = paramKeyToFormKeyMap[paramKey];
        const rawValue = queryParams[paramKey];

        if (formKey && this.filterForm.contains(formKey)) {
          const isMultiSelect = this.config.content.find(
            (f: any) => f.key === formKey
          )?.isMultiSelect;

          const valueArray:any = Array.isArray(rawValue)
          ? rawValue.map((v: string) => decodeURIComponent(v))
          : isMultiSelect
            ? [decodeURIComponent(rawValue)]
            : decodeURIComponent(rawValue);

          const patchValue = valueArray;

          this.filterForm.patchValue(
            {
              [formKey]: patchValue,
            },
            { emitEvent: true }
          );
          // this.globalFilterService.activeFilter = formKey;
          this.globalFilterService.updateFilterSelection(
            formKey,
            patchValue,
            this.filters?.find((elm: any) => elm.key === formKey)?.isQueryParam ||
            false
          );
        }
      });
    } else {
      setTimeout(() => {
        this.globalFilterService.initialTrigger();
      }, 200);
    }
  }

  // helper function to check query params 
  private isQueryParamValue(key: string, value: any): boolean {
    const paramValue = this.route.snapshot.queryParamMap.get(key);
    return paramValue !== null && paramValue == value;
  }

  private getWhereCondition(): any[] {
    const currentPath = this.router.url.split('?')[0]; // Remove query params
    const dashboardName = currentPath.startsWith('/')
      ? currentPath.substring(1)
      : currentPath;

    const isInitialLoad = Object.values(this.filterForm.value).every(
      (v) => v === null
    );

    if (dashboardName === 'europe-impact-report' && isInitialLoad) {
      return [];
    }
    let staticFilters: any[] = [];
    const customerNameValue = this.filterForm.value['customer_name'];
    // Apply filters based on dashboard
    if (dashboardName === 'customer-overview') {
      // added condition to filter out default customername in payload if customer name is selected 
      if (!customerNameValue || (Array.isArray(customerNameValue) && customerNameValue?.length === 0)) {
        staticFilters = [
          {
            attributeName: 'customer_name',
            operator: '!=',
            attributeValues: ['NA'],
            logicalOperator: 'AND',
          },
        ];
      }
    }
    else if(dashboardName === 'cspec-sales-bridge'){
      if (!customerNameValue && (!Array.isArray(customerNameValue) || customerNameValue.length > 0)) {
        staticFilters = [

          {
            attributeName: 'customer_name',
            operator: '!=',
            attributeValues: ['NA'],
            logicalOperator: 'AND',
          },
        ];
      }}
       else if (dashboardName !== 'opportunity-overview' && dashboardName !== 'cspec-sales-bridge' &&  dashboardName !== 'europe-impact-report') {
      if (!customerNameValue || (Array.isArray(customerNameValue) && customerNameValue?.length === 0)) {
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

    // Dynamic form filters
    const dynamicFilters = this.config?.content
      .filter((elm: any) => {
        const val = this.filterForm.value[elm?.key];
        if ((elm?.key === 'customer_spec' || elm?.key === 'customer_name') && this.isQueryParamValue(elm?.key, val)) {
          return false; // skip in payload  only if the value came from query params and retains the full option list 
        }

        return (val !== null && val !== undefined && !elm?.isQueryParam && !this.autoPatchedKeys.has(elm?.key));
      })
      .map((elm: any) => {
        const rawVal = this.filterForm.value[elm.key];
        const values = Array.isArray(rawVal)
          ? rawVal.filter((v: any) => v !== null)
          : [rawVal];

        // Skip filters with empty values
        if (!values?.length || values.every((v) => v === null || v === '')) {
          return null;
        }

        return {
          attributeName: elm?.key,
          operator: values?.length > 1 ? 'IN' : '=',
          attributeValues: values,
          logicalOperator: 'AND',
        };
      })
      .filter(Boolean); // Remove nulls from the result

    // Handle logicalOperator chaining
    if (dynamicFilters.length > 0) {
      dynamicFilters[dynamicFilters.length - 1].logicalOperator = '';
      if (staticFilters.length > 0)
        staticFilters[staticFilters.length - 1].logicalOperator = 'AND';
    } else {
      if (staticFilters.length > 0)
        staticFilters[staticFilters.length - 1].logicalOperator = '';
    }

    return [...staticFilters, ...dynamicFilters];
  }

  resetButton() {
    this.filterForm.reset();
    this.selectedKey = '';
    this.autoPatchedKeys.clear();
    this.manualSelection.clear();
    // Reset GlobalFilterService state
    const defaultFilters = {
      queryParams: {},
      requestParams: {},
      widgetId: null
    };
    this.sliders.forEach(slider => slider.reset());
    // Notify subscribers (like charts and stat cards) of the reset
    this.globalFilterService.updateAllFilters(defaultFilters);

    //  API call again to refresh dropdowns list ui on reset
    const payload = {
      filter: {
        where: this.getWhereCondition(),
        join: {},
        orderBy: {},
      },
    };

    this.configService
      .getDropdownOptions(this.config.apiUrl, payload)
      .subscribe((res) => {
        this.filters = this.filters.map((filter: any) => {
          if (res.hasOwnProperty(filter.key)) {
            return {
              ...filter,
              optionsList: res[filter.key], //refresh UI dropdown list
            };
          }
          return filter;
        });
        this.options = { ...this.options, ...res };
        this.globalFilterService.dropdownOptions = this.options;
      });
  }

  onSearch(searchTerm: string, key: string): void {
    const valueToSet = searchTerm || '';
    this.filterForm.get(key)?.setValue(valueToSet, { emitEvent: false });
    this.globalFilterService.updateFilterSelection(key, [valueToSet], false);
  }

  onButtonSelectionChange(key: string) {
    this.selectedKey = key;
  }
  download(url: string) {
    const payload = {
      filter: {
        where: this.getWhereCondition(),
        join: {},
        orderBy: {},
      },
    };
    this.globalFilterService.downloadExcel(url, payload).subscribe({
      next: (blob: Blob) => {
        const currentPath = this.router.url.split('?')[0];
        const dashboardName = currentPath.startsWith('/')
          ? currentPath.substring(1)
          : currentPath;
        let fileName = 'download.xlsx';
        if (dashboardName === 'europe-impact-report') {
          fileName = 'Europe Impact Report.xlsx';
        } else if (dashboardName === 'customer-overview') {
          fileName = 'customerOverview.xlsx';
        }
        saveAs(blob, fileName);
      },
      error: (err) => {
        console.error('Download failed', err);
      }
    });
  }
}