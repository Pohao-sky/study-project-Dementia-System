import { VoiceTestPageComponent } from './pages/voice-test-page/voice-test-page.component';
import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { UserInfoPageComponent } from './pages/user-info-page/user-info-page.component';
import { TrailMakingTestAPageComponent } from './pages/trail-making-test-a-page/trail-making-test-a-page.component';
import { TrailMakingTestBPageComponent } from './pages/trail-making-test-b-page/trail-making-test-b-page.component';
import { MemoryDeclinePageComponent } from './pages/memory-decline-page/memory-decline-page.component';
import { DementiaPredictionPageComponent } from './pages/dementia-prediction-page/dementia-prediction-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPageComponent },
  { path: 'user-info', component: UserInfoPageComponent },
  { path: 'voice-test', component: VoiceTestPageComponent },
  { path: 'trail-making-test-a', component: TrailMakingTestAPageComponent },
  { path: 'trail-making-test-b', component: TrailMakingTestBPageComponent },
  { path: 'memory-decline', component: MemoryDeclinePageComponent },
  { path: 'dementia-prediction', component: DementiaPredictionPageComponent },
];
