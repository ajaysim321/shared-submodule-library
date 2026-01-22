import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuadBubbleChartComponent } from './quad-bubble-chart.component';

describe('QuadBubbleChartComponent', () => {
  let component: QuadBubbleChartComponent;
  let fixture: ComponentFixture<QuadBubbleChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuadBubbleChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuadBubbleChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
