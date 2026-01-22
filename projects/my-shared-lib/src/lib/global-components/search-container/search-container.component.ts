import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-search-container',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './search-container.component.html',
  styleUrls: ['./search-container.component.scss']
})
export class SearchContainerComponent {
  @Input() data: any;
  @Output() search = new EventEmitter<string>();

  searchTerm = '';
  private debounceTimer: any;
  private lastEmittedValue = '';

  onTyping() {
    clearTimeout(this.debounceTimer);

    // Emit if user stops typing after 500ms
    this.debounceTimer = setTimeout(() => {
      this.emitSearch();
    }, 500);
  }

  emitSearch(event?: any) {
  if (event?.preventDefault) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (this.searchTerm !== this.lastEmittedValue) {
    this.lastEmittedValue = this.searchTerm;
    this.search.emit(this.searchTerm);
  }
}



  clearSearch(): void {
    this.searchTerm = '';
    this.lastEmittedValue = '';
    this.search.emit('');
  }
}


