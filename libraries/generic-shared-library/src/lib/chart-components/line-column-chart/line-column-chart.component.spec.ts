import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineColumnChartComponent } from './line-column-chart.component';

describe('LineColumnChartComponent', () => {
  let component: LineColumnChartComponent;
  let fixture: ComponentFixture<LineColumnChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineColumnChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LineColumnChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
