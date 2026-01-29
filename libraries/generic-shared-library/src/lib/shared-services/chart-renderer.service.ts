import { Injectable, ComponentFactoryResolver, ViewContainerRef } from '@angular/core';
import { NumberStatsComponent } from '../../../../my-app/src/app/number-stats/number-stats.component';
import { BarChartComponent } from '../chart-components/bar-chart/bar-chart.component';
import { LineChartComponent } from '../chart-components/line-chart/line-chart.component';
import { PieChartComponent } from '../chart-components/pie-chart/pie-chart.component';
import { BubbleChartComponent } from '../chart-components/bubble-chart/bubble-chart.component';
import { CountComponent } from '../chart-components/step-line-chart/count.component';
import { StackedAreaChartComponent } from '../chart-components/stacked-area-chart/stacked-area-chart.component';
import { WaterfallChartComponent } from '../chart-components/waterfall-chart/waterfall-chart.component';
import { QuadBubbleChartComponent } from '../chart-components/quad-bubble-chart/quad-bubble-chart.component';
import { DrillDownComponent } from '../chart-components/drill-down/drill-down.component';
import { HorizontalBarChartComponent } from '../chart-components/horizontal-bar-chart/horizontal-bar-chart.component';
import { TreemapChartComponent } from '../chart-components/treemap-chart/treemap-chart.component';
import { LineColumnChartComponent } from '../chart-components/line-column-chart/line-column-chart.component';
import { CombinedChartComponent } from '../chart-components/combined-chart/combined-chart.component';
import { MatSliderComponent } from '../global-components/mat-slider/mat-slider.component';
import { WaterfallStackChartComponent } from '../chart-components/waterfall-stack-chart/waterfall-stack-chart.component';
import { InputBoxComponent } from '../global-components/input-box/input-box.component';
import { TableComponent } from '../global-components/table/table.component';
import { EditableTableComponent } from '../chart-components/editable-table/editable-table.component';
import { StackBarChartComponent } from '../chart-components/stack-bar-chart/stack-bar-chart.component';
import { DynamicEditTableComponent } from '../chart-components/dynamic-edit-table/dynamic-edit-table.component';
import { UploadFileComponent } from '../chart-components/upload-file/upload-file.component';


@Injectable({
    providedIn: 'root'
})
export class ChartRendererService {
    constructor(private componentFactoryResolver: ComponentFactoryResolver) { }

    renderChart(
        type: string,
        viewContainerRef: ViewContainerRef,
        chartData: any
    ): void {
        viewContainerRef.clear();

        let component: any;

        switch (type) {
            case 'count':
                component = CountComponent;
                break;
            case 'line-chart':
                component = LineChartComponent;
                break;
            case 'bar-chart':
                component = BarChartComponent;
                break;
            case 'pie-chart':
                component = PieChartComponent;
                break;
            case 'number-stats':
                component = NumberStatsComponent;
                break;
            case 'bubble-chart':
                component = BubbleChartComponent;
                break;
            case 'stacked-area-chart':
                component = StackedAreaChartComponent;
                break;
            case 'waterfall-chart':
                component = WaterfallChartComponent;
                break;
            case 'quad-bubble-chart':
                component = QuadBubbleChartComponent;
                break;
            case 'drill-down':
                component = DrillDownComponent;
                break;
            case 'horizontal-bar-chart':
                component = HorizontalBarChartComponent;
                break;    
            case 'treemap-chart':
                component = TreemapChartComponent;
                break; 
            case 'line-column-chart':
                component = LineColumnChartComponent;
                break;  
            case 'slider':
                component = MatSliderComponent;
                break;
            case 'combined-chart':
                component = CombinedChartComponent;
                break;  
            case 'waterfall-stack':
                component = WaterfallStackChartComponent;
                break;     
            case 'input-box':
                component = InputBoxComponent;
                break;  
            case 'editable-table':
                component = EditableTableComponent;
                break;
            case 'table':
                component = TableComponent;
                break; 
            case 'stack-bar-chart':
                component = StackBarChartComponent;
                break;
                 case 'dynamic-edit-table':
                component = DynamicEditTableComponent;
                break;  
            case 'upload-file':
                component = UploadFileComponent;
                break;      
            default:
                console.error(`Unknown chart type: ${type}`);
                return;
        }

        const componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
        const componentRef = viewContainerRef.createComponent(componentFactory);

        if (componentRef.instance) {
            (componentRef.instance as any).data = chartData;
        }
    }
}
