import { Type } from '@angular/core';

/**
 * Widget Type Configuration
 * Maps widget type names (used in JSON config) to their component loaders.
 * 
 * When adding a new widget:
 * 1. Add the widget type to the WidgetType union below
 * 2. Add the loader to SHARED_WIDGET_MAP
 * 
 * When overriding a widget:
 * 1. Create component in projects/custom/components/<widget-type>/
 * 2. Name the component file: <widget-type>.component.ts
 * 3. Export the class as: <PascalCase>Component
 * 4. The widget renderer will automatically use your custom component
 */

// ============================================================================
// WIDGET TYPE DEFINITIONS
// ============================================================================

/**
 * All available widget types that can be used in dashboard-config.json
 * 
 * Usage in JSON:
 *   { "type": "<widget-type>", ... }
 */
export type WidgetType =
  // Chart Components
  | 'bar-chart'
  | 'line-chart'
  | 'pie-chart'
  | 'bubble-chart'
  | 'stacked-area-chart'
  | 'waterfall-chart'
  | 'waterfall-stack'
  | 'quad-bubble-chart'
  | 'drill-down'
  | 'horizontal-bar-chart'
  | 'treemap-chart'
  | 'line-column-chart'
  | 'combined-chart'
  | 'stack-bar-chart'
  | 'count'
  // Data Components
  | 'number-stats'
  | 'table'
  | 'editable-table'
  | 'dynamic-edit-table'
  // Input Components
  | 'slider'
  | 'input-box'
  | 'radio-button'
  | 'upload-file'
  // Interactive Components
  | 'chat';

// ============================================================================
// COMPONENT LOADER TYPE
// ============================================================================

export type WidgetComponentLoader = () => Promise<Type<any>>;

export interface WidgetMapEntry {
  loader: WidgetComponentLoader;
  description: string;
}

// ============================================================================
// SHARED WIDGET MAP - All components from my-shared-lib
// ============================================================================

/**
 * Shared widget map containing all components available in the shared library.
 * Components marked as 'REQUIRES_OVERRIDE' need to be provided by the consuming app.
 *
 * To provide custom components, use the CUSTOM_WIDGET_COMPONENTS injection token
 * in your app's providers.
 */
export const SHARED_WIDGET_MAP: Partial<Record<WidgetType, WidgetMapEntry>> = {
  // Chart Components
  'bar-chart': {
    loader: () => import('../chart-components/bar-chart/bar-chart.component').then(m => m.BarChartComponent),
    description: 'Vertical bar chart for comparing categories'
  },
  'line-chart': {
    loader: () => import('../chart-components/line-chart/line-chart.component').then(m => m.LineChartComponent),
    description: 'Line chart for trends over time'
  },
  'pie-chart': {
    loader: () => import('../chart-components/pie-chart/pie-chart.component').then(m => m.PieChartComponent),
    description: 'Pie/donut chart for proportions'
  },
  'bubble-chart': {
    loader: () => import('../chart-components/bubble-chart/bubble-chart.component').then(m => m.BubbleChartComponent),
    description: 'Bubble chart for 3-dimensional data'
  },
  'stacked-area-chart': {
    loader: () => import('../chart-components/stacked-area-chart/stacked-area-chart.component').then(m => m.StackedAreaChartComponent),
    description: 'Stacked area chart for cumulative trends'
  },
  'waterfall-chart': {
    loader: () => import('../chart-components/waterfall-chart/waterfall-chart.component').then(m => m.WaterfallChartComponent),
    description: 'Waterfall chart for sequential value changes'
  },
  'waterfall-stack': {
    loader: () => import('../chart-components/waterfall-stack-chart/waterfall-stack-chart.component').then(m => m.WaterfallStackChartComponent),
    description: 'Stacked waterfall chart'
  },
  'quad-bubble-chart': {
    loader: () => import('../chart-components/quad-bubble-chart/quad-bubble-chart.component').then(m => m.QuadBubbleChartComponent),
    description: 'Quadrant bubble chart with 4 regions'
  },
  'drill-down': {
    loader: () => import('../chart-components/drill-down/drill-down.component').then(m => m.DrillDownComponent),
    description: 'Drill-down chart for hierarchical data'
  },
  'horizontal-bar-chart': {
    loader: () => import('../chart-components/horizontal-bar-chart/horizontal-bar-chart.component').then(m => m.HorizontalBarChartComponent),
    description: 'Horizontal bar chart'
  },
  'treemap-chart': {
    loader: () => import('../chart-components/treemap-chart/treemap-chart.component').then(m => m.TreemapChartComponent),
    description: 'Treemap for hierarchical proportional data'
  },
  'line-column-chart': {
    loader: () => import('../chart-components/line-column-chart/line-column-chart.component').then(m => m.LineColumnChartComponent),
    description: 'Combined line and column chart'
  },
  'combined-chart': {
    loader: () => import('../chart-components/combined-chart/combined-chart.component').then(m => m.CombinedChartComponent),
    description: 'Multi-type combined chart'
  },
  'stack-bar-chart': {
    loader: () => import('../chart-components/stack-bar-chart/stack-bar-chart.component').then(m => m.StackBarChartComponent),
    description: 'Stacked bar chart'
  },
  'count': {
    loader: () => import('../chart-components/step-line-chart/count.component').then(m => m.CountComponent),
    description: 'Count/step display component'
  },

  // Data Components - 'number-stats' must be provided by consuming app via CUSTOM_WIDGET_COMPONENTS
  'table': {
    loader: () => import('../global-components/table/table.component').then(m => m.TableComponent),
    description: 'Data table display'
  },
  'editable-table': {
    loader: () => import('../chart-components/editable-table/editable-table.component').then(m => m.EditableTableComponent),
    description: 'Editable data table'
  },
  'dynamic-edit-table': {
    loader: () => import('../chart-components/dynamic-edit-table/dynamic-edit-table.component').then(m => m.DynamicEditTableComponent),
    description: 'Dynamic editable table with add/remove rows'
  },

  // Input Components - 'radio-button' must be provided by consuming app via CUSTOM_WIDGET_COMPONENTS
  'slider': {
    loader: () => import('../global-components/mat-slider/mat-slider.component').then(m => m.MatSliderComponent),
    description: 'Range slider input'
  },
  'input-box': {
    loader: () => import('../global-components/input-box/input-box.component').then(m => m.InputBoxComponent),
    description: 'Text input box'
  },
  'upload-file': {
    loader: () => import('../chart-components/upload-file/upload-file.component').then(m => m.UploadFileComponent),
    description: 'File upload component'
  },

  // Interactive Components
  'chat': {
    loader: () => import('../global-components/chat/chat.component').then(m => m.ChatComponent),
    description: 'AI chat assistant component'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all available widget types
 */
export function getAvailableWidgetTypes(): WidgetType[] {
  return Object.keys(SHARED_WIDGET_MAP) as WidgetType[];
}

/**
 * Check if a widget type is valid
 */
export function isValidWidgetType(type: string): type is WidgetType {
  return type in SHARED_WIDGET_MAP;
}

/**
 * Get widget description for documentation
 */
export function getWidgetDescription(type: WidgetType): string {
  return SHARED_WIDGET_MAP[type]?.description ?? 'Unknown widget type';
}
