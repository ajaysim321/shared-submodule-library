import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaterfallStackChartComponent } from './waterfall-stack-chart.component';

describe('WaterfallStackChartComponent', () => {
  let component: WaterfallStackChartComponent;
  let fixture: ComponentFixture<WaterfallStackChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaterfallStackChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WaterfallStackChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
