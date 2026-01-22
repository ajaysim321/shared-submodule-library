import { Inject, Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';
import { ENVIRONMENT_CONFIG, IEnvironmentConfig } from '../injection-tokens';

@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private _sessionId: string | null = null;
  private agentApiUrl: string;

  constructor(
    private http: HttpClient,
    private keycloakService: KeycloakService,
    @Optional() @Inject(ENVIRONMENT_CONFIG) private environment: IEnvironmentConfig
  ) {
    this.agentApiUrl = this.environment?.agentApiUrl || '';
  }

  /**
   * Sends a message to the agent API and processes the response.
   * @param message The message from the user.
   */
  async sendMessage(message: string, tableData?: any[], jsonData?: any): Promise<Observable<string>> {
    const isLoggedIn = await this.keycloakService.isLoggedIn();
    let userId = 'anonymous';
    let token = '';

    if (isLoggedIn) {
      const keycloakInstance = this.keycloakService.getKeycloakInstance();
      if (keycloakInstance.token) {
        token = keycloakInstance.token;
      }
      userId = keycloakInstance.tokenParsed?.['sub'] || 'anonymous';
    }

    const requestPayload: any = {
      appName: "user_workflow_agent",
      userId: userId,
      sessionId: this._sessionId || 'anonymous',
      newMessage: {
        role: "user",
        parts: [{
          text: message
        }]
      },
      streaming: false,
      stateDelta: null
    };

    if (tableData) {
      requestPayload.newMessage.parts.push({ table: tableData });
    }
    if (jsonData) {
      requestPayload.newMessage.parts.push({ json: jsonData });
    }

    return new Observable<string>(observer => {
      const controller = new AbortController();
      const signal = controller.signal;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (isLoggedIn && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      fetch(`${this.agentApiUrl}/run_sse`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestPayload),
        signal: signal
      }).then(response => {
        if (!response.body) {
          throw new Error("No response body");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        function read() {
          reader.read().then(({ done, value }) => {
            if (done) {
              observer.complete();
              return;
            }
            const chunk = decoder.decode(value, { stream: true });
            observer.next(chunk);
            read();
          }).catch(err => {
            observer.error(err);
          });
        }
        read();

      }).catch(err => {
        observer.error(err);
      });

      return () => {
        controller.abort();
      };
    });
  }

  async createSession() {
    const isLoggedIn = await this.keycloakService.isLoggedIn();
    let userId = 'anonymous';
    const appName = "user_workflow_agent"; // Hardcoded appName

    if (isLoggedIn) {
      userId = this.keycloakService.getKeycloakInstance().tokenParsed?.['sub'] || 'anonymous';
    }

    const sessionApiUrl = `${this.agentApiUrl}/apps/${appName}/users/${userId}/sessions`;

    return this.http.post<any>(sessionApiUrl, {}).pipe(
      tap(response => {
        console.log('Session creation response:', response);
        if (response && response.id) {
          this._sessionId = response.id;
          // console.log('Session ID:', this._sessionId)
        }
      })
    );
  }
}