import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigService } from '../../shared-services/config.service';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import { Subscription } from 'rxjs';
import { ConfirmationDialogService } from '../../shared-services/confirmation-dialog.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { SearchContainerComponent } from '../../global-components/search-container/search-container.component';

@Component({
  selector: 'app-dynamic-edit-table',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, SearchContainerComponent],
  templateUrl: './dynamic-edit-table.component.html',
  styleUrl: './dynamic-edit-table.component.scss'
})
export class DynamicEditTableComponent implements OnInit, OnDestroy {
  @Input() isChat: boolean = false;
  @Input() data: any;
  multipleTables: { tableData: any[]; columns: string[]; fileName?: string | null; isError?: boolean }[] = [];
  loading = true;
  showAddButton = false;
  shouldRender = false;
  currentFilters: any = {};
  fileName: string | null = null;
  isSubmitDisabled = true;
  isAddRecordDisabled = false;
  isTableLocked = false;

  private filterSub?: Subscription;

  get isEditable(): boolean {
    return this.data?.isEditable && !this.isTableLocked;
  }

  constructor(
    private configService: ConfigService,
    private globalFilterService: GlobalFilterService,
    private http: HttpClient,
    private dialogService: ConfirmationDialogService,
    private snackBar: MatSnackBar,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.filterSub = this.globalFilterService.filter$.subscribe((filters) => {
      const isReset = !filters.changedFilterKey &&
                      Object.keys(filters.queryParams).length === 0 &&
                      Object.keys(filters.requestParams).length === 0;

      if (isReset) {
        if ((this.data.dependsOnFilters && this.data.dependsOnFilters.length > 0) || this.data.searchable) {
            this.multipleTables = [];
        }
        return;
      }

      let shouldReload = false;
      if (this.data.searchable && filters.changedFilterKey === 'search') {
          shouldReload = true;
      } else if (this.data.dependsOnFilters?.includes(filters.changedFilterKey)) {
          shouldReload = true;
      }
  
      if (!shouldReload) return;

      this.currentFilters = filters;
      const params = { ...filters?.requestParams, ...filters?.queryParams };
      this.fileName = params.data_file || params.fileName || params.file || null;

      this.checkRenderCondition(filters);
      if (this.shouldRender) {
        this.loadAndRenderTable(filters);
        this.checkShowAddButton(filters);
      }
    });

    this.currentFilters = this.globalFilterService.getCurrentFilters();
    const currentParams = { ...this.currentFilters?.requestParams, ...this.currentFilters?.queryParams };
    this.fileName = currentParams.data_file ;
    this.checkRenderCondition(this.currentFilters);
    if (this.shouldRender) {
      this.loadAndRenderTable(this.currentFilters);
      this.checkShowAddButton(this.currentFilters);
    }
  }

  private checkRenderCondition(filters: any): void {
    const condition = this.data?.renderCondition;
    if (!condition) {
      this.shouldRender = true;
      return;
    }
    if (condition.filter && condition.is) {
      const requiredValues = Array.isArray(condition.is) ? condition.is : [condition.is];
      const filterKey = condition.filter;
      const valueFromFilters = filters?.queryParams?.[filterKey] || filters?.requestParams?.[filterKey];
      if (valueFromFilters === undefined) {
        this.shouldRender = requiredValues.includes('get_record');
        return;
      }
      const currentValues = Array.isArray(valueFromFilters) ? valueFromFilters : [valueFromFilters];
      this.shouldRender = currentValues.some(v => requiredValues.includes(v));
    } else {
      console.error("Malformed renderCondition:", this.data);
      this.shouldRender = true;
    }
  }

  private checkShowAddButton(filters: any): void {
    const condition = this.data?.addRowCondition;
    if (condition && condition.filter && condition.is) {
      const requiredValues = Array.isArray(condition.is) ? condition.is : [condition.is];
      const filterKey = condition.filter;
      const valueFromFilters = filters?.queryParams?.[filterKey] || filters?.requestParams?.[filterKey];
      const currentValues = Array.isArray(valueFromFilters) ? valueFromFilters : (valueFromFilters ? [valueFromFilters] : []);
      this.showAddButton = currentValues.some(v => requiredValues.includes(v));
    } else {
      this.showAddButton = false;
    }
  }

  addRow(tableIndex: number): void {
    if (this.multipleTables[tableIndex]) {
      const table = this.multipleTables[tableIndex];
      const emptyRow = table.columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {});
      const newTableData = [...table.tableData, emptyRow];
      this.multipleTables = [
        ...this.multipleTables.slice(0, tableIndex),
        { ...table, tableData: newTableData },
        ...this.multipleTables.slice(tableIndex + 1),
      ];
    }
  }

  private formatFileName(name: string | null): string {
    if (!name) return '';
    const lastDotIndex = name.lastIndexOf('.');
    const baseName = lastDotIndex > 0 ? name.substring(0, lastDotIndex) : name;
    return baseName.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }

  public isTableEditable(): boolean {
    return this.isEditable;
  }

  public getTableData(): any[] {
    return this.multipleTables.map(table => table.tableData);
  }

   private loadAndRenderTable(filters?: any): void {
    if (!this.data?.apiUrl) return;
    this.loading = true;

    const modifiedFilters: any = {
      ...filters,
      queryParams: { ...(filters?.queryParams || {}) },
      requestParams: { ...(filters?.requestParams || {}) },
    };
  
    if (this.data.searchable && modifiedFilters.requestParams?.search) {
        modifiedFilters.rawQueryString = modifiedFilters.requestParams.search[0];
        delete modifiedFilters.requestParams.search;
        modifiedFilters.queryParams = {}; 
    }

    this.configService.getApi(this.data.apiUrl, modifiedFilters, this.data, this.data?.method || 'post').subscribe({
      next: (res: any) => {
        const key = this.data?.key || 'data';
        const responseData = res?.[key] || res;
        const newTableCollection: any[] = [];

        const isMultiTableResponse = Array.isArray(responseData) && responseData.length > 0 && Array.isArray(responseData[0]);
        const tableDataSets = isMultiTableResponse ? responseData : [responseData];
        const fileNames = this.fileName ? (Array.isArray(this.fileName) ? this.fileName : [this.fileName]) : [];

        tableDataSets.forEach((apiTableData, index) => {
          const rawFileName = fileNames[index] || null;
          const formattedFileName = this.formatFileName(rawFileName);

          let columns: string[] = [];
          let initialTableData: any[] = [];
          let isError = false;

          const isErrorObjectInArray = Array.isArray(apiTableData) &&
                                     apiTableData.length === 1 &&
                                     typeof apiTableData[0] === 'object' &&
                                     apiTableData[0] !== null &&
                                     'error' in apiTableData[0];

          if (isErrorObjectInArray) {
            columns = ['Error'];
            initialTableData = [{ Error: apiTableData[0].error }];
            isError = true;
          } else if (Array.isArray(apiTableData)) {
            const isHeaderOnly = apiTableData.length > 0 && apiTableData.every(item => {
              if (typeof item !== 'object' || item === null) return false;
              const keys = Object.keys(item);
              return keys.length === 1 && (item[keys[0]] === '' || item[keys[0]] === null);
            });

            if (isHeaderOnly) {
              columns = apiTableData.map(item => Object.keys(item)[0]);
              const emptyRow = columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {});
              initialTableData = Array(1).fill(null).map(() => ({ ...emptyRow }));
            } else {
              initialTableData = apiTableData;
              if (initialTableData.length > 0 && typeof initialTableData[0] === 'object' && initialTableData[0] !== null) {
                columns = Object.keys(initialTableData[0]);
              }
            }
          }

          newTableCollection.push({
            columns,
            tableData: initialTableData,
            fileName: formattedFileName,
            isError: isError
          });
        });

        this.multipleTables = newTableCollection;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.multipleTables = [];
        const errorMessage = (err.error && typeof err.error === 'string')
              ? err.error
              : (err.error?.message || err.message || 'An unknown error occurred.');
        this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
        });
      }
    });
  }

  onCellEdit(row: any, columnKey: string, event: any): void {
    row[columnKey] = event.target.value;
  }

  isActionVisible(action: any): boolean {
    const condition = action.showOn;
    if (!condition || !condition.filter || !condition.is) return true;
    const requiredValues = Array.isArray(condition.is) ? condition.is : [condition.is];
    const filterKey = condition.filter;
    const valueFromFilters = this.currentFilters?.queryParams?.[filterKey] || this.currentFilters?.requestParams?.[filterKey];
    if (valueFromFilters === undefined) return false;
    const currentValues = Array.isArray(valueFromFilters) ? valueFromFilters : [valueFromFilters];
    return currentValues.some(v => requiredValues.includes(v));
  }

//   handleAction(action: any): void {
//     const performAction = () => {
//       let payload: any = {};
//       const options: any = {};

//       if (action.apiUrl) {
//         // Prepare payload and query params
//         if (action.label === 'Cancel' || action.label === 'Submit') {
//           const queryParams = this.currentFilters.queryParams;
//           if (queryParams) options.params = new HttpParams({ fromObject: queryParams });
//         } else {
//           payload = this.multipleTables;
//           const queryParams = this.currentFilters.queryParams;
//           if (queryParams) options.params = new HttpParams({ fromObject: queryParams });
//         }

//         options.responseType = 'text';

//         if (action.label === 'Submit') {
//           this.snackBar.open('Workflow submitted successfully, you can refresh the status to see its status', 'Close', {
//             duration: 10000,
//             horizontalPosition: 'right',
//             verticalPosition: 'bottom',
//             panelClass: ['success-snackbar']
//           });
//           this.multipleTables = [];
//           this.isSubmitDisabled = true;
//           this.isAddRecordDisabled = false;
//           this.isTableLocked = false;
          
//           // --- DIAGNOSTIC FOR NAVIGATION ---
//           this.router.navigate(['/get-status']).then(success => {
//             if (!success) {
//               this.snackBar.open('Error: Navigation to status page failed.', 'Close', {
//                 duration: 7000,
//                 horizontalPosition: 'right',
//                 verticalPosition: 'bottom',
//                 panelClass: ['error-snackbar']
//               });
//             }
//           });
//         }

//         this.http.post(action.apiUrl, payload, options).subscribe({
//           next: (res: any) => {
//             // Restore all custom snackbars
//             if (action.label === 'Add Record') {
//               const successMessage = (res && typeof res === 'string') ? res : (res?.message || 'Action successful!');
//               this.snackBar.open(successMessage, 'Close', {
//                 duration: 3000,
//                 horizontalPosition: 'right',
//                 verticalPosition: 'bottom',
//                 panelClass: ['success-snackbar']
//               });
//               this.isSubmitDisabled = false;
//               this.isAddRecordDisabled = true;
//               this.isTableLocked = true;
//             } else if (action.label === 'Cancel') {
//               this.multipleTables = [];
//               this.isSubmitDisabled = true;
//               this.isAddRecordDisabled = false;
//               this.isTableLocked = false;
//               this.globalFilterService.clearAllFilters();
//               this.snackBar.open('Action cancelled', 'Close', {
//                 duration: 3000,
//                 horizontalPosition: 'right',
//                 verticalPosition: 'bottom',
//                 panelClass: ['info-snackbar']
//               });
//             }
//           },
//           error: (err) => {
//             const errorMessage = (err.error && typeof err.error === 'string')
//               ? err.error
//               : (err.error?.message || err.message || 'An unknown error occurred.');
//             this.snackBar.open(errorMessage, 'Close', {
//               duration: 5000,
//               horizontalPosition: 'right',
//               verticalPosition: 'bottom',
//               panelClass: ['error-snackbar']
//             });
//           }
//         });
//       } else if (action.label === 'Cancel') {
//         this.multipleTables = [];
//         this.isSubmitDisabled = true;
//         this.isAddRecordDisabled = false;
//         this.isTableLocked = false;
//         this.globalFilterService.clearAllFilters();
//         this.snackBar.open('Action cancelled', 'Close', {
//           duration: 3000,
//           horizontalPosition: 'right',
//           verticalPosition: 'bottom',
//           panelClass: ['info-snackbar']
//         });
//       }
//     };

//     if (action.confirmation) {
//       this.dialogService.open(action.confirmation).subscribe(confirmed => {
//         if (confirmed) performAction();
//       });
//     } else {
//       performAction();
//     }
// }

handleAction(action: any): void {
  const performAction = () => {
    let payload: any = {};
    const options: any = {};

    if (action.apiUrl) {
      // Prepare payload and query params
      if (action.label === 'Cancel' || action.label === 'Submit') {
        const queryParams = this.currentFilters.queryParams;
        if (queryParams) options.params = new HttpParams({ fromObject: queryParams });
      } else {
        payload = this.multipleTables;
        const queryParams = this.currentFilters.queryParams;
        if (queryParams) options.params = new HttpParams({ fromObject: queryParams });
      }

      options.responseType = 'text';

      // Handle Submit immediately (pre-success flow)
      if (action.label === 'Submit') {
        // Show immediate success message before actual API result
        this.snackBar.open(
          'Workflow submitted successfully.',
          'Close',
          {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'bottom',
            panelClass: ['success-snackbar']
          }
        );

        // Reset local UI states
        this.multipleTables = [];
        this.isSubmitDisabled = true;
        this.isAddRecordDisabled = false;
        this.isTableLocked = false;

        // Redirect immediately
        this.router.navigate(['/get-status']);
      }

      // Always make the API call (Submit, Add Record, Cancel all supported)
      this.http.post(action.apiUrl, payload, options).subscribe({
        next: (res: any) => {
          if (action.label === 'Add Record') {
            const successMessage = (res && typeof res === 'string')
              ? res
              : (res?.message || 'Record added successfully!');
            this.snackBar.open(successMessage, 'Close', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'bottom',
              panelClass: ['success-snackbar']
            });
            this.isSubmitDisabled = false;
            this.isAddRecordDisabled = true;
            this.isTableLocked = true;
          } 
          else if (action.label === 'Cancel') {
            this.multipleTables = [];
            this.isSubmitDisabled = true;
            this.isAddRecordDisabled = false;
            this.isTableLocked = false;
            this.globalFilterService.clearAllFilters();
            this.snackBar.open('Action cancelled', 'Close', {
              duration: 3000,
              horizontalPosition: 'right',
              verticalPosition: 'bottom',
              panelClass: ['info-snackbar']
            });
          } 
          else if (action.label === 'Submit') {
            //  After API success, show second success snackbar
            const successMessage = (res && typeof res === 'string')
              ? res
              : (res?.message || 'Your workflow processed successfully, you can refresh the status to see its status.');
            this.snackBar.open(successMessage, 'Close', {
              duration: 5000,
              horizontalPosition: 'right',
              verticalPosition: 'bottom',
              panelClass: ['success-snackbar']
            });
          }
        },
        error: (err) => {
          const errorMessage = (err.error && typeof err.error === 'string')
            ? err.error
            : (err.error?.message || err.message || 'An unknown error occurred.');
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            horizontalPosition: 'right',
            verticalPosition: 'bottom',
            panelClass: ['error-snackbar']
          });
        }
      });
    } 
    else if (action.label === 'Cancel') {
      this.multipleTables = [];
      this.isSubmitDisabled = true;
      this.isAddRecordDisabled = false;
      this.isTableLocked = false;
      this.globalFilterService.clearAllFilters();
      this.snackBar.open('Action cancelled', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom',
        panelClass: ['info-snackbar']
      });
    } 
    else {
      this.snackBar.open(
        `Action '${action.label}' is missing the 'apiUrl' property.`,
        'Close',
        {
          duration: 7000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['error-snackbar']
        }
      );
    }
  };

  if (action.confirmation) {
    this.dialogService.open(action.confirmation).subscribe(confirmed => {
      if (confirmed) performAction();
    });
  } else {
    performAction();
  }
}


  refreshTable(): void {
    this.loadAndRenderTable(this.currentFilters);
  }

  showError(errorStack: string): void {
    this.dialogService.open({
      title: 'Error Stack',
      message: errorStack,
      showActions: false,
      isError: true
    });
  }

  ngOnDestroy(): void {
    this.filterSub?.unsubscribe();
  }
}