import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, OnDestroy, Renderer2 } from '@angular/core';
import * as echarts from 'echarts';
import { ConfigService } from '../../shared-services/config.service';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import { DataErrorComponent } from '../../global-components/data-error/data-error.component';
import { roundToNearestInteger, formatDecimalWithCommas, formatStat, formatStatOneDecimal } from '../../utils/format.utils';
import { debounceTime, distinctUntilChanged, Subject, switchMap, takeUntil } from 'rxjs';
import { CustomPayloadService } from '../../../../../my-app/src/app/shared/dashboard-payload-services/custom-payload.service';

@Component({
  selector: 'app-line-column-chart',
  standalone: true,
  imports: [CommonModule, DataErrorComponent],
  templateUrl: './line-column-chart.component.html',
  styleUrl: './line-column-chart.component.scss'
})
export class LineColumnChartComponent implements AfterViewInit, OnDestroy {
  @Input() data!: any;
  private myChart!: echarts.ECharts;
  public hasError = false;
  public errorMessage = '';
  private unSubscribe$: Subject<void> = new Subject();
  private currentInput: HTMLInputElement | null = null;
  private currentDataIndex: number | null = null;
  private chartData: any = null;
  private editable: boolean[] = [];
  private currentFilters: any = {}; // Store current filters for reuse

  constructor(
    private configService: CustomPayloadService,
    private globalFilterService: GlobalFilterService,
    private renderer: Renderer2
  ) { }

  ngAfterViewInit(): void {
    this.globalFilterService.filter$
      .pipe(
        takeUntil(this.unSubscribe$),
        switchMap((filters) => this.loadAndRenderChart(filters))
      )
      .subscribe({
        next: (res: any) => {
          this.chartData = this.data?.dataKey ? res[this.data.dataKey] : res;

          // Store editable array
          this.editable = this.resolvePath(this.chartData, 'editable') || [];

          // Handle empty or invalid data
          const isEmpty =
            !this.chartData ||
            !this.resolvePath(this.chartData, this.data.xAxis)?.length;

          if (isEmpty) {
            this.hasError = true;
            this.errorMessage = 'No data found for the selected filters.';
            this.myChart.clear();
          } else {
            this.hasError = false;
            this.renderChart(this.chartData);
          }

          this.myChart.hideLoading();
          window.addEventListener('resize', this.resizeChart);
        },
        error: (err) => {
          this.hasError = true;
          this.errorMessage = 'No Data available for the chart.';
          this.myChart?.clear();
          this.myChart.hideLoading();
        }
      });
  }

  private loadAndRenderChart(filters?: any): any {
    const chartDom = document.getElementById(this.data?.widgetId);
    if (!chartDom) return;

    if (!this.myChart) {
      this.myChart = echarts.init(chartDom);
    }
    this.myChart.showLoading();

    // Store filters for reuse in handleLabelClick, preserve original filters
    this.currentFilters = { ...filters, useQueryParams: this.data?.useQueryParams || false };

    // Add customer_spec from dropdown to requestParams
    const selectedFilters = this.globalFilterService.getCurrentFilters();

    let customerSpecValue = selectedFilters.requestParams?.customer_spec || selectedFilters.queryParams?.customer_spec;


    // Fallback to ensure customer_spec is set if configured as default
    if (!customerSpecValue && this.data && this.data.config && this.data.config.content) {
      const customerSpecConfig = this.data.config.content.find((item: any) => item.key === 'customer_spec');
      if (customerSpecConfig?.isfirstOptionDefault && selectedFilters.options?.['customer_spec']?.length > 0) {
        customerSpecValue = selectedFilters.options['customer_spec'][0];

      }
    }

    if (customerSpecValue) {
      this.currentFilters.requestParams = {
        ...this.currentFilters.requestParams,
        customer_spec: customerSpecValue
      };
    }




    // added logic for submit button on chart api trigger send alloptions list in Payload

    // preserve existing filters
    this.currentFilters = { ...filters, useQueryParams: this.data?.useQueryParams || false };

    // check if this chart call was triggered by some widget
    const triggeredWidgetId = this.currentFilters?.queryParams?.widgetId;
    const filterListeners: string[] = this.data?.filterListner || [];

    //  check if triggeredWidgetId matches any listener
    const isTriggeredByListener = (() => {
      if (!triggeredWidgetId || !filterListeners?.length) return false;
      if (Array.isArray(triggeredWidgetId)) {
        return triggeredWidgetId.some((id: string) => filterListeners.includes(id));
      }
      return filterListeners.includes(triggeredWidgetId);
    })();

    // If widget config asked to "send all options" and the call was triggered by a listener
    if (isTriggeredByListener && Array.isArray(this.data?.sendAllOptionsField)) {
      this.data?.sendAllOptionsField.forEach((field: string) => {
        // get list from global dropdown
        const allOptions = this.globalFilterService.dropdownOptions?.[field] || selectedFilters?.options?.[field];

        if (Array.isArray(allOptions) && !!allOptions.length) {
          const normalized = allOptions.map((opt: any) => {
            if (opt == null) return opt;
            return (typeof opt === 'object') ? (opt.value ?? opt.key ?? opt.id ?? opt) : opt;
          });

          this.currentFilters.requestParams = {
            ...(this.currentFilters.requestParams || {}),
            [field]: normalized
          };
        }
      });
    }
    else {
      //  use currently selected single value existing behavior
      const customerSpecValue = selectedFilters.requestParams?.customer_spec || selectedFilters.queryParams?.customer_spec;
      if (customerSpecValue) {
        this.currentFilters.requestParams = {
          ...(this.currentFilters.requestParams || {}),
          customer_spec: customerSpecValue
        };
      }
    }

    return this.configService.getConfig(this.data.apiUrl, this.currentFilters)
      .pipe(takeUntil(this.unSubscribe$))
  }

  private renderChart(fullData: any): void {
    if (!fullData) return;

    const xAxisData = this.resolvePath(fullData, this.data.xAxis);
    const barData = this.resolvePath(fullData, this.data.barSeries) || [];
    const lineData = this.resolvePath(fullData, this.data.lineSeries) || [];

    if (!Array.isArray(barData) || !Array.isArray(lineData) || !Array.isArray(xAxisData)) {
      console.error('Invalid or missing data for chart rendering:', { xAxisData, barData, lineData });
      return;
    }

    // Compute max bar value from original data (before scaling)
    // const rawBarData = barData.map((v: any) => +v);
    // const maxBarValue = Math.max(...rawBarData);
    // const scaledBarMax = maxBarValue / 1000;
    // const rightAxisMax = scaledBarMax * 2;
    const maxBarValue = Math.max(...lineData);
    const defaultMax = 10;

    const rightAxisMax =
      maxBarValue > defaultMax ? maxBarValue * 3 : defaultMax * 2;


    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: ((params: any[]) => {
          const items = params.map(p => {
            const isPercentage = p.seriesName.includes('%');
            const formattedValue = isPercentage
              ? formatStat(p.value, '%')
              : formatDecimalWithCommas(p.value);
            return `${p.seriesName}: ${formattedValue}`;
          });
          return items.join('<br/>');
        }) as echarts.TooltipComponentOption['formatter']
      },
      legend: {
        data: this.data.seriesNames || []
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        splitLine: { show: false },
        axisLine: { show: true },
        axisTick: { show: true }
      },
      yAxis: [
        {
          type: 'value',
          name: this.data.yAxisNames?.[0] || 'Default Left Axis',
          position: 'left',
          splitLine: { show: false },
          axisLine: { show: true },
          axisTick: { show: true },
          axisLabel: {
            formatter: (value: number) => formatStat(value)
          }
        },
        {
          type: 'value',
          name: this.data.yAxisNames?.[1] || 'Default Right Axis',
          position: 'right',
          min: -5,
          max: rightAxisMax,
          splitLine: { show: false },
          axisLine: { show: true },
          axisTick: { show: true },
          axisLabel: {
            formatter: (value: number) => `${Math.round(value)}`
          }
        }
      ],
      series: [
        {
          name: this.data.seriesNames?.[0] || 'Bar Series',
          type: 'bar',
          yAxisIndex: 0,
          data: barData.map((v: any) => +v),
          itemStyle: { color: this.data.barColor || '#87CEFA' },
          label: {
            show: true,
            position: 'top',
            formatter: (params: any) => `${formatStatOneDecimal(+params.value).toLocaleString()}`
          },
          barWidth: '40%'
        },
        {
          name: this.data.seriesNames?.[1] || 'Line Series',
          type: 'line',
          yAxisIndex: 1,
          data: lineData,
          symbol: 'circle',
          symbolSize: 10,
          lineStyle: {
            color: this.data.lineColor || '#004d00',
            width: 2
          },
          itemStyle: {
            color: this.data.lineColor || '#004d00'
          },
          label: {
            show: true,
            position: 'top',
            backgroundColor: '#cceeff',
            padding: [2, 4],
            borderRadius: 4,
            color: this.data.lineColor || '#004d00',
            formatter: (params: any) => formatStat(params.value, '%')
          }
        }
      ]
    };

    this.myChart.setOption(option);

    // Add click event for editable line series only if editableLineValues is true
    if (this.data.editableLineValues) {
      this.myChart.on('click', { seriesIndex: 1 }, (params: any) => {
        this.handleLabelClick(params);
      });
    }
  }

  private handleLabelClick(params: any): void {
    console.log('Handle Label Click:', {
      editableLineValues: this.data.editableLineValues,
      editable: this.editable[params.dataIndex],
      currentInput: !!this.currentInput,
      dataIndex: params.dataIndex
    });

    // Only allow editing if editableLineValues is true and the data point is editable
    if (!this.data.editableLineValues || !this.editable[params.dataIndex] || this.currentInput) {
      console.warn('Editing blocked:', {
        editableLineValues: this.data.editableLineValues,
        editable: this.editable[params.dataIndex],
        currentInput: !!this.currentInput
      });
      return;
    }

    const chartDom = document.getElementById(this.data?.widgetId);
    if (!chartDom) {
      console.error('Chart DOM not found');
      return;
    }

    const pointInPixel = this.myChart.convertToPixel({ seriesIndex: 1 }, [params.dataIndex, params.value]);
    if (!pointInPixel) {
      console.error('Failed to convert to pixel coordinates');
      return;
    }

    // Create input element
    this.currentInput = this.renderer.createElement('input');
    this.renderer.setAttribute(this.currentInput, 'type', 'number');
    this.renderer.setStyle(this.currentInput, 'position', 'absolute');
    this.renderer.setStyle(this.currentInput, 'left', `${pointInPixel[0] - 30}px`);
    this.renderer.setStyle(this.currentInput, 'top', `${pointInPixel[1] - 40}px`);
    this.renderer.setStyle(this.currentInput, 'width', '60px');
    this.renderer.setStyle(this.currentInput, 'padding', '2px');
    this.renderer.setStyle(this.currentInput, 'font-size', '12px');
    // Round the raw API response value to 2 decimal places for the input box
    const roundedValue = Number(params.value).toFixed(1);
    this.renderer.setAttribute(this.currentInput, 'value', roundedValue);

    // Append input to chart container
    this.renderer.appendChild(chartDom, this.currentInput);
    if (this.currentInput) {
      this.currentInput.focus();
    }

    // Store current data index and original value
    this.currentDataIndex = params.dataIndex;
    const originalValue = parseFloat(roundedValue); // Store the original rounded value

    // Handle input submission
    const saveValue = () => {
      if (this.currentInput && this.currentDataIndex !== null) {
        const newValue = parseFloat(this.currentInput.value);
        if (!isNaN(newValue) && newValue !== originalValue) { // Only proceed if value has changed
          // Create barValues with only the edited bar
          const barValues: { [key: string]: number } = {};
          barValues[`bar${this.currentDataIndex}`] = newValue;

          // Filter out existing bar parameters (bar1, bar2, bar3) from currentFilters
          const nonBarParams = Object.keys(this.currentFilters.queryParams || {})
            .filter(key => !key.startsWith('bar'))
            .reduce((obj: any, key) => {
              obj[key] = this.currentFilters.queryParams[key];
              return obj;
            }, {});

          // Combine non-bar query parameters with the edited bar
          const queryParams = {
            ...nonBarParams,
            ...barValues
          };

          // Add customer_spec from dropdown to requestParams
          const selectedFilters = this.globalFilterService.getCurrentFilters();
          const customerSpecValue = selectedFilters.requestParams?.customer_spec || selectedFilters.queryParams?.customer_spec;
          const requestParams = customerSpecValue ? { customer_spec: customerSpecValue } : this.currentFilters.requestParams || {};

          // Prepare filters object for ConfigService
          const filters = {
            queryParams,
            useQueryParams: true,
            requestParams
          };
          console.log('Sending Filters:', filters);

          // Make API call to update data
          this.configService.getConfig(this.data.apiUrl, filters)
            .pipe(takeUntil(this.unSubscribe$))
            .subscribe({
              next: (res) => {
                console.log('Update API Response:', res);
                this.chartData = this.data?.dataKey ? res[this.data.dataKey] : res;
                this.editable = this.resolvePath(this.chartData, 'editable') || [];
                this.currentFilters.queryParams = queryParams; // Update stored filters
                this.renderChart(this.chartData);
                this.removeInput();
              },
              error: (err) => {
                console.error('Failed to update chart data:', err);
                this.hasError = true;
                this.errorMessage = 'Failed to update value. Please try again.';
                this.removeInput();
              }
            });
        } else {
          if (isNaN(newValue)) {
            console.warn('Invalid input value:', this.currentInput.value);
          } else {
            console.log('No change in value, skipping API call:', { originalValue, newValue });
          }
          this.removeInput();
        }
      }
    };

    // Listen for blur and Enter key
    this.renderer.listen(this.currentInput, 'blur', saveValue);
    this.renderer.listen(this.currentInput, 'keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        saveValue();
      } else if (event.key === 'Escape') {
        this.removeInput();
      }
    });
  }

  private removeInput(): void {
    if (this.currentInput) {
      this.renderer.removeChild(this.currentInput.parentNode, this.currentInput);
      this.currentInput = null;
      this.currentDataIndex = null;
    }
  }

  private resolvePath(obj: any, path: string): any {
    try {
      return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    } catch (e) {
      console.error('Path resolution failed:', path);
      return [];
    }
  }

  private resizeChart = () => {
    this.myChart?.resize();
  };

  ngOnDestroy(): void {
    this.unSubscribe$.next();
    this.unSubscribe$.complete();
    this.myChart?.dispose();
    window.removeEventListener('resize', this.resizeChart);
    this.removeInput();
  }
}