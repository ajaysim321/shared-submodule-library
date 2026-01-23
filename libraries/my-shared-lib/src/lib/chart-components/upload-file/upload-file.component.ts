import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import { ConfirmationDialogService } from '../../shared-services/confirmation-dialog.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  selector: 'app-upload-file',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule],
  templateUrl: './upload-file.component.html',
  styleUrl: './upload-file.component.scss',
})
export class UploadFileComponent implements OnInit, OnDestroy {
  @Input() data: any;
  @Input() title: string = 'Upload Files';
  @Input() multiple: boolean = true;
  @Input() accept: string = '*/*';
  @Output() filesSelected = new EventEmitter<File[]>();

  shouldRender = false;
  files: File[] = [];
  isDragging = false;
  currentFilters: any = {};
  isSubmitting = false;

  isSubmitDisabled = true;
  isUploadSuccessful = false;
  uploadedFileNames: string[] = [];
  isUploadDisabled = false;

  private filterSub?: Subscription;

  constructor(private globalFilterService: GlobalFilterService, private http: HttpClient, private dialogService: ConfirmationDialogService, private snackBar: MatSnackBar, private router: Router) { }

  ngOnInit(): void {
    this.filterSub = this.globalFilterService.filter$.subscribe(filters => {
      this.currentFilters = filters;
      this.checkRenderCondition(filters);
    });
    this.currentFilters = this.globalFilterService.getCurrentFilters();
    this.checkRenderCondition(this.currentFilters);
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
        this.shouldRender = false;
        return;
      }
      const currentValues = Array.isArray(valueFromFilters) ? valueFromFilters : [valueFromFilters];
      this.shouldRender = currentValues.some(v => requiredValues.includes(v));
    } else {
      console.error("Malformed renderCondition:", this.data);
      this.shouldRender = true;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  removeFile(index: number): void {
    this.files.splice(index, 1);
    this.filesSelected.emit(this.files);
  }

  private addFiles(newFiles: File[]): void {
    if (!this.multiple) {
      this.files = [newFiles[0]];
    } else {
      this.files = [...this.files, ...newFiles];
    }
    this.filesSelected.emit(this.files);
  }

  isActionVisible(action: any): boolean {
    const condition = action.showOn;
    if (!condition || !condition.filter || !condition.is) {
      return true;
    }
    const requiredValues = Array.isArray(condition.is) ? condition.is : [condition.is];
    const filterKey = condition.filter;
    const valueFromFilters = this.currentFilters?.queryParams?.[filterKey] || this.currentFilters?.requestParams?.[filterKey];
    if (valueFromFilters === undefined) {
      return false;
    }
    const currentValues = Array.isArray(valueFromFilters) ? valueFromFilters : [valueFromFilters];
    return currentValues.some(v => requiredValues.includes(v));
  }

 

 handleAction(action: any): void {
  const performAction = () => {
    if (!action.apiUrl) return;

    // ---- Common request options ----
    const options: any = {
      responseType: 'text',
      params: new HttpParams({ fromObject: this.currentFilters.queryParams || {} })
    };

    // ---- Payload only for Upload ----
    let payload: any = null;
    if (action.label === 'Upload') {
      if (this.files.length === 0) {
        this.snackBar.open('Please select at least one file to upload.', 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'bottom',
          panelClass: ['info-snackbar']
        });
        return;
      }
      payload = new FormData();
      this.files.forEach(file => (payload as FormData).append('files', file, file.name));
    }

    // ---- Submit-specific UI updates (before API call) ----
    if (action.label === 'Submit') {
      this.snackBar.open('Workflow submitted.', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom',
        panelClass: ['success-snackbar']
      });
      this.router.navigate(['/get-status']);
      this.isUploadSuccessful = false;
      this.isSubmitDisabled = true;
      this.uploadedFileNames = [];
      this.isSubmitting = true;
      this.isUploadDisabled = false;
    }

    console.log(`Performing action: ${action.label}, sending data to ${action.apiUrl}`, payload);

    this.http.post(action.apiUrl, payload, options).pipe(
      finalize(() => { this.isSubmitting = false; })
    ).subscribe({
      next: (res: any) => {
        console.log(`${action.label} successful`, res);

        if (action.label === 'Upload') {
          this.isUploadSuccessful = true;
          this.isSubmitDisabled = false;
          this.uploadedFileNames = this.files.map(f => f.name);
          this.files = [];
          this.snackBar.open('File uploaded successfully.', 'Close', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'bottom',
            panelClass: ['success-snackbar']
          });
          this.isUploadDisabled = true;
        }

        if (action.label === 'Cancel') {
          this.files = [];
          this.isUploadSuccessful = false;
          this.isSubmitDisabled = true;
          this.uploadedFileNames = [];
          this.isUploadDisabled = false;
          const successMessage = (res && typeof res === 'string')
            ? res
            : (res?.message || 'Action successful!');
          this.snackBar.open(successMessage, 'Close', {
            duration: 3000,
            horizontalPosition: 'right',
            verticalPosition: 'bottom',
            panelClass: ['success-snackbar']
          });
        }

        // After Submit API success — show second success message
        if (action.label === 'Submit') {
          this.snackBar.open(
            'Workflow processed successfully. You can refresh the status to see its current state.',
            'Close',
            {
              duration: 4000,
              horizontalPosition: 'right',
              verticalPosition: 'bottom',
              panelClass: ['success-snackbar']
            }
          );
        }
      },
      error: (err) => {
        console.error(`${action.label} failed`, err);
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
  };

  // ---- Optional confirmation dialog ----
  if (action.confirmation) {
    this.dialogService.open(action.confirmation).subscribe(confirmed => {
      if (confirmed) performAction();
    });
  } else {
    performAction();
  }
}


  ngOnDestroy(): void {
    this.filterSub?.unsubscribe();
  }
}

