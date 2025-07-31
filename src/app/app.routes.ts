import { VoiceTestPageComponent } from './voice-test-page/voice-test-page.component';
import { Routes } from '@angular/router';
import { LoginPageComponent } from './login-page/login-page.component';
import { UserInfoPageComponent } from './user-info-page/user-info-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPageComponent },
  { path: 'user-info', component: UserInfoPageComponent },
  { path: 'voice-test', component: VoiceTestPageComponent },
];
