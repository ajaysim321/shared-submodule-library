import { Component, OnInit, OnDestroy, Input, HostBinding, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { ChatApiService } from '../../shared-services/chat-api.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DynamicEditTableComponent } from '../../chart-components/dynamic-edit-table/dynamic-edit-table.component';
import { StreamingTextComponent } from '../streaming-text/streaming-text.component';



interface Message {
  text: string;
  sender: 'user' | 'agent';
  files?: File[];
  type?: 'text' | 'table' | 'option' | 'json';
  data?: any;
  formattedText?: string;
  rawJson?: string;
  copied?: boolean;
  loading?: boolean;
  completed?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule, DynamicEditTableComponent, StreamingTextComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild(DynamicEditTableComponent) private dynamicEditTable?: DynamicEditTableComponent;
  @ViewChild('chatBody') private chatBody!: ElementRef;

  messages: Message[] = [];
  currentMessage = '';
  isLoading = false;
  selectedFiles: File[] = [];
  isDarkTheme = false;

  private subscriptions = new Subscription();
  private previousMessageCount = 0;

  constructor(
    private chatApiService: ChatApiService
  ){}

  ngOnInit(): void {
    if (this.messages.length === 0) {
      this.messages.push({ text: 'Hello! How can I help you today?', sender: 'agent' });
    }
    this.chatApiService.createSession().then(observable => {
      observable.subscribe({
        next: response => console.log('Session created:', response),
        error: error => console.error('Error creating session:', error)
      });
    });
  }

  ngAfterViewChecked() {
    if (this.messages.length !== this.previousMessageCount) {
      this.scrollToBottom();
      this.previousMessageCount = this.messages.length;
    }
  }

  toggleTheme(): void {
  this.isDarkTheme = !this.isDarkTheme;

  if (this.isDarkTheme) {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
}


  scrollToBottom(): void {
    try {
      setTimeout(() => this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight, 0);
    } catch(err) { }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  startNewSession(): void {
    this.messages = [];
    // this.messages.push({ text: 'Hello! How can I help you today?', sender: 'agent' });
    this.chatApiService.createSession().then(observable => {
      observable.subscribe({
        next: response => console.log('New session created:', response),
        error: error => console.error('Error creating new session:', error)
      });
    });
    this.scrollToBottom();
  }

  sendMessageOnEnter(event: Event | KeyboardEvent): void {
    const keyboardEvent = event as KeyboardEvent; // cast to KeyboardEvent
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.sendMessage();
    }
  }

  formatText(text: string): string {
    let formatted = text;
    // bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong></strong>');
    // italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em></em>');

    // Convert hyphenated lists to HTML unordered lists
    // First, convert each hyphenated line to an <li> tag
    // This handles cases where a list starts on a new line or at the beginning of the text
    formatted = formatted.replace(/^-\s(.+)$/gm, '<li></li>');

    // Then, wrap consecutive <li> tags in a <ul> tag
    // The regex ensures that <ul></ul> wraps only blocks of <li> elements
    formatted = formatted.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul></ul>');

    return formatted;
  }

  sendMessage(): void {
    if ((!this.currentMessage.trim() && this.selectedFiles.length === 0) || this.isLoading) {
      return;
    }

    let tableData: any[] | undefined;
    if (this.dynamicEditTable && this.dynamicEditTable.isTableEditable()) {
      tableData = this.dynamicEditTable.getTableData();

      // Find and remove the last message containing the table
      const tableMessageIndex = this.messages.map(m => m.type).lastIndexOf('table');
      if (tableMessageIndex > -1) {
        this.messages.splice(tableMessageIndex, 1);
      }
    }

    let jsonData: any | undefined;
    const jsonMessageIndex = this.messages.map(m => m.type).lastIndexOf('json');
    if (jsonMessageIndex > -1) {
      const jsonMessage = this.messages[jsonMessageIndex];
      try {
        if (jsonMessage.rawJson) {
          jsonData = JSON.parse(jsonMessage.rawJson);
        }
        this.messages.splice(jsonMessageIndex, 1);
      } catch (e) {
        console.error('Invalid JSON format:', e);
        // Optionally, show an error message to the user in the chat
        this.messages.push({ text: 'Error: Invalid JSON format. Please correct it before sending.', sender: 'agent' });
        return;
      }
    }

    const userMessage: Message = {
      text: this.currentMessage,
      sender: 'user',
      files: [...this.selectedFiles],
    };

    this.messages.push(userMessage);
    const messageToApi = this.currentMessage.trim();
    this.currentMessage = '';
    this.selectedFiles = [];
    this.isLoading = true;

    const turnStartIndex = this.messages.length;
    let accumulatedResponse = '';

    this.chatApiService.sendMessage(messageToApi, tableData, jsonData).then(observable => {
      const apiSub = observable.subscribe({
        next: (chunk: string) => {
          accumulatedResponse += chunk;
          const parts = accumulatedResponse.split('\n');
          accumulatedResponse = parts.pop() || '';

          for (const part of parts) {
            if (part.startsWith('data: ')) {
              const dataString = part.substring(6);
              if (dataString) {
                try {
                  const parsedData = JSON.parse(dataString);
                  if (parsedData.content?.parts) {
                    this.messages.length = turnStartIndex;

                    let textPartContent = '';
                    let listPartHtml = '';
                    let tablePartMessage: Message | null = null;

                    for (const contentPart of parsedData.content.parts) {
                      if (contentPart.text) {
                        if (contentPart.text.startsWith('```json')) {
                          const jsonString = contentPart.text.replace(/^```json\n/, '').replace(/\n```$/, '');
                          try {
                            const jsonData = JSON.parse(jsonString);
                            const jsonMessage: Message = {
                              text: '',
                              sender: 'agent',
                              type: 'json',
                              data: jsonData,
                              rawJson: JSON.stringify(jsonData, null, 2)
                            };
                            this.messages.push(jsonMessage);

                          } catch (e) {
                            console.error('Failed to parse JSON from message:', e);
                            textPartContent += contentPart.text; // Fallback to show as plain text
                          }
                        } else if (contentPart.text.startsWith('__STRUCTURED_DATA__:')) {
                          const base64Data = contentPart.text.substring('__STRUCTURED_DATA__:'.length);
                          try {
                            const decodedData = atob(base64Data);
                            const inlineJson = JSON.parse(decodedData);

                            if (inlineJson.type === 'table' && inlineJson.content) {
                              const headers = inlineJson.content.headers;
                              const transformedRows = inlineJson.content.rows.map((row: any[]) => {
                                const rowObject: { [key: string]: any } = {};
                                headers.forEach((header: string, index: number) => {
                                  rowObject[header] = row[index];
                                });
                                return rowObject;
                              });
                              tablePartMessage = {
                                text: '',
                                sender: 'agent',
                                type: 'table',
                                data: {
                                  headers: headers.map((h: string) => ({ key: h })),
                                  rows: transformedRows
                                }
                              };
                            } else if (inlineJson.type === 'list' && inlineJson.content?.items) {
                              let listHtml = '<ul>';
                              for (const item of inlineJson.content.items) {
                                listHtml += `<li><strong>${item.text}</strong><br><small>${item.subtext}</small></li>`;
                              }
                              listHtml += '</ul>';
                              listPartHtml += listHtml;
                            }
                          } catch (e) {
                            console.error('Error processing structured data:', e);
                          }
                        } else {
                          textPartContent += contentPart.text;
                        }
                      }
                    }

                    if (textPartContent || listPartHtml) {
                      const textMessage: Message = {
                        text: textPartContent,
                        sender: 'agent',
                        formattedText: this.formatText(textPartContent) + listPartHtml
                      };
                      this.messages.push(textMessage);
                    }

                    if (tablePartMessage) {
                      this.messages.push(tablePartMessage);
                    }

                    this.scrollToBottom();
                  }
                } catch (e) {
                  // Not all data chunks are valid JSON, so we ignore parsing errors.
                }
              }
            }
          }
        },
        error: (error: any) => {
          const errorMessage = error.message || error.error?.message || 'Sorry, something went wrong. Please try again.';
          this.messages.length = turnStartIndex;
          this.messages.push({ text: errorMessage, sender: 'agent', formattedText: errorMessage });
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
          this.scrollToBottom();

          const lastMessage = this.messages[this.messages.length - 1];
          if (lastMessage && lastMessage.sender === 'agent' && lastMessage.type === 'json') {
            const generatingMessage: Message = {
              text: 'Generating dashboard...',
              sender: 'agent',
              loading: true,
              completed: false
            };
            this.messages.push(generatingMessage);
            this.scrollToBottom();

            setTimeout(() => {
              const loadingMessageIndex = this.messages.indexOf(generatingMessage);
              if (loadingMessageIndex > -1) {
                this.messages.splice(loadingMessageIndex, 1);
                const successMessage: Message = {
                  text: 'Dashboard generated successfully',
                  sender: 'agent',
                  loading: false,
                  completed: true
                };
                this.messages.push(successMessage);
              }
              this.scrollToBottom();
            }, 15000);
          }
        }
      });
      this.subscriptions.add(apiSub);
    });
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList) {
      for (let i = 0; i < fileList.length; i++) {
        this.selectedFiles.push(fileList[i]);
      }
    }
  }

  removeFile(fileToRemove: File): void {
    this.selectedFiles = this.selectedFiles.filter(file => file !== fileToRemove);
  }

  onOptionSelected(option: string): void {
    this.currentMessage = option;
    this.sendMessage();

    // Find and remove the last message containing options
    const optionMessageIndex = this.messages.map(m => m.type).lastIndexOf('option');
    if (optionMessageIndex > -1) {
      this.messages.splice(optionMessageIndex, 1);
    }
  }

  copyJson(msg: Message): void {
    if (msg.rawJson) {
      navigator.clipboard.writeText(msg.rawJson).then(() => {
        msg.copied = true;
        setTimeout(() => {
          msg.copied = false;
        }, 2000); // Hide message after 2 seconds
      }).catch(err => {
        console.error('Failed to copy JSON: ', err);
      });
    }
  }
}