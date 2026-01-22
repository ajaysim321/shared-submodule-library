import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Interface for the CustomPayloadService that consuming applications must provide
 */
export interface ICustomPayloadService {
  getConfig(apiUrl: string, params?: any, method?: string, includeAuth?: boolean): Observable<any>;
}

/**
 * Interface for environment configuration that consuming applications must provide
 */
export interface IEnvironmentConfig {
  COMPANY_LOGO_SRC?: string;
  COMPANY_LOGO_TEXT?: string;
  HELP_URL?: string;
  FEEDBACK_URL?: string;
  API_URL?: string;
  [key: string]: any;
}

/**
 * Injection token for CustomPayloadService
 * Consuming applications must provide their own implementation
 *
 * @example
 * // In your app.config.ts or module:
 * providers: [
 *   { provide: CUSTOM_PAYLOAD_SERVICE, useClass: YourCustomPayloadService }
 * ]
 */
export const CUSTOM_PAYLOAD_SERVICE = new InjectionToken<ICustomPayloadService>('CUSTOM_PAYLOAD_SERVICE');

/**
 * Injection token for environment configuration
 * Consuming applications must provide their environment config
 *
 * @example
 * // In your app.config.ts or module:
 * providers: [
 *   { provide: ENVIRONMENT_CONFIG, useValue: environment }
 * ]
 */
export const ENVIRONMENT_CONFIG = new InjectionToken<IEnvironmentConfig>('ENVIRONMENT_CONFIG');
