// input-box.component.ts
import { Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-input-box',
  templateUrl: './input-box.component.html'
})
export class InputBoxComponent {
  @Input() label!: string;
  @Input() placeholder!: string;
  @Input() formControl!: FormControl;
}
