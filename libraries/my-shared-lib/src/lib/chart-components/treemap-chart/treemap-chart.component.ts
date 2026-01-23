import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  Optional,
  ViewChild,
} from '@angular/core';
import * as echarts from 'echarts';
import { Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import {
  formatDecimalWithCommas,
} from '../../utils/format.utils';
import { DataErrorComponent } from '../../global-components/data-error/data-error.component';
import { CUSTOM_PAYLOAD_SERVICE, ICustomPayloadService } from '../../injection-tokens';

@Component({
  selector: 'app-tree-map-chart',
  standalone: true,
  imports: [CommonModule, DataErrorComponent],
  templateUrl: './treemap-chart.component.html',
  styleUrl: './treemap-chart.component.scss',
})
export class TreemapChartComponent implements AfterViewInit, OnDestroy {
  @Input() data!: any;
  @Input() set widgetId(val: string) {
    this._widgetId = val;
  }

  @ViewChild('legendContainer')
  private legendContainerRef!: ElementRef<HTMLDivElement>;
  public showLeftArrow = false;
  public showRightArrow = false;
  private unSubscribe$: Subject<void> = new Subject();

  get widgetId(): string {
    return this._widgetId || this.data?.widgetId;
  }

  private _widgetId!: string;
  private myChart!: echarts.ECharts;
  private filterSub!: Subscription;
  private originalTreemapData: any;
  private selectedCustomer: string | null = null;
  public hasError = false;
  public errorMessage = '';
  public legendItems: { name: string; color: string }[] = [];
  public activeLegend: string | null = null;

  constructor(
    @Optional() @Inject(CUSTOM_PAYLOAD_SERVICE) private configService: ICustomPayloadService,
    private globalFilterService: GlobalFilterService
  ) { }

  ngAfterViewChecked(): void {
    setTimeout(() => this.updateArrowVisibility(), 0);
  }

  ngAfterViewInit(): void {
    this.filterSub = this.globalFilterService.filter$
      .pipe(
        takeUntil(this.unSubscribe$),
        switchMap((filters) => {
          const customer = filters?.requestParams?.['customer_name']?.[0];

          // sync local state with filter
          this.selectedCustomer = customer || null;

          if (this.selectedCustomer) {
            this.highlightNode(this.selectedCustomer);
          } else {
            this.resetHighlight();
          }

          return this.loadAndRenderChart(filters);
        })
      )

      .subscribe({
        next: (res) => {
          const treeData = this.resolvePath(res, this.data.series);
          this.originalTreemapData = JSON.parse(JSON.stringify(treeData));

          const isEmpty =
            !treeData || (Array.isArray(treeData) && treeData.length === 0);

          if (isEmpty) {
            this.hasError = true;
            this.errorMessage = 'No data found for the selected filters.';
            this.myChart.clear();
          } else if (this.hasOnlyNonPositiveValues(treeData)) {
            this.hasError = true;
            this.errorMessage =
              'Data (-ve or zero) is not appropriate for chart.';
            // this.myChart.clear();
          } else {
            this.hasError = false;
            this.renderChart(treeData);
          }

          this.myChart.hideLoading();
        },
        error: () => {
          this.hasError = true;
          this.errorMessage = 'No Data available for the chart.';
          this.myChart?.clear();
          this.myChart.hideLoading();
        },
      });
  }

  @HostListener('window:resize')
  onResize() {
    this.updateArrowVisibility();
  }

  public scrollLegend(direction: 'left' | 'right'): void {
    const element = this.legendContainerRef.nativeElement;
    const scrollAmount = element.clientWidth * 0.8;

    element.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth',
    });
  }

  public updateArrowVisibility(): void {
    if (!this.legendContainerRef) return;

    const element = this.legendContainerRef.nativeElement;
    const scrollLeft = element.scrollLeft;
    const scrollWidth = element.scrollWidth;
    const clientWidth = element.clientWidth;

    this.showLeftArrow = scrollLeft > 0;
    this.showRightArrow = scrollWidth - scrollLeft - clientWidth > 1;
  }

  private loadAndRenderChart(filters?: any): any {
    const chartDom = document.getElementById(this.widgetId);
    if (!chartDom) return;

    if (!this.myChart) {
      this.myChart = echarts.init(chartDom);
    }

    this.myChart.showLoading();

    return this.configService
      .getConfig(this.data?.apiUrl, {
        ...filters,
        useQueryParams: this.data?.useQueryParams || false,
      })
      .pipe(takeUntil(this.unSubscribe$));
  }

  private renderChart(treeData: any): void {
    // Add parent label logic
    treeData.forEach((parent: any) => {
      const maxChild = parent.children?.reduce(
        (a: any, b: any) => (a.value > b.value ? a : b),
        {}
      );
      if (maxChild) {
        maxChild.upperLabel = parent.name;
      }
    });

    const colors = [
      '#5470c6',
      '#91cc75',
      '#fac858',
      '#ee6666',
      '#73c0de',
      '#3ba272',
      '#fc8452',
      '#9a60b4',
      '#2196F3',
      '#ea7ccc',
      '#4CAF50',
      '#FFC107',
      '#E91E63',
      '#00BCD4',
      '#8BC34A',
      '#FF9800',
      '#9C27B0',
      '#009688',
      '#F44336',
      '#673AB7',
      '#CDDC39',
      '#FF5722',
      '#607D8B',
      '#795548',
      '#03A9F4',
    ];

    treeData.sort(
      (a: { value: number }, b: { value: number }) => b.value - a.value
    );
    // The rest of the function remains the same
    this.legendItems = [];
    treeData.forEach((item: any, index: number) => {
      const color = colors[index % colors.length];
      item.itemStyle = {
        color: color,
      };
      this.legendItems.push({
        name: item.name,
        color: color,
      });
    });

    const option: echarts.EChartsOption = {
      legend: {
        show: false,
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const path = params.treePathInfo;
          const parentName = path?.[1]?.name || '';
          const childName = params.name || '';
          const value = params.value ?? '';
          const currentSales = params.data?.CurrentSales ?? null;

          const formattedValue = this.data.useCommaStat
            ? formatDecimalWithCommas(value)
            : value;

          const formattedSales = this.data.useCommaStat
            ? formatDecimalWithCommas(currentSales)
            : currentSales;

          const tooltipLabels = this.data.tooltipLabels || {};
          const parentLabel = tooltipLabels.parent || 'Parent';
          const childLabel = tooltipLabels.child || 'Child';
          const valueLabel = tooltipLabels.value || 'Value';
          const salesLabel = tooltipLabels.sales || 'Current Sales';

          return `
          ${parentLabel}: ${parentName}<br/>
          ${childLabel}: ${childName}<br/>
          ${valueLabel}: ${formattedValue}<br/>
          ${salesLabel}: ${formattedSales}
        `;
        },
      },
      series: [
        {
          type: 'treemap',
          data: treeData,
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          label: {
            show: true,
            formatter: (params: any) => {
              const { upperLabel, name } = params.data;
              if (upperLabel) return `{parent|${upperLabel}}\n{child|${name}}`;
              return `{child|${name}}`;
            },
            rich: {
              parent: {
                fontSize: 12,
                fontWeight: 'bold',
                padding: [0, 0, 0, 5],
              },
              child: { fontSize: 10, padding: [0, 0, 5, 5] },
            },
          },
          itemStyle: {
            borderColor: '#fff',
          },
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      ],
    };

    this.myChart.setOption(option);
    setTimeout(() => this.myChart.hideLoading(), 800);

    if (this.data?.triggerFilterEvent) {
      this.setupChartClickEvent();
    }
  }

  private hasOnlyNonPositiveValues(treeData: any[]): boolean {
    const allValues: number[] = [];

    const traverse = (nodes: any[]) => {
      for (const node of nodes) {
        if (typeof node.value === 'number') {
          allValues.push(node.value);
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(treeData);
    return allValues.length > 0 && allValues.every((val) => val <= 0);
  }

  private setupChartClickEvent(): void {
    this.myChart.off('click');

    this.myChart.on('click', (params: any) => {
      const segment = params?.treePathInfo?.[1]?.name;
      const customer = params?.name;

      if (!segment || !customer) return;

      // toggle logic if clicked again on same, reset
      if (this.selectedCustomer === customer) {
        this.selectedCustomer = null; // clear state first
        this.resetHighlight();
        this.globalFilterService.resetFilterSelection('application_id');
        this.globalFilterService.resetFilterSelection('customer_name');
        return;
      }

      this.selectedCustomer = customer;
      this.highlightNode(customer);

      this.globalFilterService.updateFilterSelection(
        'application_id',
        [segment],
        false,
        this.widgetId
      );
      this.globalFilterService.updateFilterSelection(
        'customer_name',
        [customer],
        false,
        this.widgetId
      );
    });
  }

  private highlightNode(name: string): void {
    const updated = JSON.parse(JSON.stringify(this.originalTreemapData));

    updated.forEach((parent: any) => {
      parent.children?.forEach((child: any) => {
        child.itemStyle = { opacity: child.name === name ? 1 : 0.3 };
      });
    });

    this.myChart.setOption({ series: [{ type: 'treemap', data: updated }] });
  }

  private resetHighlight(): void {
    this.selectedCustomer = null;

    if (!this.originalTreemapData) {
      return;
    }

    const reset = structuredClone(this.originalTreemapData);
    reset.forEach((parent: any) => {
      parent.children?.forEach((child: any) => {
        child.itemStyle = { opacity: 1 };
      });
    });

    this.myChart.setOption({ series: [{ type: 'treemap', data: reset }] });
  }

  private resolvePath(obj: any, path: string): any {
    try {
      return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    } catch {
      return [];
    }
  }

  ngOnDestroy(): void {
    this.unSubscribe$.next();
    this.unSubscribe$.complete();
    this.filterSub?.unsubscribe();
    this.myChart?.dispose();
  }
}
