import { AfterViewInit, Component, Input, OnDestroy, OnInit } from '@angular/core';
import * as echarts from 'echarts';
import { ConfigService } from '../../shared-services/config.service';
import { GlobalFilterService } from '../../shared-services/global-filter-service';

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [],
  templateUrl: './line-chart.component.html',
  styleUrl: './line-chart.component.scss'
})
export class LineChartComponent implements AfterViewInit, OnDestroy {
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
    const chartDom = document.getElementById(this.data?.widgetId);
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

  private renderChart(chartData?: { category: string[]; value: number[] }): void {
    const option = {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: chartData?.category || []
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          type: 'line',
          data: chartData?.value || [],
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: '#91cc75' }
        }
      ]
    };

    this.myChart.setOption(option);
    setTimeout(() => this.myChart.hideLoading(), 1000);
  }

  private addResizeListener(): void {
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.myChart?.resize();
  };

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleResize);
    this.myChart?.dispose();
  }
}