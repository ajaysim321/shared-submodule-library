import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-data-error',
  imports: [MatIconModule],
  templateUrl: './data-error.component.html',
  styleUrl: './data-error.component.scss'
})
export class DataErrorComponent {

   @Input() message: string = 'No data found';
  @Input() icon: string = 'bar_chart';
}
