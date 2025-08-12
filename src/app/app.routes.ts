import { VoiceTestPageComponent } from './voice-test-page/voice-test-page.component';
import { Routes } from '@angular/router';
import { LoginPageComponent } from './login-page/login-page.component';
import { UserInfoPageComponent } from './user-info-page/user-info-page.component';
import { TrailMakingTestAPageComponent } from './trail-making-test-a-page/trail-making-test-a-page.component';
import { TrailMakingTestBPageComponent } from './trail-making-test-b-page/trail-making-test-b-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPageComponent },
  { path: 'user-info', component: UserInfoPageComponent },
  { path: 'voice-test', component: VoiceTestPageComponent },
  { path: 'trail-making-test-a', component: TrailMakingTestAPageComponent },
  { path: 'trail-making-test-b', component: TrailMakingTestBPageComponent },
];
