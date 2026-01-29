import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Inject, Optional, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { filter } from 'rxjs';
import { ENVIRONMENT_CONFIG, EnvironmentConfig } from '../../shared-services/environment-config.token';

@Component({
  selector: 'app-side-navbar',
  imports: [
    CommonModule,
    MatIconModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatTooltipModule,
    RouterModule,
  ],
  templateUrl: './side-navbar.component.html',
  styleUrl: './side-navbar.component.scss',
})
export class SideNavbarComponent {
  isExpanded = true;
  showSubmenu: boolean = false;
  isShowing = false;
  showSubSubMenu: boolean = false;
  isCollapsed = true;
  windowWidth = window.innerWidth;
  username!: string;
  logo: string;
  companyText: string;

  menuItems: any[] = [];
   isChatRoute: boolean = false;

  constructor(
    private http: HttpClient,
    private keycloakService: KeycloakService,
    private router: Router,
    @Optional() @Inject(ENVIRONMENT_CONFIG) private envConfig: EnvironmentConfig
  ) {
    this.logo = this.envConfig?.COMPANY_LOGO_SRC || '';
    this.companyText = this.envConfig?.COMPANY_LOGO_TEXT || '';
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isChatRoute = event.urlAfterRedirects.includes('/chat');
      });
  }


  async ngOnInit(): Promise<void> {
    const isLoggedIn = await this.keycloakService.isLoggedIn();
    if (isLoggedIn) {
      const userDetails = await this.keycloakService.loadUserProfile();
      this.username =
        `${userDetails?.firstName} ${userDetails?.lastName}`.trim() || 'user';
    }
    this.loadSidenavConfig();
  }
  async logout(): Promise<void> {
    await this.keycloakService.logout(window.location.origin);
    localStorage.clear();
  }

  loadSidenavConfig() {
    this.http
      .get<any[]>('assets/side-navbar-config/sidenav.config.json')
      .subscribe((data) => {
        this.menuItems = data;
      });
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  mouseenter() {
    if (!this.isExpanded) {
      this.isShowing = true;
    }
  }
  mouseleave() {
    if (!this.isExpanded) {
      this.isShowing = false;
    }
  }
  goToHelp() {
    const helpUrl = this.envConfig?.HELP_URL || 'https://default.help.com';
    window.open(helpUrl, '_blank');
  }

  goToFeedback() {
    const feedbackUrl = this.envConfig?.FEEDBACK_URL;
    if (feedbackUrl) window.open(feedbackUrl, '_blank');
  }

  showNotifications() {
    alert('Notifications clicked!');
  }
}
