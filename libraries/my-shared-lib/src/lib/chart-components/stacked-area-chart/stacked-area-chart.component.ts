import { AfterViewInit, Component, Input, OnDestroy } from '@angular/core';
import * as echarts from 'echarts';
import { Subscription } from 'rxjs';
import { ConfigService } from '../../shared-services/config.service';
import { GlobalFilterService } from '../../shared-services/global-filter-service';

@Component({
  selector: 'app-stacked-area-chart',
  imports: [],
  templateUrl: './stacked-area-chart.component.html',
  styleUrl: './stacked-area-chart.component.scss'
})
export class StackedAreaChartComponent implements AfterViewInit, OnDestroy {
  @Input() data!: any;
  private myChart!: echarts.ECharts;
  private resizeHandler = () => this.myChart?.resize();

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


  private renderChart(chartData?: { category: string[]; series: any[] }): void {
    const series = chartData?.series.map((s: any) => ({
      name: s.name,
      type: s.type || 'line',
      stack: s.stack || 'Total',
      areaStyle: s.areaStyle || {},
      emphasis: { focus: 'series' },
      data: s.value
    }));

    const option = {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: series?.map(s => s.name)
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
      },
      yAxis: {
        type: 'value'
      },
      series
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