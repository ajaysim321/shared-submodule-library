import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Inject, Input, OnDestroy, Optional } from '@angular/core';
import * as echarts from 'echarts';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import { formatStat, formatDecimalWithCommas } from '../../utils/format.utils';
import { DataErrorComponent } from '../../global-components/data-error/data-error.component';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { CUSTOM_PAYLOAD_SERVICE, ICustomPayloadService } from '../../injection-tokens';

@Component({
  selector: 'app-horizontal-bar-chart',
  standalone: true,
  imports: [CommonModule, DataErrorComponent],
  templateUrl: './horizontal-bar-chart.component.html',
  styleUrl: './horizontal-bar-chart.component.scss'
})
export class HorizontalBarChartComponent implements AfterViewInit, OnDestroy {

  @Input() data!: any;
  private myChart!: echarts.ECharts;
  private currentFilters: any = {};
  private selectedCategory: string | null = null;
  public hasError = false;
  public errorMessage = '';
  private unSubscribe$: Subject<void> = new Subject();

  constructor(
    @Optional() @Inject(CUSTOM_PAYLOAD_SERVICE) private configService: ICustomPayloadService,
    private globalFilterService: GlobalFilterService
  ) { }

  ngAfterViewInit(): void {    
    this.globalFilterService.filter$
      .pipe(
        takeUntil(this.unSubscribe$),
        switchMap((filters) => {
          const triggerWidgetId = filters?.widgetId;
          const listenerIds = this.data?.filterListner || [];

          if (triggerWidgetId && triggerWidgetId !== this.data.widgetId && !listenerIds.includes(triggerWidgetId)) {
            return;
          }

          const filterKey = this.data?.filterKey || 'category';
          const selected = filters?.requestParams?.[filterKey]?.[0] || null;
          this.selectedCategory = selected;

          return this.loadAndRenderChart(filters);

          // if (Object.keys(filters).length !== 0) {
          //   this.loadAndRenderChart(filters);
          // }
        })
      )
      .subscribe({
        next: (res: any) => {
          const chartData = res?.data;

          const isEmpty =
            !chartData || (Array.isArray(chartData) && chartData.length === 0);
          if (isEmpty) {
            this.hasError = true;
            this.errorMessage = 'No data available for the selected filters.';
            this.myChart.clear();
          } else {
            this.hasError = false;
            this.renderChart(chartData);
            this.addResizeListener();
          }

          this.myChart.hideLoading();
        },
        error: (err) => {
          this.hasError = true;
          this.errorMessage = 'No Data available for the chart.';
          this.myChart.clear();
          this.myChart.hideLoading();
        },
      });
  }


  private loadAndRenderChart(filters?: any): any {
    this.currentFilters = filters;
    const chartDom = document.getElementById(this.data?.widgetId);
    if (!chartDom) return;

    if (!this.myChart) {
      this.myChart = echarts.init(chartDom);
    }

    this.myChart.showLoading();

  return  this.configService.getConfig(this.data.apiUrl, {
      ...filters,
      useQueryParams: this.data?.useQueryParams || false
    })
    .pipe(takeUntil(this.unSubscribe$))
    
  }




  private renderChart(chartData?: { category: string[]; value: number[] }): void {
    if (!this.data) return;

    const extendLeft = this.data.orientation === 'left';

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const data = params[0];
          const category = data?.name || '';
          const value = data?.value || 0;

          const tooltipLabels = this.data?.tooltipLabels || {};
          const categoryLabel = tooltipLabels.category || 'Category';
          const valueLabel = tooltipLabels.value || 'Value';

          const formattedValue = this.data?.useCommaStat
            ? formatDecimalWithCommas(value)
            : value;

          return `${categoryLabel}: ${category}<br/>${valueLabel}: ${formattedValue}`;
        }
      },
      grid: {
        left: 40,
        right: '40px',
        top: 5,
        bottom: 10,
        containLabel: true
      },
      xAxis: {
        type: 'value',
        inverse: extendLeft,
        axisLabel: {
          show: false
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'category',
        name: 'Engine Model',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          fontWeight: 'bold',
          fontSize: 14
        },
        data: chartData?.category || [],
        axisLabel: {
          formatter: (value: string) =>
            value.length > 10 ? value.slice(0, 10) + '…' : value
        }
      },
      series: [
        {
          type: 'bar',
          data: chartData?.category.map((cat, index) => {
            const value = chartData?.value[index];
            const isSelected = this.selectedCategory === null || this.selectedCategory === cat;
            const maxVal = Math.max(...chartData?.value || []);

            return {
              value,
              itemStyle: {
                color: isSelected
                  ? this.data.barColor || '#91CC75'
                  : 'rgba(200, 200, 200, 0.3)' 
              },
              label: {
                show: true,
                offset: [2, 6],
                position: (params: any) => {
  const val = params.value;
                  return val < 0 ? 'insideLeft' : 'insideRight';
                },
                color: 'black',
                formatter: ({ value }: any) => formatStat(value)
              }
            };
          }) || [],
          emphasis: {
            label: {
              show: true
            }
          }
        },
      ]

    };
    this.myChart.setOption(option);
    setTimeout(() => this.myChart.hideLoading(), 1000);

    if (this.data?.triggerFilterEvent) {
      this.setupChartClickEvent();
    }
  }


  private setupChartClickEvent(): void {
    this.myChart.off('click');

    this.myChart.on('click', (params: any) => {
      const clickedCategory = params?.name;
      const filterKey = this.data?.filterKey || 'category';
      const widgetId = this.data?.widgetId;

      if (!clickedCategory) return;

      //  reset logic
      if (this.globalFilterService.isSelected(filterKey, clickedCategory)) {
        this.selectedCategory = null;
        this.globalFilterService.resetFilterSelection(filterKey);
      } else {
        this.selectedCategory = clickedCategory;
        this.globalFilterService.updateFilterSelection(
          filterKey,
          [clickedCategory],
          false,
          widgetId
        );
      }

      this.loadAndRenderChart(this.currentFilters); // Reapply selection
    });
  }





  private addResizeListener(): void {
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.myChart?.resize();
  };

  ngOnDestroy(): void {
    this.unSubscribe$.next();
    this.unSubscribe$.complete();
    window.removeEventListener('resize', this.handleResize);
    this.myChart?.dispose();
  }
}
