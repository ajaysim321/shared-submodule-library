import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { GlobalFilterService } from '../../shared-services/global-filter-service';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [MatButtonModule, CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {
  @Input() data!: any;
  @Input() selectedKey!: string;
  @Output() selectionChange = new EventEmitter<string>();

  constructor(private globalFilterService: GlobalFilterService) {}

  onClick(value: string) {
    this.selectionChange.emit(value); // Notify parent

    if (this.data && this.data?.key) {
      this.globalFilterService.updateFilterSelection(
        this.data?.type,
        [value],
        this.data.isQueryParam
      );
    }
  }

  isSelected(): boolean {
    return this.selectedKey === this.data.key;
  }
}
