import { Component, Inject, Input, Optional } from '@angular/core';
import * as echarts from 'echarts';
import { debounceTime, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import { formatStat, formatStatOneDecimal, oneDecimalWithCommas } from '../../utils/format.utils';
import { CUSTOM_PAYLOAD_SERVICE, ICustomPayloadService } from '../../injection-tokens';

@Component({
  selector: 'lib-waterfall-stack-chart',
  imports: [],
  templateUrl: './waterfall-stack-chart.component.html',
  styleUrl: './waterfall-stack-chart.component.scss',
})
export class WaterfallStackChartComponent {
  @Input() data!: any;
  private myChart!: echarts.ECharts;
  private subscription!: Subscription;
  private unSubscribe$: Subject<void> = new Subject();

  private resizeHandler = () => this.myChart?.resize();

  constructor(
    @Optional() @Inject(CUSTOM_PAYLOAD_SERVICE) private configService: ICustomPayloadService,
    private globalFilterService: GlobalFilterService
  ) { }

  ngAfterViewInit(): void {
    this.globalFilterService.filter$
      .pipe(
        takeUntil(this.unSubscribe$),
        debounceTime(500), // small delay to batch rapid updates
        switchMap((filters) => this.loadAndRenderChart(filters))
      )
      .subscribe({
        next: (res: any) => {
          this.renderChart(res);
          this.addResizeListener();
        },
        error: () => {
          this.myChart.showLoading();
        },
      });
  }

  private loadAndRenderChart(filters?: any): any {
    const chartDom = document.getElementById(this.data?.widgetId);
    if (!chartDom) return;

    if (!this.myChart) {
      this.myChart = echarts.init(chartDom);
    }

    this.myChart.showLoading();
    return this.configService.getConfig(this.data.apiUrl, filters)
      .pipe(takeUntil(this.unSubscribe$))
  }

  private renderChart(chartData?: { category: string[]; series: any[] }): void {
    const apiResponse: any = chartData;

    const categories = [
      'PID',
      'TO',
      'EBU Disc',
      'CES DN',
      'CES Disc',
      'EBU + CES Imp',
      'DBU Cost',
      'DBU Mar',
      'DBU Imp',
      'DBU Out',
    ];

    // map category labels to series keys
    const labelToSeriesKey: Record<string, string> = {
      'TO': 'aco',
      'EBU Disc': 'ebu_disc',
      'CES DN': 'ces_dn',
      'CES Disc': 'ces_disc',
      'EBU + CES Imp': 'ebu_ces_imp',
      'DBU Mar': 'dbu_mar',
      'DBU Imp': 'dbu_imp',
    };

    let current = 0;
    const waterfallData: any[] = [
      ['barLabel', 'barStartValue', 'barEndValue', 'referenceDatapoint'],
    ];

    for (const cat of categories) {
      switch (cat) {
        case 'PID': {
          const pidValue = apiResponse?.base?.pid;
          waterfallData.push([cat, 0, pidValue, 2]);
          current = pidValue;
          break;
        }
        case 'DBU Cost': {
          const dbuBase = apiResponse?.base.dbu_prices?.dbu_current_price;
          const dbuDelta =
            apiResponse.base.dbu_prices.dbu_proposed_price - dbuBase;

          // stacked bars (reference base + delta)
          waterfallData.push([cat, 0, dbuBase, 2]);
          waterfallData.push([cat, dbuBase, dbuBase + dbuDelta, 1]);
          current = dbuBase + dbuDelta;
          break;
        }

        case 'DBU Out': {
          const finalBase = apiResponse?.base.final_prices?.current_price;
          const finalDelta =
            apiResponse.base.final_prices.proposed_price - finalBase;

          // stacked bars
          waterfallData.push(['DBU Out', 0, finalBase, 2]);
          waterfallData.push([
            'DBU Out',
            finalBase,
            finalBase + finalDelta,
            1,
          ]);
          break;
        }

        default: {
          const key = labelToSeriesKey[cat];
          const value = apiResponse?.series[key] || 0;
          const next = current + value;
          waterfallData.push([cat, current, next, 0]);
          current = next;
        }
      }
    }

    const dbuTotal = apiResponse.base.dbu_prices.dbu_proposed_price <= apiResponse.base.dbu_prices.dbu_current_price ? apiResponse.base.dbu_prices.dbu_current_price : apiResponse.base.dbu_prices.dbu_proposed_price;
    const finalTotal = apiResponse.base.final_prices.proposed_price <= apiResponse.base.final_prices.current_price ? apiResponse.base.final_prices.current_price : apiResponse.base.final_prices.proposed_price;
    const option = {
      tooltip: {
        trigger: 'item',


        formatter: (params: any) => {
          // Custom tooltip case (chart inside tooltip)
          if (
            this.data?.tooltip === 'custom' &&
            params.value[0] === 'EBU + CES Imp'
          ) {
            setTimeout(() => {
              this.renderTooltipChart(params, apiResponse.popover); // reuse helper
            }, 0);

            return `
      <div id="tooltip-chart" style="width:250px;height:300px;"></div>
      <div style="font-size:12px;color:#555;"></div>
    `;
          }

          // Safety check
          if (params.componentType !== 'series' || !Array.isArray(params.value)) {
            return '';
          }

          // For the main waterfall bars (seriesIndex 0)
          if (params.seriesIndex === 0) {
            if (params.value.length < 3) {
              return '';
            }
            const diff = params.value[2] - params.value[1];
            return `${params.value[0]}<br/>Value: ${oneDecimalWithCommas(diff)}`;
          }

          // For top labels on 'DBU Cost' and 'DBU Out' (seriesIndex 1)
          if (params.seriesIndex === 1) {
            if (params.value.length < 4) {
              return '';
            }
            const value = params.value[3]; // Raw value from data
            return `${params.value[0]}<br/>Value: ${oneDecimalWithCommas(value)}`;
          }

          return '';
        },

        backgroundColor: '#fafcfe',
      },
      dataset: {
        source: waterfallData,
      },
      xAxis: {
        type: 'category',
        axisLabel: {
          fontSize: 10,
          color: '#000',
          formatter: function (value: string) {
            return value.split(' ').join('\n');
          },
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },

      yAxis: {
        type: 'value',
        name: 'ESP ($)',
        axisLabel: {
          formatter: (value: number) => formatStat(value)
        },
        
        nameLocation: 'center',
        nameGap: 40,
        splitLine: { show: true },
      },
      grid: {
        right: '5%',
        left: '6%',
        containLabel: true,
      },
      series: [
        {
          type: 'custom',
          renderItem: (params: any, api: any) => {
            const barName = api.value(0);
            const barStart = api.value(1);
            const barEnd = api.value(2);
            const referenceType = api.value(3);

            const startCoord = api.coord([barName, barStart]);
            const endCoord = api.coord([barName, barEnd]);
            const barWidth = 40;
            let height = startCoord[1] - endCoord[1];
            height = Math.abs(height) < 3 && height !== 0 ? 3 : height;

            const style = api.style();
            if (referenceType === 1) {
              style.fill = '#8EC7FF'; // For stacked bars (e.g., proposed price on top)
            } else if (referenceType === 2) {
              style.fill = '#D3D3D3'; // For stacked bars (e.g., proposed price on top)
            } else if (barEnd - barStart < 0) {
              style.fill = '#F44336'; // red
            } else {
              style.fill = '#009B19'; // green
            }

            const shapes = [];

            // Main bar rectangle
            shapes.push({
              type: 'rect',
              shape: {
                x: endCoord[0] - barWidth / 2,
                y: endCoord[1],
                width: barWidth,
                height,
              },
              style,
            });

            return {
              type: 'group',
              children: shapes,
            };
          },

          encode: {
            x: 0,
            y: [1, 2],
          },
          datasetIndex: 0,
          label: {
            show: true,
            position: 'inside',
            formatter: (params: any) => {
              const value = params.value[2] - params.value[1];
              // return value.toLocaleString('en-US', {
              //   minimumFractionDigits: 0,
              //   maximumFractionDigits: 0,
              // });
              return formatStatOneDecimal(value);

            },
            fontSize: 10,
            fontWeight: 'bold',
            color: '#000',
          },
        },
        {
          type: 'custom',
          renderItem: function (params: any, api: any) {
            const categoryName = api.value(0);
            const value = api.value(1);
            const labelText = api.value(2);

            const coord = api.coord([categoryName, value]);

            return {
              type: 'text',
              style: {
                text: labelText,
                x: coord[0],
                y: coord[1] - 10,
                textAlign: 'center',
                textVerticalAlign: 'bottom',
                fontSize: 12,
                fontWeight: 'bold',
                fill: '#000',
              },
            };
          },
          encode: {
            x: 0,
            y: 1,
          },
          data: [
            [
              'DBU Cost',
              dbuTotal,
              formatStatOneDecimal(apiResponse.base.dbu_prices.dbu_proposed_price),
              apiResponse.base.dbu_prices.dbu_proposed_price
            ],
            [
              'DBU Out',
              finalTotal,
              formatStatOneDecimal(apiResponse.base.final_prices.proposed_price),
              apiResponse.base.final_prices.proposed_price
            ]
          ]

        }

      ],
      graphic: {
        elements: [
          {
            type: 'group',
            right: '0%',
            top: '0%',
            children: [
              {
                type: 'rect',
                shape: {
                  width: 100,
                  height: 42,
                  r: 8, // rounded corners
                },
                style: {
                  fill: '#eaf4ff',
                  stroke: '#999',
                  lineWidth: 1,
                  shadowBlur: 6,
                  shadowColor: 'rgba(0, 0, 0, 0.15)',
                  shadowOffsetX: 2,
                  shadowOffsetY: 2,
                },
              },
              {
                type: 'text',
                style: {
                  text: `Price Change\n${apiResponse.price_change.toFixed(1)}%`,
                  x: 50,
                  y: 25,
                  textAlign: 'center',
                  textVerticalAlign: 'middle',
                  font: 'bold 12px sans-serif',
                  fill: '#333',
                },
              },
            ],
          },
        ],
      },
    };
    this.myChart.setOption(option);
    setTimeout(() => {
      this.myChart.hideLoading();
    }, 1000);
  }


  private renderTooltipChart(params: any, popover: any) {
    const tooltipDom = document.getElementById('tooltip-chart');
    if (!tooltipDom) return;

    const tooltipChart = echarts.init(tooltipDom);

    const stackLabels = Object.keys(popover);
    const stackValues = Object.values(popover);

    const seriesData = stackValues.map((v, i) => ({
      type: 'bar',
      stack: 'total',
      name: stackLabels[i],
      barWidth: 50,
      data: [v],
      label: {
        show: true,
        position: 'inside',
        formatter: (val: any) => oneDecimalWithCommas(val.data),
        fontSize: 10,
        color: '#fff',
        fontWeight: 'bold'
      }
    }));

    tooltipChart.setOption({
      color: ['#00578A', '#424242', '#AB8B43', '#64AC97'],
      tooltip: { trigger: 'axis' },
      legend: {

        data: stackLabels,
        top: 0,
        textStyle: { fontSize: 10 },
        orient: 'horizontal',
        itemGap: 10,
        // formatter: (name: string) => name.replace(/_/g, ' ').toUpperCase()
        formatter: (name: string) => {
          const customMap: Record<string, string> = {
            pid_change: "PID Change ",
            pba_ebu: "PBA EBU",
            pba_ces: "PBA CES",
            option_change: "Option Change"
          };
          return customMap[name] || name;
        }
      },
      xAxis: {
        type: 'category',
        data: [params.value[0]],
      },
      yAxis: { type: 'value', show: false },
      series: seriesData,
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
