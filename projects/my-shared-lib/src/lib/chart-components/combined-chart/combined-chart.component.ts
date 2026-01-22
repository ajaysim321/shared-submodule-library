import { AfterViewInit, Component, Inject, Input, OnDestroy, Optional } from '@angular/core';
import * as echarts from 'echarts';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { formatStatOneDecimal } from '../../utils/format.utils';
import { CUSTOM_PAYLOAD_SERVICE, ICustomPayloadService } from '../../injection-tokens';

@Component({
  selector: 'lib-combined-chart',
  imports: [],
  templateUrl: './combined-chart.component.html',
  styleUrl: './combined-chart.component.scss',
})
export class CombinedChartComponent implements AfterViewInit, OnDestroy {
  @Input() data!: any;
  private myChart!: echarts.ECharts;
  private resizeHandler = () => this.myChart?.resize();
  private unSubscribe$: Subject<void> = new Subject();
  filter: any;
  @Input() set widgetId(val: string) {
    this._widgetId = val;
  }
  get widgetId(): string {
    return this._widgetId || this.data?.widgetId;
  }
  private _widgetId!: string;
  private filterSub!: Subscription;
  private selectedBubbleIndex: number | null = null;
  private selectedDataIndex: number | null = null;

  constructor(
    @Optional() @Inject(CUSTOM_PAYLOAD_SERVICE) private configService: ICustomPayloadService,
    private globalFilterService: GlobalFilterService
  ) { }

  ngAfterViewInit(): void {
    this.filterSub = this.globalFilterService.filter$
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe((filters: any) => {
        if (filters?.widgetId === this.widgetId) return;
        this.filter = filters;
        this.loadAndRenderChart(filters);
      });
  }

  private loadAndRenderChart(filters?: any): void {
    const chartDom = document.getElementById(this.data?.widgetId);
    if (!chartDom) return;

    if (!this.myChart) {
      this.myChart = echarts.init(chartDom);
    }

    this.myChart.showLoading();
    this.configService
      .getConfig(this.data.apiUrl, {
        ...filters,
        useQueryParams: this.data?.useQueryParams || false,
      })
      .pipe(takeUntil(this.unSubscribe$))
      .subscribe({
        next: (res) => {
          this.renderChart(
            res?.data ?? '',
            filters?.queryParams?.button?.[0] ?? ''
          );
          this.addResizeListener();
        },
        error: () => {
          this.myChart.showLoading();
        },
      });
  }

  private renderChart(chartData?: any, view = ''): void {
    let config: any;
    let scatterSizes: number[] = [];
    // let uniqueBubbles: any;
    this.data.chartConfig.forEach((cfg: any, index: number) => {
      if (cfg.type === 'scatter') {
        const rawSeries = chartData[`series${index + 1}`];
        const seriesData = Array.isArray(rawSeries)
          ? rawSeries
          : rawSeries?.value ?? [];
        // uniqueBubbles = [
        //   ...new Set(seriesData.map((item: any) => item[cfg.bubbleColor])),
        // ];
        scatterSizes.push(...seriesData.map((d: any) => d.value?.[2] || 0));
      }
    });
    // const appIdColorMap: any = {};
    // uniqueBubbles.forEach((colorKey: any, idx: any) => {
    //   appIdColorMap[colorKey] = colors[idx % colors.length];
    // });
    const minSizeValue = Math.min(...scatterSizes);
    const maxSizeValue = Math.max(...scatterSizes);

    const series = this.data.chartConfig.map((cfg: any, index: any) => {
      config = cfg;
      const name = cfg.name || `Series ${index + 1}`;
      const rawSeries = chartData[`series${index + 1}`];
      const data = Array.isArray(rawSeries)
        ? rawSeries
        : rawSeries?.value ?? [];
      switch (cfg.type) {
        case 'line':
          return {
            name,
            type: 'line',
            data,
            itemStyle: {
              color: cfg.linecolor,
            },
            lineStyle: {
              color: cfg.linecolor || 'black',
              width: 2,
            },
            areaStyle: cfg.bgcolor ? { color: cfg.bgcolor } : undefined,
            symbol: 'none',
          };

        case 'bar':
          return {
            name,
            type: 'bar',
            data,
            itemStyle: {
              color: cfg.barcolor || '#888',
            },
          };

        case 'scatter':
          const allGroupNames = Object.keys(config.colors); // or use config.expectedGroups if that's preferred
          const actualGroups = [...new Set(data.map((item: any) => item[cfg.bubbleColor]))];

          return allGroupNames.map((groupName: string) => {
            const groupData = actualGroups.includes(groupName)
              ? data.filter((d: any) => d[cfg.bubbleColor] === groupName)
              : [];

            const baseColor = config.colors[groupName] || '#999';

            return {
              name: groupName,
              type: 'scatter',
              data: groupData,
              z: 10,
              selectedMode: 'single',
              select: {
                itemStyle: {
                  "borderWidth": 2,
                  "borderColor": "black"
                }
              },
              "emphasis": {
                "itemStyle": {
                  "borderWidth": 2,
                  "borderColor": "black"
                }
              },
              symbolSize: (point: any) =>
                groupData.length ? this.normalizeBubbleSize(point[2], minSizeValue, maxSizeValue) : 0,
              itemStyle: {
                opacity: groupData.length ? 0.9 : 0,
                color: {
                  type: 'radial',
                  x: 0.4,
                  y: 0.3,
                  r: 1,
                  colorStops: [
                    {
                      offset: 0,
                      color: this.lightenColor(baseColor, 50),
                    },
                    {
                      offset: 1,
                      color: baseColor,
                    },
                  ],
                },
              },
            };
          });

        default:
          return {};
      }
    });
    const option = {
      title: {
        text: view
          ? view.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()
          : 'Filtered View', left: 'center',
        top: 20,
        textStyle: {
          fontSize: 14,
          fontWeight: 'bold',
        },
      },
      grid: {
        top: 40,
        bottom: 10,
        left: 12,
        right: 10,
        containLabel: true,
      },
      legend: {
        show: true,
        type: 'scroll',
        // orient: 'vertical',
        right: 0,
        // left: 0,
        // top: 20,
        // bottom: 40,
        textStyle: {
          fontSize: 11,
        }
      },

      tooltip: {
          trigger: 'item',
          confine: false,
          position: (
            point: [number, number],
            params: any,
            dom: HTMLElement,
            rect: any,
            size: { viewSize: number[]; contentSize: number[] }
          ) => {
            const [x, y] = point;
            const viewWidth = size.viewSize[0];
            const viewHeight = size.viewSize[1];
            const boxWidth = size.contentSize[0];
            const boxHeight = size.contentSize[1];

            let posX = x + 20;
            let posY = y + 20;

            // Prevent bottom overflow
            if (posY + boxHeight > viewHeight) {
              posY = y - boxHeight - 20;
            }
            // Prevent right overflow
            // if (posX + boxWidth > viewWidth) {
            //   posX = x - boxWidth - 20;
            // }
            // //  Prevent left overflow
            // if (posX < 0) {
            //   posX = 10; // small padding from left edge
            // }
            //  Prevent top overflow
            if (posY < 0) {
              posY = 10; // small padding from top edge
            }

            return [posX, posY];
          },
        formatter: (params: any) => {
          if (!config || config.tooltip !== 'custom') {
            return `${params.seriesName}<br/>${params.name}: ${params.value}`;
          }

          setTimeout(() => {
            this.renderTooltipChart(params.data); // draw mini chart inside
          }, 0);

          return `
  <div style="
    width: 600px; padding: 0px;
    font-family: Arial; font-size: 13px;
    background: white; border-radius: 8px;
  ">
    <div id="tooltip-chart" style="width: 100%; height: 350px;"></div>

   <!-- Values Row -->
<div style="display: flex; font-weight: bold; font-size: 16px; margin-top: 8px; text-align: center;">
  <div style="flex: 1;">${params.data.appId || '-'}</div>
  <div style="flex: 1;">${params.data.displacement || '-'}</div>
  <div style="flex: 1;">${params.data.certification || '-'}</div>
  <div style="flex: 1;">${params.data.volumes || '-'}</div>
  <div style="flex: 1;">
    ${params.data.impact != null
              ? Number(params.data.impact).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })
              : '-'}
  </div>
</div>

<!-- Labels Row -->
<div style="display: flex; font-size: 12px; color: #666; text-align: center;">
  <div style="flex: 1;">Application ID</div>
  <div style="flex: 1;">Displacement</div>
  <div style="flex: 1;">Certification</div>
  <div style="flex: 1;">Volumes (2024)</div>
  <div style="flex: 1;">Total Impact</div>
</div>

`;

        },
      },

      xAxis: {
        type: 'value',
        name: this.data.xAxisLabel,
        nameLocation: 'center',
        nameGap: 20,
        min: 50,
        axisLabel: {
          fontSize: 10,
        },
        nameTextStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        },
        splitLine: {
          lineStyle: {
            type: 'dotted',
          }
        }
      },
      yAxis: {
        type: 'value',
        name: this.data.yAxisLabel,
        nameGap: 30,
        nameLocation: 'center',
        min: 50,
        axisLabel: {
          fontSize: 10,
          formatter: (value: number) => {
            if (value >= 1000) {
              return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
            }
            return value;
          },
        },
        nameTextStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        },
        splitLine: {
          lineStyle: {
            type: 'dotted',
          }
        }
      },
      series: series.flat(),
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          yAxisIndex: 0,
        },
      ],
    };

    if (this.selectedBubbleIndex !== null && this.selectedDataIndex !== null) {
      this.myChart.dispatchAction({
        type: 'unselect',
        seriesIndex: this.selectedBubbleIndex,
        dataIndex: this.selectedDataIndex,
      });
      this.selectedBubbleIndex = null;
      this.selectedDataIndex = null;
    }

    this.myChart.setOption(option);
    setTimeout(() => {
      this.myChart.hideLoading();
    }, 1000);

    this.myChart.off('click');

    this.myChart.on('click', (params: any) => {
      if (params.seriesType === 'scatter') {
        const { seriesIndex, dataIndex } = params;

        // Unhighlight previously selected bubble
        if (this.selectedBubbleIndex !== null && this.selectedDataIndex !== null) {
          this.myChart.dispatchAction({
            type: 'unselect',
            seriesIndex: this.selectedBubbleIndex,
            dataIndex: this.selectedDataIndex,
          });
        }

        // Highlight the current clicked bubble
        this.myChart.dispatchAction({
          type: 'select',
          seriesIndex,
          dataIndex,
        });

        // Save selection
        this.selectedBubbleIndex = seriesIndex;
        this.selectedDataIndex = dataIndex;
        // Filtering logic
        this.globalFilterService.updateFilterSelection(
          'customer_spec',
          [params.data.customer_spec],
          false,
          this.widgetId,
          false
        );
        this.globalFilterService.updateFilterSelection(
          'id',
          [params.data.id],
          false,
          this.widgetId,
          true
        );
      }
    });
  }

  private lightenColor(hex: string, percent: number) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;
    return (
      '#' +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  }

  normalizeBubbleSize(
    value: number,
    minValue: number,
    maxValue: number,
    minSize = 5,
    maxSize = 40,
    scaleExponent = 0.5 // 0.5 = square root, <1 flattens, >1 exaggerates
  ): number {
    if (!value || maxValue === minValue) return (minSize + maxSize) / 2;

    // Normalize value between 0 and 1
    const normalized = (value - minValue) / (maxValue - minValue);

    // Apply exponent to control visual spacing
    const scaled = Math.pow(normalized, scaleExponent);

    return scaled * (maxSize - minSize) + minSize;
  }

  renderTooltipChart(data: any) {
    const container = document.getElementById('tooltip-chart');
    if (!container) return;

    // Dispose previous instance if exists
    if (echarts.getInstanceByDom(container)) {
      echarts.dispose(container);
    }

    const chart = echarts.init(container);
    const maxChange = Math.max(data.priceChange, data.price_change_2);


    const option = {
      legend: {
        data: [
          'Current ESP', 'Proposed ESP', 'ESP Price Change %',
          'Current Spec Price', 'Proposed Spec Price', 'Spec Price Change %'
        ],
        top: 0,
        left: 2,
        textStyle: { fontSize: 10 }
      },
      grid: {
        top: 80,
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        min: 1,
        max: 4.5,
        splitLine: { show: false },
        axisLabel: { show: false },
        name: data.company,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Prices',
          position: 'left',
          splitLine: { show: false },
          axisLabel: { formatter: (v: number) => (v >= 1000 ? v / 1000 + 'K' : v) },

        },
        {
          type: 'value',
          name: '% Change',
          position: 'right',
          min: 0,
          max: Math.ceil(maxChange * 1.8) || 10,
          axisLabel: { formatter: '{value} %' },
          splitLine: { show: false },
          label: {
            show: true,
            formatter: (params: any) => `${Number(params.value).toFixed(1)}%`,
            position: 'top', fontSize: 10, backgroundColor: '#ccc',
            borderRadius: 4,
            padding: [2, 6],
          }
        }
      ],
      series: [
        // Group 1
        {
          name: 'Current ESP',
          type: 'bar',
          barWidth: 50,
          data: [[2.4, data.minPrice]],
          itemStyle: { color: '#1E90FF' },
          barGap: 0,
          label: {
            show: true, position: 'top',
            // formatter: (params: any) => `${Math.round(params.value[1])}`,
            formatter: (params: any) => formatStatOneDecimal(params.value[1]),
            fontSize: 10, backgroundColor: '#ccc',
            borderRadius: 4,
            padding: [2, 6],
          }

        },
        {
          name: 'Proposed ESP',
          type: 'bar',
          barWidth: 50,
          barGap: 0,
          data: [[2.4, data.maxPrice]],
          itemStyle: { color: '#00008B' },
          label: {
            show: true, position: 'top',
            formatter: (params: any) => formatStatOneDecimal(params.value[1]),
            fontSize: 10, backgroundColor: '#ccc',
            borderRadius: 4,
            padding: [2, 6],
          }

        },
        {
          name: 'ESP Price Change %',
          type: 'scatter',
          yAxisIndex: 1,
          data: [[2.07, data.priceChange]],
          symbolSize: 20,
          itemStyle: { color: '#ff5722' },
          label: {
            show: true,
            formatter: (params: any) => `${Number(params.value[1]).toFixed(1)}%`,
            position: 'top', fontSize: 10, backgroundColor: '#ccc',
            borderRadius: 4,
            padding: [2, 6],
          }
        },

        // Group 2
        {
          name: 'Current Spec Price',
          type: 'bar',
          barWidth: 40,
          barGap: 0,
          data: [[3, data.current_spec_price_with_dbu_upfits]],
          itemStyle: { color: '#BFC59B' },
          label: {
            show: true, position: 'top',
            formatter: (params: any) => formatStatOneDecimal(params.value[1]),
            fontSize: 10, backgroundColor: '#ccc',
            borderRadius: 4,
            padding: [2, 6],
          }

        },
        {
          name: 'Proposed Spec Price',
          type: 'bar',
          barWidth: 40,
          barGap: 0,
          data: [[3, data.proposed_spec_price_with_dbu_upfits]],
          itemStyle: { color: '#595F37' },
          label: {
            show: true, position: 'top',
            formatter: (params: any) => formatStatOneDecimal(params.value[1]),
            fontSize: 10, backgroundColor: '#ccc',
            borderRadius: 4,
            padding: [2, 6],
          }

        },
        {
          name: 'Spec Price Change %',
          type: 'scatter',
          yAxisIndex: 1,
          data: [[3.43, data.price_change_2]],
          symbolSize: 20,
          itemStyle: { color: '#FCD12A' },
          label: {
            show: true,
            formatter: (params: any) => `${Number(params.value[1]).toFixed(1)}%`,
            position: 'top', fontSize: 10, backgroundColor: '#ccc',
            borderRadius: 4,
            padding: [2, 6],
          }
        }
      ]
    };


    chart.setOption(option);
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
    window.removeEventListener('resize', this.resizeHandler);
    this.myChart?.dispose();
  }
}
