import { AfterViewInit, Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { ConfigService } from '../../shared-services/config.service';
import { CommonModule } from '@angular/common';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import { takeUntil } from 'rxjs/internal/operators/takeUntil';
import { debounceTime, Subject, switchMap, tap } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaginatorComponent } from '../paginator/paginator.component';
import { PageEvent } from '@angular/material/paginator';
import { CustomPayloadService } from '../../../../../my-app/src/app/shared/dashboard-payload-services/custom-payload.service';

@Component({
  selector: 'app-table',
  imports: [
    MatTableModule,
    CommonModule,
    MatProgressSpinnerModule,
    PaginatorComponent,
  ],
  standalone: true,
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
})
export class TableComponent implements AfterViewInit {
  @Input() data!: any;
  displayedColumns: string[] = [];
  filter: any;
  isLoading = true;
  columnLabels: { [key: string]: string } = {};
  dataSource: any[] = [];
  private unSubscribe$: Subject<void> = new Subject();
  @Input() set widgetId(val: string) {
    this._widgetId = val;
  }
  get widgetId(): string {
    return this._widgetId || this.data?.widgetId;
  }
  private _widgetId!: string;
  pagedData: any[] = [];
  private originalDataSource: any[] = [];
  activeLegend: string | null = null;

  private pageSize: number = 11;
  private pageIndex: number = 0;

  @ViewChild('paginatorComp') paginatorComp!: PaginatorComponent;

  constructor(
    private configService: CustomPayloadService,
    private globalFilterService: GlobalFilterService
  ) {}

  ngAfterViewInit(): void {
    //  this.loadAndRenderChart();
    this.globalFilterService.filter$
      .pipe(takeUntil(this.unSubscribe$),
      debounceTime(2000), // added debounce 
        tap(() => {
          this.isLoading = true; // Start loader
        }),
        switchMap((filters) => this.loadAndRenderChart(filters))
      )
      .subscribe({
        next: (res: any) => {
          let tableData = res?.options || [];
          this.isLoading = false;
          // Compute difference if not already present
          tableData = tableData.map((row: any) => ({
            ...row,
            difference: Number((row.proposed_option_price - row.current_option_price).toFixed(3)),
          }));

          // Sort by difference in descending order
          tableData.sort((a: any, b: any) => b.difference - a.difference);
          this.originalDataSource = tableData;
          this.dataSource = [...this.originalDataSource];
          if (!!this.data?.isPagination) {
            this.setPagedData();
          }

          this.displayedColumns =
            this.data?.headerColumns?.map((col: any) => col.key) || [];
          this.columnLabels = Object.fromEntries(
            this.data?.headerColumns?.map((col: any) => [col.key, col.label]) ||
              []
          );

          // Initialize pagination
          // this.pageIndex = 0;
          // this.setPagedData();
          setTimeout(() => {
               this.paginatorComp?.updatePagination(
              this.dataSource.length,
              this.pageIndex
            );
          }, 200);
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error loading table data', err);
        },
      });
  }

  private loadAndRenderChart(filters?: any): any {
    return this.configService
      .getConfig(this.data.apiUrl, filters, 'post', true)
      .pipe(takeUntil(this.unSubscribe$));
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event?.pageSize;
    this.pageIndex = event?.pageIndex;
    this.setPagedData();
  }

  private setPagedData() {
    const startIndex = (this.pageIndex || 0) * (this.pageSize || 10);
    const endIndex = startIndex + (this.pageSize || 10);
    this.pagedData = this.dataSource.slice(startIndex, endIndex);
  }

  filterByLegend(legendType: string | null): void {
  console.log('Clicked legendType:', legendType);
  console.log('Active legend before click:', this.activeLegend);

  if (this.activeLegend === legendType) {
    console.log('Same legend clicked again. Resetting filter.');
    this.activeLegend = null;
    this.dataSource = [...this.originalDataSource];
  } else {
    this.activeLegend = legendType;
    if (legendType) {
      console.log('Filtering data for legendType:', legendType);
      const filteredData = this.originalDataSource.filter(
  (row) =>
    (row.option_impact_drivers || '').trim().toLowerCase() ===
    (legendType || '').trim().toLowerCase()
);

      console.log('Filtered data:', filteredData);
      this.dataSource = filteredData;
    } else {
      console.log('LegendType is null, resetting dataSource to original.');
      this.dataSource = [...this.originalDataSource];
    }
  }

  console.log('DataSource after filtering:', this.dataSource);
  this.pageIndex = 0;
  this.setPagedData();
  this.paginatorComp?.updatePagination(this.dataSource.length, this.pageIndex);
}


  ngOnDestroy(): void {
    this.unSubscribe$.next();
    this.unSubscribe$.complete();
  }
}
