import { InjectionToken } from '@angular/core';

export interface EnvironmentConfig {
  COMPANY_LOGO_SRC?: string;
  COMPANY_LOGO_TEXT?: string;
  HELP_URL?: string;
  FEEDBACK_URL?: string;
}

export const ENVIRONMENT_CONFIG = new InjectionToken<EnvironmentConfig>('ENVIRONMENT_CONFIG');
