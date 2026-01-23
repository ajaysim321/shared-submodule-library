// src/app/shared/services/platform.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PlatformService {
   private apiUrl = 'http://localhost:8880/spriced/platform/dvm/DVM-MAP';

  constructor(private http: HttpClient) {}

  // Existing (local file) method
  getDashboardConfig(filePath: string): Observable<any> {
    return this.http.get(filePath);
  }

  // get dashboard from API  method
  getDashboardConfigFromApi(projectId: string, dvmWorkflowAppId: string): Observable<any> {
    const payload = {
      project_id: projectId,
      dvm_workflow_app_id: dvmWorkflowAppId
    };
    return this.http.post<any>(this.apiUrl, payload);
  }
}