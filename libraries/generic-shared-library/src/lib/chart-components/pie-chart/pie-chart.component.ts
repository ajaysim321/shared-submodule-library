import { AfterViewInit, Component, inject, Input, OnDestroy } from '@angular/core';
import * as echarts from 'echarts';
import { ConfigService } from '../../shared-services/config.service';
import { GlobalFilterService } from '../../shared-services/global-filter-service';

@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.scss']
})
export class PieChartComponent implements AfterViewInit, OnDestroy {
  @Input() data!: any;
  private myChart!: echarts.ECharts;
  private resizeHandler = () => this.myChart?.resize();

  protected configService = inject(ConfigService);
  protected globalFilterService = inject(GlobalFilterService);

  constructor() {
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

  private renderChart(chartData?: [{ name: string; value: number }]): void {
    const option = {
      title: {
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
      },
      series: [
        {
          name: this.data.title || '',
          type: 'pie',
          radius: '50%',
          data: chartData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };

    this.myChart.setOption(option);
    setTimeout(() => {
      this.myChart.hideLoading();
    }, 1000);
  }

  private addResizeListener(): void {
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.myChart?.resize();
  };

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.myChart?.dispose();
  }
}
