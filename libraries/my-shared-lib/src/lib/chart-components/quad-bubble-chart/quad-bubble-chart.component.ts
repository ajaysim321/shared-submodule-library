import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as echarts from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';
import * as ecStatRaw from 'echarts-stat';

const ecStat: any = ecStatRaw;

@Component({
  selector: 'app-quad-bubble-chart',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgxEchartsModule,
    CommonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './quad-bubble-chart.component.html',
  styleUrl: './quad-bubble-chart.component.scss'
})
export class QuadBubbleChartComponent implements AfterViewInit, OnDestroy {
  @Input() data!: any;
  private chart!: echarts.ECharts;

  ngAfterViewInit(): void {
    const chartDom = document.getElementById(this.data.widgetId);
    if (chartDom) {
      this.chart = echarts.init(chartDom);
      this.renderChart();
      window.addEventListener('resize', this.resizeChart);
    }
  }

  private renderChart(): void {
    echarts.registerTransform(ecStat.transform.clustering);

    const raw = this.resolvePath(this.data, this.data.series);
    const clusterCount = this.data.clusterCount || 4;
    const symbolSize = this.data.symbolSize || 15;

    const points: number[][] = [
      ...(raw?.q1 ?? []),
      ...(raw?.q2 ?? []),
      ...(raw?.q3 ?? []),
      ...(raw?.q4 ?? [])
    ];

    const dimensionClusterIndex = 2;

    const COLOR_ALL = [
      '#37A2DA', '#e06343', '#37a354',
      '#b55dba', '#b5bd48', '#8378EA', '#96BFFF'
    ];

    const option: echarts.EChartsOption = {
      dataset: [
        { source: points },
        {
          transform: {
            type: 'ecStat:clustering',
            config: {
              clusterCount,
              outputType: 'single',
              outputClusterIndexDimension: dimensionClusterIndex
            }
          }
        }
      ],
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => `x: ${params.data[0]}, y: ${params.data[1]}`
      },
      visualMap: {
        type: 'piecewise',
        dimension: dimensionClusterIndex,
        selectedMode: 'multiple',
        pieces: Array.from({ length: clusterCount }, (_, i) => ({
          value: i,
          label: `Cluster ${i}`,
          color: COLOR_ALL[i]
        }))
      },
      xAxis: {
        min: this.data.xAxis?.min ?? 0,
        max: this.data.xAxis?.max ?? 10,
        splitLine: { show: false }
      },
      yAxis: {
        min: this.data.yAxis?.min ?? 0,
        max: this.data.yAxis?.max ?? 10,
        splitLine: { show: false }
      },
      grid: { left: 60, right: 20, top: 20, bottom: 30 },
      series: [
        {
          type: 'scatter',
          datasetIndex: 1,
          encode: { tooltip: [0, 1] },
          symbolSize,
          itemStyle: {
            borderColor: 'transparent'
          },
          markArea: {
            silent: true,
            itemStyle: { opacity: 0.2 },
            data: this.getQuadrantAreas()
          }
        }
      ]
    };

    this.chart.setOption(option);
  }

  private getQuadrantAreas(): any[] {
    return (this.data.quadrantBackgrounds || []).map((quad: any) => ([
      {
        name: '',
        xAxis: quad.xAxis,
        yAxis: quad.yAxis,
        itemStyle: { color: quad.color }
      },
      {
        xAxis: quad.x2,
        yAxis: quad.y2
      }
    ]));
  }

  private resolvePath(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => (o ? o[key] : undefined), obj);
  }

  private resizeChart = () => {
    this.chart?.resize();
  };

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeChart);
    this.chart?.dispose();
  }
}