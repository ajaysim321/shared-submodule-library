import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ConfigService } from '../../shared-services/config.service';
import { MatMenuModule } from '@angular/material/menu';
import { debounceTime, EMPTY, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'lib-drill-down',
  imports: [
    NgxDatatableModule,
    CommonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './drill-down.component.html',
  styleUrl: './drill-down.component.scss',
})
export class DrillDownComponent implements AfterViewInit, OnDestroy {
  @Input() data!: any;
  grandTotalRow: any;
  filter: any;
  previouSelection = '';
  @Input() set widgetId(val: string) {
    this._widgetId = val;
  }
  get widgetId(): string {
    return this._widgetId || this.data?.widgetId;
  }
  private _widgetId!: string;

  flattenedRows: any[] = [];
  visibleColumns: any[] = [];
  totalColumnWidth = 0;
  rawData: any;
  showTotalLevels: number[] = [];
  private filterSub!: Subscription;

  @ViewChild('treeCell', { static: true }) treeCell!: TemplateRef<any>;
  @ViewChild('percentageCell', { static: true })
  percentageCell!: TemplateRef<any>;
  @ViewChild('numberCell', { static: true }) numberCell!: TemplateRef<any>;
  @ViewChild('infoIconHeader', { static: true }) infoIconHeader!: TemplateRef<any>;

  selectedCell: any;
  isLoading = true;
  highlightedCells: any = []
  customerSpec: any = [];
  customerNameKeys: Set<string> = new Set();
  engineModelKeys: Set<string> = new Set();
  customerSpecKeys: Set<string> = new Set();
  private unSubscribe$: Subject<void> = new Subject();
  constructor(
    private configService: ConfigService,
    private globalFilterService: GlobalFilterService
  ) {

  }

@ViewChild('table', { static: true }) table: any;
@ViewChild('totalRow', { static: true }) totalRow!: ElementRef<HTMLDivElement>;
  ngAfterViewInit(): void {
    this.table.recalculate();
     setTimeout(() => {
    const body = this.table.element.querySelector('.datatable-body');
    if (body && this.totalRow) {
      body.addEventListener('scroll', () => {
        this.totalRow.nativeElement.scrollLeft = body.scrollLeft;
      });
    }
  }, 500);
    this.globalFilterService.filter$
      .pipe(takeUntil(this.unSubscribe$),
        switchMap((filters) => {
          this.filter = filters;

          // reset the drilldown on reset button click
          if (!filters || Object.keys(filters).length === 0) {
            if (!this.data.filterListner || this.data.filterListner.length === 0) {
              this.isLoading = true;
              return this.loadAndRenderChart(filters);
            }
            //  Reset handling
            this.customerNameKeys.clear();
            this.engineModelKeys.clear();
            this.customerSpecKeys.clear();
            this.highlightedCells = [];
            this.customerSpec = [];

            if (this.rawData) {
              this.rawData.forEach((node: any) => (node.expanded = false));
              this.flattenTree(this.rawData);
              this.updateVisibleColumns();
            }

            return EMPTY;
          }

          if (filters?.widgetId === this.widgetId) {
            return EMPTY;
          }
          this.isLoading = true;
          return this.loadAndRenderChart(filters);
        })

      )

      .subscribe({
        next: (res: any) => {
          this.rawData = res?.Data;
          this.showTotalLevels = this.getShowTotalLevels();
          this.grandTotalRow = res?.Total ? this.setTotal(res.Total, 0) : undefined;
          this.flattenTree(this.rawData);
          this.updateVisibleColumns();
          this.isLoading = false;
        },
        error: () => { },
      });
  }

  private loadAndRenderChart(filters?: any): any {
    this.highlightedCells = [];
    this.customerSpec = [];
    this.customerNameKeys.clear();
    this.engineModelKeys.clear();
    this.customerSpecKeys.clear();
    return this.configService.getConfig(this.data.apiUrl, {
      ...this.filter,
      useQueryParams: this.data?.useQueryParams || false,
    })
      .pipe(takeUntil(this.unSubscribe$))
  }
  toggleExpand(row: any): void {
    row.expanded = !row.expanded;
    this.flattenTree(this.rawData);
    this.updateVisibleColumns();
    this.updateHighlightedCells();
  }

  flattenTree(data: any[]): void {
    const result: any[] = [];
    const traverse = (nodes: any[], parent: any = null): void => {
      for (const node of nodes) {
        node.parent = parent;
        result.push(node);

        if (node.expanded && node.children) {
          traverse(node.children, node);

          const level = node.children[0]?.level;
          if (this.showTotalLevels.includes(level)) {
            const totalRow = this.setTotal(node, level);
            result.push(totalRow);
          }
        }
      }
    };
    traverse(data);
    this.flattenedRows = result;
  }
  onSort(event: any): void {
    const sortProp = event.sorts[0].prop;
    const dir = event.sorts[0].dir; // 'asc' or 'desc'
    this.sortTree(this.rawData, sortProp, dir);
    this.flattenTree(this.rawData);
  }
  sortTree(data: any[], prop: string, dir: 'asc' | 'desc'): void {
    data.sort((a, b) => {
      const valA = a[prop];
      const valB = b[prop];

      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'string') {
        return dir === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return dir === 'asc' ? valA - valB : valB - valA;
    });

    for (const item of data) {
      if (item.children) {
        this.sortTree(item.children, prop, dir);
      }
    }
  }

  updateVisibleColumns(): void {
    const expandedLevels = new Set<number>();
    this.flattenedRows.forEach((row) => {
      if (row.expanded) {
        expandedLevels.add(row.level);
      }
    });

    this.visibleColumns = this.data.headers
      .map((header: any, index: number) => {
        if (header.expandabile && index > 0 && !expandedLevels.has(index)) {
          return null;
        }

        const column: any = {
          name: header.name,
          prop: header.prop,
          width: header.width || undefined,
          type: header.type || undefined,
          infoIcon: header.infoIcon || false,
          infoText: header.infoText || '',
          alignment: header.alignment || 'start',
          frozenLeft:header.frozenLeft || false
        };

        if (header.alignment) {
          const alignmentClass = `text-${header.alignment}`;
          column.headerClass = alignmentClass;
          column.cellClass = alignmentClass;
        }

        column.headerTemplate = this.infoIconHeader;

        if (header.expandabile) {
          column.cellTemplate = this.treeCell;
          column.levelIndex = index;
        }

        if (header.type === 'percentage') {
          column.cellTemplate = this.percentageCell;
        } else if (header.type === 'number') {
          column.cellTemplate = this.numberCell;
        }

        return column;
      })
      .filter(Boolean);

    this.totalColumnWidth = this.visibleColumns.reduce((sum, col) => sum + (col.width || 0), 0);
  }

  setTotal(total: any, level: number): any {
    const totalRow: any = {
      name: 'Total',
      level,
      isTotal: true,
    };

    const numericHeaders = this.data.headers.filter(
      (h: any) => !h.expandabile && !h.showTotal
    );

    numericHeaders.forEach((h: any) => {
      const prop = h.prop;
      const value = total?.[prop];

      if (value != null && !isNaN(value)) {
        if (h.type === 'number') {
          totalRow[prop] = value.toFixed();
        } else if (h.type === 'percentage') {
          totalRow[prop] = value.toFixed(1);
        } else {
          totalRow[prop] = value;
        }
      } else {
        totalRow[prop] = null;
      }
    });
    return totalRow;
  }

  getShowTotalLevels(): number[] {
    return this.data?.headers
      ?.map((h: any, index: number) =>
        h.expandabile && index !== 0 ? index + 1 : null
      )
      ?.filter((i: any) => i !== null);
  }

  toProp(name: string) {
    const header = this.data.headers.find((h: any) => h.name === name);
    return header?.prop;
  }

  toggleSet(set: Set<string>, key: string): void {
    if (set.has(key)) set.delete(key);
    else set.add(key);
  }

  setKey(set: Set<string>, key: string, condition: boolean): void {
    if (condition) set.add(key);
    else set.delete(key);
  }

  toggleArray(arr: string[], value: string): void {
    const index = arr.indexOf(value);
    if (index > -1) arr.splice(index, 1);
    else arr.push(value);
  }

  setArray(arr: string[], value: string, add: boolean): void {
    const index = arr.indexOf(value);
    if (add && index === -1) arr.push(value);
    else if (!add && index > -1) arr.splice(index, 1);
  }

  buildKey(row: any): string {
    const parts = [];
    if (row.parent?.parent) parts.push(row.parent.parent.name); // Customer
    if (row.parent && row.level >= 2) parts.push(row.parent.name); // Engine Model
    parts.push(row.name); // Current row
    return parts.join('|');
  }

  onCellActivate(event: any) {
    if (event.type !== 'click') return;

    const columnName = event.column.name;
    const row = event.row;
    const key = this.buildKey(row);

    // --- CUSTOMER NAME LEVEL ---
    if (columnName === 'Customer Name' && row.level === 1) {
      const ems = row.children || [];

      // Collect all Customer Spec keys under this Customer Name
      const allSpecKeys: string[] = [];
      ems.forEach((em: any) => {
        const emKey = `${key}|${em.name}`;
        (em.children || []).forEach((spec: any) => {
          allSpecKeys.push(`${emKey}|${spec.name}`);
        });
      });

      // If all specs selected -> deselect, else select all
      const allSelected = allSpecKeys.every((specKey) =>
        this.customerSpecKeys.has(specKey)
      );

      this.setKey(this.customerNameKeys, key, !allSelected);

      ems.forEach((em: any) => {
        const emKey = `${key}|${em.name}`;
        this.setKey(this.engineModelKeys, emKey, !allSelected);
        (em.children || []).forEach((spec: any) => {
          const specKey = `${emKey}|${spec.name}`;
          this.setKey(this.customerSpecKeys, specKey, !allSelected);
          this.setArray(this.customerSpec, spec.name, !allSelected);
        });
      });
    }

    // --- ENGINE MODEL LEVEL ---
    if (columnName === 'Engine Model' && row.level === 2) {
      const specs = row.children || [];
      const specKeys = specs.map((s: any) => `${key}|${s.name}`);

      // If all specs selected -> deselect, else select all
      const allSelected = specKeys.every((k: string) =>
        this.customerSpecKeys.has(k)
      );

      this.setKey(this.engineModelKeys, key, !allSelected);

      specKeys.forEach((specKey: string, i: number) => {
        this.setKey(this.customerSpecKeys, specKey, !allSelected);
        this.setArray(this.customerSpec, specs[i].name, !allSelected);
      });

      // Update Customer Name selection based on all Engine Models
      const parentKey = this.buildKey(row.parent);
      const allEMSelected = row.parent.children.every((em: any) =>
        this.engineModelKeys.has(`${parentKey}|${em.name}`)
      );
      this.setKey(this.customerNameKeys, parentKey, allEMSelected);
    }

    // --- CUSTOMER SPEC LEVEL ---
    if (columnName === 'Customer Spec' && row.level === 3) {
      this.toggleSet(this.customerSpecKeys, key);
      this.toggleArray(this.customerSpec, row.name);

      const emKey = this.buildKey(row.parent);
      const allSpecsSelected = row.parent.children.every((spec: any) =>
        this.customerSpecKeys.has(`${emKey}|${spec.name}`)
      );
      this.setKey(this.engineModelKeys, emKey, allSpecsSelected);

      const custKey = this.buildKey(row.parent?.parent);
      const allEMSelected = row.parent.parent.children.every((em: any) =>
        this.engineModelKeys.has(`${custKey}|${em.name}`)
      );
      this.setKey(this.customerNameKeys, custKey, allEMSelected);
    }

    // Refresh visual highlights
    this.updateHighlightedCells();

    // Update global filter for customer spec
    this.globalFilterService.updateFilterSelection(
      'customer_spec',
      this.customerSpec,
      false,
      this.widgetId,
      true
    );
  }




  updateHighlightedCells(): void {
    this.highlightedCells = [];
    this.flattenedRows.forEach((row, idx) => {
      const key = this.buildKey(row);
      if (
        (row.level === 1 && this.customerNameKeys.has(key)) ||
        (row.level === 2 && this.engineModelKeys.has(key)) ||
        (row.level === 3 && this.customerSpecKeys.has(key))
      ) {
        this.highlightedCells.push(`${idx}-name`);
      }
    });
  }



  hasNavigation(levelIndex: number): boolean {
    return this.data.navigation?.some((nav: any) => nav.level === levelIndex);
  }

  onNavigate(navItem: any, row: any): void {
    const queryParams: any = {};
    if (row?.name && navItem.param) {
      queryParams[navItem.param] = row.name;
    }
    const queryString = new URLSearchParams(queryParams).toString();
    const path = navItem.path.startsWith('/')
      ? navItem.path.substring(1)
      : navItem.path;
    const fullUrl = `${location.origin}/${path}?${queryString}`;
    window.open(fullUrl, '_blank');
  }

  ngOnDestroy(): void {
    this.unSubscribe$.next();
    this.unSubscribe$.complete();
  }
}