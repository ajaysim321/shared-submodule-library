import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../../shared-services/config.service';
import { GlobalFilterService } from '../../shared-services/global-filter-service';
import { MatError } from '@angular/material/input';

@Component({
  selector: 'app-mat-slider',
  standalone: true,
  imports: [CommonModule, MatSliderModule, FormsModule, MatInputModule,],
  templateUrl: './mat-slider.component.html',
  styleUrl: './mat-slider.component.scss',
})
export class MatSliderComponent implements OnInit {
  @Input() data!: any; // input like bar-chart
  @Output() valueChange = new EventEmitter<{ start: number; end: number }>();

  min!: number;
  max!: number;
  step!: number;
  label!: string;

  rangeStart!: number;
  rangeEnd!: number;
  errorMsg: string = '';

  initialRangeStart!: number;
  initialRangeEnd!: number;

  constructor(
    private http: HttpClient,
    private configService: ConfigService,
    private globalFilterService: GlobalFilterService
  ) { }

  ngOnInit() {
    if (!this.data) {
      console.error('Slider data not provided');
      return;
    }

    this.configService.getConfig(this.data?.apiUrl, null, this.data?.method).subscribe({
      next: (res) => {
        this.min = res?.data?.min;
        this.max = res?.data?.max;
        this.step = res?.data?.step;
        this.label = res?.data?.name ?? 'Slider';

        // Take rangeStart from config and fix it
        this.rangeStart = res?.data?.rangeStart ?? this.min;
        this.rangeEnd = res?.data?.rangeEnd ?? this.max;

        this.initialRangeStart = this.rangeStart;
        this.initialRangeEnd = this.rangeEnd;
      },
      error: (err) => {
        console.error(err);
      },
    });
  }


reset() {
  this.rangeStart = this.initialRangeStart;
  this.rangeEnd = this.initialRangeEnd;
  this.errorMsg = '';
  this.onRangeChange();
}

  validateAndEmit() {
    const value = Number(this.rangeEnd);

    if (
      value === null ||
      value === undefined ||
      isNaN(value) ||
      value <= this.min || // Exclude min
      value > this.max
    ) {
      this.errorMsg = `Please enter a value between ${this.min + 1} and ${this.max}`;
      return;
    }

    this.errorMsg = '';
    this.onRangeChange();
  }

  onRangeChange() {
    const value = Number(this.rangeEnd);

    if (
      value === null ||
      value === undefined ||
      isNaN(value) ||
      value <= this.min || // Exclude min
      value > this.max
    ) {
      return;
    }

    this.valueChange.emit({ start: this.rangeStart, end: this.rangeEnd });

    if (this.data?.key) {
      this.globalFilterService.updateFilterSelection(
        this.data.key,
        [this.rangeStart, this.rangeEnd],
        this.data.isQueryParam
      );
    }
  }
}
