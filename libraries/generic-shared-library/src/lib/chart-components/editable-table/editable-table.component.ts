import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../../shared-services/config.service';
import { debounceTime, Subject, switchMap, takeUntil } from 'rxjs';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import { formatDecimalWithCommas } from '../../utils/format.utils';

@Component({
  selector: 'app-editable-table',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './editable-table.component.html',
  styleUrl: './editable-table.component.scss'
})
export class EditableTableComponent {
  @Input() data!: any;
  years: any=[];

  @Input() set widgetId(val: string) {
    this._widgetId = val;
  }
  get widgetId(): string {
    return this._widgetId || this.data?.widgetId;
  }

  private _widgetId!: string;
  form: FormGroup;
  isLoading = false;
  lastAction: string | null = null; // Track last action
  successMessage: string | null = null;
  errorMessage: string | null = null;
  // isValidationSuccessful = false;
  areActionsDisabled = false;
  baseYear = 2025;
  yearRange: number[] = [2026, 2027, 2028, 2029, 2030];
  inputsVisible = false;
  editedPercentage: { [barKey: string]: number } = {};
  editedNotes: { [noteKey: string]: string } = {};
  private unSubscribe$ = new Subject<void>();
  public formatDecimalWithCommas = formatDecimalWithCommas;
  private currentFilters: any = {};
  private lastEditedYear: string | null = null;
  private originalPercentages: { [key: string]: number } = {};
  private editedYears = new Set<string>(); // keeps track of edited years in opportunity  

  constructor(
    private fb: FormBuilder,
    private configService: ConfigService,
    private globalFilterService: GlobalFilterService
  ) {
    this.form = this.fb.group({});
  }

  ngOnInit(): void {
    this.initForm();
    this.globalFilterService.filter$
      .pipe(takeUntil(this.unSubscribe$),
      switchMap((filters) => {
        this.currentFilters = filters;
        const isSelfUpdate = filters?.widgetId === this.widgetId;
        const isSliderFilter = filters?.queryParams?.slider_range;
        if (isSelfUpdate && !isSliderFilter) {
          return;
        }
       return this.fetchData(filters);
          
      })
    )

      .subscribe({
        next: (res: any) => {
          this.updateFormWithApiResponse(res);
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = 'Failed to fetch data.';
          setTimeout(() => this.clearMessages(), 3000);
        },
      });
  }


  initForm(): void {
    if (this.data?.fields) {
      for (const field of this.data.fields) {
        this.form.addControl(field.key, new FormControl(field.default || ''));
      }
    }
  }

  fetchData(filters: any): any {
    this.isLoading = true;
    this.clearMessages();
    const sliderRange = filters?.queryParams?.['slider_range'];
    if (Array.isArray(sliderRange) && sliderRange.length === 2) {
      const startOffset = sliderRange[0];
      const endOffset = sliderRange[1];
      this.generateYearRange(startOffset, endOffset);
      this.inputsVisible = true;
      if (endOffset === 1) {
        this.areActionsDisabled = true;
      } else {
        this.areActionsDisabled = false;
      }
    } else {
      this.inputsVisible = false;
      this.areActionsDisabled = false;
    }

    // Strip widgetId from queryParams but keep the rest
    const { widgetId, ...queryParamsWithoutWidget } = filters?.queryParams || {};
    const finalPayload = {
      ...filters,
      queryParams: queryParamsWithoutWidget,
      useQueryParams: this.data?.useQueryParams || false,
    };
    return this.configService.getConfig(this.data.submitApiUrl, finalPayload)
      .pipe(takeUntil(this.unSubscribe$))
  }

  private updateFormWithApiResponse(res: any) {
    const percentage = res?.totalOpportunity?.percentage || [];
    const priceList = res?.totalOpportunity?.priceList || [];
    const notesList = res?.totalOpportunity?.notesList || [];
    const editable = res?.totalOpportunity?.editable || [];
    this.years=res?.totalOpportunity?.years;
    this.yearRange.forEach((year, index) => {
      const opportunityKey = `opportunity_${year}`;
      const salesKey = `sales_${year}`;
      const notesKey = `notes_${year}`;

      if (!this.form.contains(opportunityKey)) {
        this.form.addControl(opportunityKey, new FormControl(''));
      }
      if (!this.form.contains(salesKey)) {
        this.form.addControl(salesKey, new FormControl({ value: '', disabled: true }));
      }
      if (!this.form.contains(notesKey)) {
        this.form.addControl(notesKey, new FormControl(''));
      }
      const rawValue = percentage[year - this.baseYear];

      if (rawValue !== null && rawValue !== undefined && !isNaN(rawValue)) {
        this.originalPercentages[opportunityKey] = rawValue;
      }

      const formattedValue =
        rawValue !== null && rawValue !== undefined && !isNaN(rawValue)
          ? parseFloat(parseFloat(rawValue).toFixed(1)) // parsed years  opportunity input to  number, not string
          : null;

      const editedKey = String(year - this.baseYear);

      // set the newly edited year value in input 
      if (!this.editedYears.has(editedKey)) {
        this.form.get(opportunityKey)?.setValue(formattedValue, { emitEvent: false });
      }
      this.form.get(salesKey)?.setValue(priceList[year - this.baseYear] ?? '');
      this.form.get(notesKey)?.setValue(notesList[year - this.baseYear] ?? '');
      
      const isEditable = editable[year - this.baseYear] !== false;

      this.form.get(notesKey)?.enable();
      if (isEditable) {
        this.form.get(opportunityKey)?.enable();
      } else {
        this.form.get(opportunityKey)?.disable();
      }
    });
  }

  getControl(name: string): FormControl {
    return this.form.get(name) as FormControl;
  }

  generateYearRange(startOffset: number, endOffset: number) {
    this.yearRange = [];

    for (let i = startOffset + 1; i <= endOffset; i++) {
      const year = this.baseYear + i;
      this.yearRange.push(year);
    }
  }

  onOpportunityChange(year: number): void {
    // this.isValidationSuccessful = false;

    const opportunityControlName = `opportunity_${year}`;
    const opportunityValue = this.form.get(opportunityControlName)?.value;

    // console.log(`[onOpportunityChange] Opportunity Value for ${year}:`, opportunityValue);

    if (opportunityValue === '' || opportunityValue === null || isNaN(opportunityValue)) {
      // console.warn(`[onOpportunityChange] Invalid opportunity value, skipping API call.`);
      return;
    }

    // Add just the changed opportunity%
    const barKey = `bar${year - this.baseYear}`;
    const editedKey = `${year - this.baseYear}`;
    this.editedYears.add(editedKey);
    this.lastEditedYear = editedKey;
    this.editedPercentage[barKey] = opportunityValue;

    // Rebuild editedNotes with all non-empty notes from the form
    this.editedNotes = {}; // Clear previous state to avoid stale data
    this.yearRange.forEach((yr) => {
      const noteControl = this.form.get(`notes_${yr}`);
      const noteValue = noteControl?.value;
      const noteKey = `note${yr - this.baseYear}`;
      if (noteValue && noteValue.trim() !== '') {
        this.editedNotes[noteKey] = noteValue;
      }
    });

    const cleanQueryParams = { ...this.currentFilters.queryParams };
    delete cleanQueryParams.barValues;
    delete cleanQueryParams.widgetId;

    const queryParams = {
      ...cleanQueryParams,
      editedYear: editedKey,
      ...this.editedPercentage,
      ...this.editedNotes
    };

    this.configService
      .getConfig(this.data.apiUrl, {
        ...this.currentFilters,
        queryParams,
        useQueryParams: true,
      })
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe({
        next: (res: any) => {
          this.editedYears.clear();
          this.updateFormWithApiResponse(res);
        },
        error: (_err: any) => {
        },
      });
  }


  onOpportunityEnter(year: number, event: Event) {
    this.onOpportunityChange(year);
    (event.target as HTMLElement).blur();
  }

  onEnter(year: number, event: Event) {

    (event.target as HTMLElement).blur();
  }
  handleAction(actionKey: string) {
    switch (actionKey) {
      case 'recalculate':
        this.onRecalculate();
        break;
      case 'submit':
        this.onSubmit();
        break;
      case 'cancel':
        this.onCancel();
        break;
      case 'reset':
        this.onReset();
      break;
      case 'ComparisonView':
      case 'FilteredView':
        this.globalFilterService.updateFilterSelection('viewType', [actionKey], true);
        break;
    }
  }

  onSubmit() {
    this.lastAction = 'submit';
    this.clearMessages();
    this.isLoading = true;
    const newBarValues: any = {};
    this.yearRange.forEach((year) => {
      const controlName = `opportunity_${year}`;
      const value = this.form.get(controlName)?.value;
      if (value !== '' && value !== null && !isNaN(value)) {
        const barKey = `bar${year - this.baseYear}`;
        newBarValues[barKey] = this.originalPercentages[controlName] ?? value;
        //  newBarValues[barKey] = value;  
      }

      const notesControlName = `notes_${year}`;
      const notesValue = this.form.get(notesControlName)?.value;
      if (notesValue !== '' && notesValue !== null) {
        const noteKey = `note${year - this.baseYear}`;
        newBarValues[noteKey] = notesValue;
      }
    });

    const cleanQueryParams = { ...this.currentFilters.queryParams };
    delete cleanQueryParams.barValues;
    delete cleanQueryParams.widgetId;
    const queryParams = { ...cleanQueryParams, ...newBarValues };

    this.configService
      .getConfig(this.data.submitApiUrl, {
        ...this.currentFilters,
        queryParams,
        useQueryParams: true,
      })
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe({
        next: (res: any) => {
          this.editedYears.clear();
          this.updateFormWithApiResponse(res);
          this.globalFilterService.updateFilterSelection('widgetId', [this.widgetId], true);
          this.editedPercentage = {};
          this.isLoading = false;
          this.successMessage = 'Submit successful!';
          // this.isValidationSuccessful = false;
          setTimeout(() => this.clearMessages(), 5000);
        },
        error: (_err: any) => {
          this.isLoading = false;
          this.errorMessage = 'Submit failed. Please try again.';
          setTimeout(() => this.clearMessages(), 5000);
        },
      });
  }

  onCancel() {
    this.lastAction = null; 
    this.editedPercentage = {};
    this.lastEditedYear = null;
    // this.isValidationSuccessful = false;
    this.fetchData(this.currentFilters).subscribe({
      next: (res: any) => {
        this.updateFormWithApiResponse(res);
        this.isLoading = false;
      },
      error: (err:any) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to fetch data.';
        setTimeout(() => this.clearMessages(), 3000);
      },
    });

    this.editedYears.clear();

  }

  onReset() {
    this.lastAction = 'reset';
    this.editedPercentage = {};
    this.lastEditedYear = null;
    // this.isValidationSuccessful = false;

  // Clone current filters
  const resetFilters = { ...this.currentFilters };

  //  Add query param: reset=reset
  resetFilters.queryParams = {
    ...(resetFilters.queryParams || {}),
      reset: 'reset'
    };

  //Add full list for each field in sendAllOptionsField
  if (this.data?.sendAllOptionsField?.length) {
    this.data.sendAllOptionsField.forEach((fieldKey: string) => {
      if (this.globalFilterService.dropdownOptions?.[fieldKey]) {
        resetFilters.requestParams = {
          ...(resetFilters.requestParams || {}),
          [fieldKey]: this.globalFilterService.dropdownOptions[fieldKey]
        };
      }
    });
  }

  // added logic to reset the chart values on reset click 
  this.isLoading = true;

  this.configService
    .getConfig(this.data.submitApiUrl, {
      ...resetFilters,
      useQueryParams: true,
    })
    .pipe(takeUntil(this.unSubscribe$))
    .subscribe({
      next: (res: any) => {
        this.updateFormWithApiResponse(res);

        //  refresh chart
        this.globalFilterService.updateFilterSelection(
          'widgetId',
          [this.widgetId],
          true
        );

        this.isLoading = false;
        this.successMessage = 'Reset successful!';
        setTimeout(() => this.clearMessages(), 5000);
      },
      error: (_err: any) => {
        this.isLoading = false;
        this.errorMessage = 'Reset failed. Please try again.';
        setTimeout(() => this.clearMessages(), 5000);
      },
    });
  this.fetchData(resetFilters);
   this.editedYears.clear();
}




  onRecalculate() {
    this.lastAction = 'recalculate';
    this.clearMessages();
    this.isLoading = true;

    const newBarValues: any = {};

    this.yearRange.forEach((year) => {
      const opportunityControlName = `opportunity_${year}`;
      const opportunityValue = this.form.get(opportunityControlName)?.value;

      if (opportunityValue !== '' && opportunityValue !== null && !isNaN(opportunityValue)) {
        const barKey = `bar${year - this.baseYear}`;
        newBarValues[barKey] = opportunityValue;
      }


      const notesControlName = `notes_${year}`;
      const notesValue = this.form.get(notesControlName)?.value;
      if (notesValue !== '' && notesValue !== null) {
        const noteKey = `note${year - this.baseYear}`;
        newBarValues[noteKey] = notesValue;
      }
    });

    const cleanQueryParams = { ...this.currentFilters.queryParams };
    delete cleanQueryParams.barValues;
    delete cleanQueryParams.widgetId; // Optional: remove if widgetId isn't needed

    const queryParams: any = { ...cleanQueryParams, ...newBarValues };
    if (this.lastEditedYear) {
      queryParams.editedYear = this.lastEditedYear;
    }

    this.configService
      .getConfig(this.data.apiUrl, {
        ...this.currentFilters,
        queryParams,
        useQueryParams: true,
      })
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe({
        next: (res: any) => {
          this.updateFormWithApiResponse(res);
          this.isLoading = false;

          const validationError = res?.totalOpportunity?.validationError;

          if (validationError) {
            this.errorMessage = 'Validation failed. Please try again.';
            // this.isValidationSuccessful = false;
          } else {
            this.successMessage = 'Validation successful!';
            // this.isValidationSuccessful = true;
          }

          setTimeout(() => this.clearMessages(), 5000);
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Validation failed. Please try again.';
          // this.isValidationSuccessful = false;
          setTimeout(() => this.clearMessages(), 5000);
        },
      });
  }

  clearMessages() {
    this.successMessage = null;
    this.errorMessage = null;
  }

  ngOnDestroy(): void {
    this.unSubscribe$.next();
    this.unSubscribe$.complete();
  }
}
