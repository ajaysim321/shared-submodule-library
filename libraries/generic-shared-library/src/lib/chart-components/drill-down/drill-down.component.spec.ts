import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DrillDownComponent } from './drill-down.component';

describe('DrillDownComponent', () => {
  let component: DrillDownComponent;
  let fixture: ComponentFixture<DrillDownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrillDownComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DrillDownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
