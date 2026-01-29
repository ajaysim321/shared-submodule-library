import {Component, EventEmitter, Output} from '@angular/core';
import {MatPaginatorModule, PageEvent} from '@angular/material/paginator';

@Component({
  selector: 'app-paginator',
  imports: [MatPaginatorModule],
  templateUrl: './paginator.component.html',
  styleUrl: './paginator.component.scss'
})
export class PaginatorComponent {
  
    length: number = 0;
    pageSize: number = 11;
    pageIndex: number = 0;
 @Output() pageChange = new EventEmitter<PageEvent>();

  onPageChange(event: PageEvent) {
    this.pageIndex = event?.pageIndex;
    this.pageSize = event?.pageSize;
    this.pageChange.emit(event);
  }

  updatePagination(length: number, pageIndex: number) {
    this.length = length;
    this.pageIndex = pageIndex;
  }

}
