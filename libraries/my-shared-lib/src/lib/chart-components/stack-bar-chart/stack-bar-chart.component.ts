import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, OnDestroy } from '@angular/core';
import * as echarts from 'echarts';
import { ConfigService } from '../../shared-services/config.service';
import { GlobalFilterService } from '../../shared-services/global-filter-service';

@Component({
  selector: 'app-stack-bar-chart',
  imports: [CommonModule],
  templateUrl: './stack-bar-chart.component.html',
  styleUrl: './stack-bar-chart.component.scss'
})
export class StackBarChartComponent implements AfterViewInit, OnDestroy {

  @Input() data!: any; // widget config containing widgetId, apiUrl, title, etc.
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
    // Wait for the div to render
    setTimeout(() => this.loadAndRenderChart(), 0);
  }

  private loadAndRenderChart(filters?: any): void {
    const chartDom = document.getElementById(this.data?.widgetId || '');
    if (!chartDom) {
      console.warn('Chart DOM not found:', this.data?.widgetId);
      return;
    }

    if (!this.myChart) {
      this.myChart = echarts.init(chartDom);
    }

    this.myChart.showLoading();

    if (this.data?.data) {
      // Static data provided in config
      this.initChart(this.data.data);
    } else if (this.data?.apiUrl) {
      // Fetch from API or local JSON
      this.configService.getConfig(this.data.apiUrl, filters).subscribe({
        next: (res) => this.initChart(res?.data),
        error: () => this.myChart.hideLoading()
      });
    } else {
      this.myChart.hideLoading();
      console.warn('No data or apiUrl provided for widget:', this.data?.widgetId);
    }

    this.addResizeListener();
  }

  private initChart(chartData?: { category: string[]; series: any[] }): void {
    if (!chartData) {
      console.warn('No chart data found for widget:', this.data?.widgetId);
      return;
    }

    const option = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: chartData.series.map(s => s.name) },
      xAxis: { type: 'category', data: chartData.category },
      yAxis: { type: 'value' },
      series: chartData.series.map(s => ({
        name: s.name,
        type: 'bar',
        stack: 'total',
        emphasis: { focus: 'series' },
        data: s.data
      }))
    };

    this.myChart.setOption(option);
    this.myChart.hideLoading();
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
