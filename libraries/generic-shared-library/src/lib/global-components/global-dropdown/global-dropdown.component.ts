import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  EventEmitter,
  forwardRef,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  FormsModule,
  NG_VALUE_ACCESSOR,
  NgSelectOption,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ConfigService } from '../../shared-services/config.service';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { map, startWith, Subject, takeUntil } from 'rxjs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckbox, MatCheckboxModule } from '@angular/material/checkbox';
import { MatPseudoCheckboxModule } from '@angular/material/core';
import {
  NgOptgroupTemplateDirective,
  NgOptionTemplateDirective,
  NgSelectComponent,
  NgSelectModule,
} from '@ng-select/ng-select';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-global-dropdown',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    NgxMatSelectSearchModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatPseudoCheckboxModule,
    NgSelectComponent,
    FormsModule,
    NgOptionTemplateDirective,
    NgSelectModule,
    MatIcon
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GlobalDropdownComponent),
      multi: true,
    },
  ],
  templateUrl: './global-dropdown.component.html',
  styleUrl: './global-dropdown.component.scss',
})
export class GlobalDropdownComponent
  implements ControlValueAccessor, OnChanges
{
  @Input() data: any;
  @Input() options: any[] = [];
  @Output() filterChanged = new EventEmitter<any>();
  private suppressSelectionChange = false;
  private destroy$ = new Subject<void>();

  selected: any[] = [];
  searchCtrl = new FormControl('');
  filteredOptions: any[] = [];

  selectedDropdownList: { [key: string]: any[] } = {};

  private onChangeFn: (value: any) => void = () => {};
  private onTouchedFn: () => void = () => {};

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private globalFilterService: GlobalFilterService
  ) {}


   ngOnInit(): void {
    this.searchCtrl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((searchText: string | null) => {
        const term = (searchText || '').toLowerCase();
        if (!term) {
          this.filteredOptions = [...this.options];
        } else {
          this.filteredOptions = this.options.filter((opt) =>
            opt.toLowerCase().includes(term)
          );
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!!this.data?.apiUrl) {
      this.configService
        .getConfig(this.data?.apiUrl, null, this.data?.method)
        .subscribe({
          next: (res) => {
            this.options = res?.data || [];
            this.filteredOptions = this.options;
            this.data.optionsList = this.options;
          },
          error: (err) => console.error(err),
        });
    } else {
      this.filteredOptions = this.options || [];
    }
  }

  get isAllSelected(): boolean {
    return (
      this.options?.length > 0 &&
      this.selected?.length === this.options.length
    );
  }

  isItemSelected(item: any): boolean {
    return this.selected?.includes(item);
  }

  toggleSelectAll(event: any): void {
    const isChecked = event?.target?.checked;

    // Prevent triggering onChange again
    this.suppressSelectionChange = true;
    // this.selected = isChecked ? [...this.filteredOptions] : [];
    this.selected = isChecked ? [...this.options] : [];

    // Emit manually once
    this.onChangeFn(this.selected);
    this.onTouchedFn();

    const valueToEmit = this.data?.isMultiSelect
      ? this.selected
      : [this.selected];

    if (this.data?.key) {
      this.globalFilterService.activeFilter = this.data.key;
      this.globalFilterService.updateFilterSelection(
        this.data.key,
        valueToEmit,
        this.data?.isQueryParam
      );
    }

    this.filterChanged.emit(valueToEmit);

    setTimeout(() => {
      this.suppressSelectionChange = false;
    }, 0);
  }

  onChange(event: any): void {
    if (this.suppressSelectionChange) return;
    this.onChangeFn(this.selected);
    this.onTouchedFn();

    const valueToEmit = this.data?.isMultiSelect
      ? this.selected
      : [this.selected];

    if (this.data?.key) {
      this.globalFilterService.activeFilter = this.data?.key;
      this.globalFilterService.updateFilterSelection(
        this.data?.key,
        valueToEmit,
        this.data?.isQueryParam
      );
    }

    this.filterChanged.emit(valueToEmit);
  }

  onItemClick(item: any): void {
    if (!this.data?.isMultiSelect) {
      if (this.selected === item) {
        // Unselect if same item clicked again
         this.selected = [];
        this.onChangeFn(this.selected);
        this.onTouchedFn();

        const valueToEmit = [this.selected];

        if (this.data?.key) {
          this.globalFilterService.activeFilter = this.data?.key;
          this.globalFilterService.updateFilterSelection(
            this.data.key,
            valueToEmit,
            this.data?.isQueryParam
          );
        }

        this.filterChanged.emit(valueToEmit);
      }
    }
  }

  removeSelected(item: any): void {
    this.selected = this.selected.filter((i) => i !== item);
    this.onChange(this.selected); // emit the change
  }

  onDropdownClose() {
  this.searchCtrl.setValue('', { emitEvent: true }); // clears input
}

  writeValue(value: any): void {
    // this.selected = value ?? (this.data?.isMultiSelect ? [] : '');
    this.selected = value || [];
  }

  registerOnChange(fn: any): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouchedFn = fn;
  }

  setDisabledState?(isDisabled: boolean): void {}
    ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
