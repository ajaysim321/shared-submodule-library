import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicEditTableComponent } from './dynamic-edit-table.component';

describe('DynamicEditTableComponent', () => {
  let component: DynamicEditTableComponent;
  let fixture: ComponentFixture<DynamicEditTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicEditTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DynamicEditTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
