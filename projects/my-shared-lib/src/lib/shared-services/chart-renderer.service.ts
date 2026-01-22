import { Injectable, ViewContainerRef, Type, InjectionToken, Inject, Optional } from '@angular/core';
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
import { ChatComponent } from '../global-components/chat/chat.component';

/**
 * Injection token for custom component overrides
 * Consuming applications can provide additional components via this token
 */
export const CUSTOM_WIDGET_COMPONENTS = new InjectionToken<Record<string, Type<any>>>('CUSTOM_WIDGET_COMPONENTS');


// Built-in component map for shared library components
const BUILT_IN_COMPONENTS: Record<string, Type<any>> = {
    'count': CountComponent,
    'line-chart': LineChartComponent,
    'bar-chart': BarChartComponent,
    'pie-chart': PieChartComponent,
    'bubble-chart': BubbleChartComponent,
    'stacked-area-chart': StackedAreaChartComponent,
    'waterfall-chart': WaterfallChartComponent,
    'quad-bubble-chart': QuadBubbleChartComponent,
    'drill-down': DrillDownComponent,
    'horizontal-bar-chart': HorizontalBarChartComponent,
    'treemap-chart': TreemapChartComponent,
    'line-column-chart': LineColumnChartComponent,
    'combined-chart': CombinedChartComponent,
    'slider': MatSliderComponent,
    'waterfall-stack': WaterfallStackChartComponent,
    'input-box': InputBoxComponent,
    'editable-table': EditableTableComponent,
    'table': TableComponent,
    'stack-bar-chart': StackBarChartComponent,
    'dynamic-edit-table': DynamicEditTableComponent,
    'upload-file': UploadFileComponent,
    'chat': ChatComponent,
};

@Injectable({
    providedIn: 'root'
})
export class ChartRendererService {
    constructor(
        @Optional() @Inject(CUSTOM_WIDGET_COMPONENTS) private customComponents: Record<string, Type<any>>
    ) { }

    renderChart(
        type: string,
        viewContainerRef: ViewContainerRef,
        chartData: any
    ): void {
        viewContainerRef.clear();

        // Check custom components first (allows overriding built-in components)
        let component = this.customComponents?.[type] || BUILT_IN_COMPONENTS[type];

        if (!component) {
            console.error(`Unknown chart type: ${type}. Make sure to provide it via CUSTOM_WIDGET_COMPONENTS injection token.`);
            return;
        }

        const componentRef = viewContainerRef.createComponent(component);

        if (componentRef.instance) {
            (componentRef.instance as any).data = chartData;
        }
    }
}
