import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { User } from '../models/user';
import { LoginService } from '../service/login.service';
import { Router } from '@angular/router';
import { PredictionPayload, PredictionResult, PredictionService } from '../service/prediction.service';

@Component({
  selector: 'app-dementia-prediction-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dementia-prediction-page.component.html',
  styleUrl: './dementia-prediction-page.component.scss'
})
export class DementiaPredictionPageComponent implements OnInit {
  user: User | null = null;
  payload: PredictionPayload | null = null;
  result: PredictionResult | null = null;

  get predictionMessage(): string {
    if (!this.result) return '';
    return this.result.prediction === 0
      ? '預測結果：2年內無失智症風險'
      : '預測結果：2年內可能罹患失智症，建議做進一步檢查';
  }

  get probabilityPercentage(): string {
    if (!this.result) return '';
    return `${(this.result.probability * 100).toFixed(2)}%`;
  }

  constructor(
    private loginService: LoginService,
    private router: Router,
    private predictionService: PredictionService
  ) {}

  ngOnInit(): void {
    this.loadUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }
    this.payload = this.collectPayload();
  }

  predict(): void {
    if (!this.payload) return;
    this.predictionService.predict(this.payload).subscribe({
      next: res => this.result = res,
      error: err => alert(err.error?.error ?? err.message)
    });
  }

  private loadUser(): void {
    if (this.loginService.userInfo) {
      this.user = this.loginService.userInfo;
      return;
    }
    const userStr = localStorage.getItem('userInfo');
    if (userStr) this.user = JSON.parse(userStr);
  }

  private collectPayload(): PredictionPayload {
    return {
      CDR_SUM: this.user?.CDR_SUM ?? 0,
      MMSE: this.user?.MMSE_Score ?? 0,
      MEMORY_DECLINE: Number(localStorage.getItem('memoryDeclineAnswer') ?? 0),
      VEGETABLE_COUNT: this.readTotal('verbalFluencyResult_vegetables'),
      ANIMAL_COUNT: this.readTotal('verbalFluencyResult_animals'),
      TRAIL_A_SECONDS: this.readDuration('trailMakingTestAResult'),
      TRAIL_B_SECONDS: this.readDuration('trailMakingTestBResult'),
      CDR_MEMORY: this.user?.MEMORY ?? 0,
      CDR_GLOB: this.user?.CDRGLOB ?? 0,
    };
  }

  private readTotal(key: string): number {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : null;
    return data?.total ?? 0;
  }

  private readDuration(key: string): number {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : null;
    return data?.duration ?? 0;
  }
}
