import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { GuestAuthService } from '../../service/guest-auth.service';

@Component({
  selector: 'app-nav-bar',
  imports: [],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.scss'
})
export class NavBarComponent {
  constructor(private router: Router, private loginService: LoginService, private guestAuth: GuestAuthService) {}

  logout() {
    this.loginService.logout();
    this.guestAuth.clearGuestSession();
  }

  isLoginPage(): boolean {
    return this.router.url === '/login';
  }

  showLogout(): boolean {
    return !this.isLoginPage() && !this.guestAuth.isGuestActive;
  }
}
