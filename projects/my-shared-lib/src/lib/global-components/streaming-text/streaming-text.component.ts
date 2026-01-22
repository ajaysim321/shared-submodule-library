import { Component, Input, OnChanges, SimpleChanges, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-streaming-text',
  standalone: true,
  imports: [CommonModule],
  template: '<div [innerHTML]="displayedContent"></div>',
})
export class StreamingTextComponent implements OnChanges {
  @Input() content: string = '';
  displayedContent: SafeHtml = '';
  private interval: any;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content']) {
      if (this.interval) {
        clearInterval(this.interval);
      }
      
      const newContent = changes['content'].currentValue || '';
      // Sanitize the full HTML content once
      const sanitizedContent = this.sanitizer.sanitize(SecurityContext.HTML, newContent);
      
      // Split into words for streaming effect. This is a simplification and might not perfectly handle all HTML.
      const words = (sanitizedContent || '').split(' ');
      let displayedWords: string[] = [];
      let i = 0;

      this.interval = setInterval(() => {
        if (i < words.length) {
          displayedWords.push(words[i]);
          this.displayedContent = this.sanitizer.bypassSecurityTrustHtml(displayedWords.join(' '));
          i++;
        } else {
          clearInterval(this.interval);
        }
      }, 50); // 50ms between words
    }
  }
}
