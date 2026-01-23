import { AfterViewInit, Component, Input, OnDestroy } from '@angular/core';
import * as echarts from 'echarts';
import { ConfigService } from '../../shared-services/config.service';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
@Component({
  selector: 'app-bubble-chart',
  imports: [],
  standalone: true,
  templateUrl: './bubble-chart.component.html',
  styleUrl: './bubble-chart.component.scss'
})
export class BubbleChartComponent implements AfterViewInit, OnDestroy {
  @Input() data!: any;
  private myChart!: echarts.ECharts;

  constructor(
    private configService: ConfigService,
    private globalFilterService: GlobalFilterService
   ) {
    this.globalFilterService.filter$.subscribe((filters) => {
      if (Object.keys(filters).length !== 0) {
        this.loadAndRenderChart(filters);
      }
    });
  }

  ngAfterViewInit(): void {
    this.loadAndRenderChart();
  }

  private loadAndRenderChart(filters?: any): void {
    const chartDom = document.getElementById(this.data.widgetId);
    if (!chartDom) return;

    if (!this.myChart) {
      this.myChart = echarts.init(chartDom);
    }

    this.myChart.showLoading();

    this.configService.getConfig(this.data.apiUrl, filters).subscribe({
      next: (res) => {
        this.renderChart(res?.data);
        this.addResizeListener();
      },
      error: () => {
        this.myChart.showLoading();
      }
    });
  }

  private renderChart(chartData?: { points: any[] }): void {

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: function (params: any) {
          const [gdp, lifeExp, pop, country] = params.data;
          return `
          <strong>${country}</strong><br/>
          GDP: ${gdp}<br/>
          Life Expectancy: ${lifeExp}<br/>
          Population: ${pop}
        `;
        }
      },
      xAxis: {
        scale: true,
        min: 0
      },
      yAxis: {
        scale: true,
        min: 60
      },
      series: [
        {
          type: 'scatter',
          data: chartData?.points,
          symbolSize: function (data: any[]) {
            return Math.sqrt(data[2]) / 100;
          },
          emphasis: {
            focus: 'series',
            label: {
              show: true,
              formatter: (param: any) => param.data[3],
              position: 'top'
            }
          },
          itemStyle: { color: '#5470C6' }
        }
      ]
    };

    this.myChart.setOption(option);
    setTimeout(() => {
      this.myChart.hideLoading();
    }, 1000);
  }


  private addResizeListener(): void {
    window.addEventListener('resize', this.resizeChart);
  }
  private resizeChart = () => {
    this.myChart?.resize();
  };

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeChart);
    this.myChart?.dispose();
  }
}