import { AfterViewInit, Component, Input, OnDestroy } from '@angular/core';
import * as echarts from 'echarts';
import { Subscription } from 'rxjs';
import { ConfigService } from '../../shared-services/config.service';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import { DataErrorComponent } from '../../global-components/data-error/data-error.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-waterfall-chart',
  imports: [DataErrorComponent,CommonModule],
  templateUrl: './waterfall-chart.component.html',
  styleUrl: './waterfall-chart.component.scss'
})
export class WaterfallChartComponent implements AfterViewInit, OnDestroy {
  @Input() data!: any;
  private myChart!: echarts.ECharts;
  private subscription!: Subscription;
  private resizeHandler = () => this.myChart?.resize();
  public hasError = false;
  public errorMessage = '';

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
      const chartData = res?.data;

      const isEmpty = !chartData || (Array.isArray(chartData) && chartData.length === 0);

      if (isEmpty) {
        this.hasError = true;
        this.errorMessage = 'No data found for the selected filters.';
        this.myChart.clear();
      } else {
        this.hasError = false;
        this.renderChart(chartData);
        this.addResizeListener();
      }

      this.myChart.hideLoading();
    },
    error: () => {
      this.hasError = true;
      this.errorMessage = 'No data available for the chart.';
      this.myChart?.clear();
      this.myChart.hideLoading();
    }
  });
}


  private renderChart(chartData?: { category: string[]; series: any[] }): void {

    const option = {
      title: {
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function (params: any) {
          let tar;
          if (params[1] && params[1].value !== '-') {
            tar = params[1];
          } else {
            tar = params[2];
          }
          return `${tar.name}<br/>${tar.seriesName} : ${tar.value}`;
        }
      },
      legend: {
        data: ['Expenses', 'Income']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
      },
      yAxis: {
        type: 'value'
      },
      series: chartData?.series
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
    window.removeEventListener('resize', this.handleResize);
    this.myChart?.dispose();
  }
}