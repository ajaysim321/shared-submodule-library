import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import * as echarts from 'echarts';
import { combineLatest, Subscription } from 'rxjs';
import { ConfigService } from '../../shared-services/config.service';

@Component({
  selector: 'app-count',
  imports: [],
  templateUrl: './count.component.html',
  styleUrl: './count.component.scss'
})
export class CountComponent  {
  @Input() data!: any;
  private myChart!: echarts.ECharts;

  private subscription!: Subscription;

  constructor(private configService: ConfigService) { }

  // ngAfterViewInit(): void {
  //   const chartDom = document.getElementById(this.data.widgetId);
  //   if (chartDom) {
  //     this.myChart = echarts.init(chartDom);
  //   }

  //   this.subscription = combineLatest([
  //     this.configService.selectionType$,
  //     this.configService.selectionValue$
  //   ]).subscribe(([type, value]) => {
  //     this.renderChart(type, value);
  //   });

  //   // Initial load
  //   // this.renderChart(
  //   //   this.configService.getSelectionType(),
  //   //   this.configService.getSelectedValue()
  //   // );

  //   this.addResizeListener();
  // }

  // private renderChart(type: 'year' | 'region', value: string | number): void {
  //   const config =
  //     type === 'year'
  //       ? this.data.chartDataByYear?.[value]
  //       : this.data.chartDataByRegion?.[value];

  //   if (!config) {
  //     console.warn('No step-line chart config found for', type, value);
  //     return;
  //   }

  //   this.configService.getConfig(config.apiUrl).subscribe((loadedData) => {
  //     const xAxis = this.resolvePath(loadedData, config.xAxis);
  //     const yAxis = config.yAxis;

  //     const series = config.series.map((s: any) => ({
  //       ...s,
  //       data: this.resolvePath(loadedData, s.dataKey)
  //     }));

  //     const option = {
  //       tooltip: { trigger: 'axis' },
  //       legend: {
  //         data: series.map((s: any) => s.name)
  //       },
  //       grid: {
  //         left: '3%',
  //         right: '4%',
  //         bottom: '3%',
  //         containLabel: true
  //       },
  //       xAxis,
  //       yAxis,
  //       series
  //     };

  //     this.myChart.setOption(option, true);
  //   });
  // }

  // private resolvePath(obj: any, path: string): any {
  //   return path.split('.').reduce((acc, part) => acc?.[part], obj);
  // }

  // private addResizeListener(): void {
  //   window.addEventListener('resize', this.handleResize);
  // }

  // private handleResize = (): void => {
  //   this.myChart?.resize();
  // };

  // ngOnDestroy(): void {
  //   window.removeEventListener('resize', this.handleResize);
  //   this.subscription?.unsubscribe();
  //   this.myChart?.dispose();
  // }
}