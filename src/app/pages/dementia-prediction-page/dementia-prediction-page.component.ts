import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { User } from '../../models/user';
import { LoginService } from '../../service/login.service';
import { Router } from '@angular/router';
import { PredictionPayload, PredictionResult, PredictionService } from '../../service/prediction.service';
import { HttpErrorResponse } from '@angular/common/http';
import { GuestAuthService } from '../../service/guest-auth.service';


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

  private readonly guestAuth = inject(GuestAuthService);

  get predictionMessage(): string {
    if (!this.result) return '';
    return this.result.prediction === 0
      ? '預測結果：2年內低失智症風險'
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
    if (!this.hasActiveSession()) {
      this.router.navigate(['/login'], { state: { reason: 'relogin' } });
      return;
    }
    this.payload = this.collectPayload();
  }

  predict(): void {
    if (!this.payload) return;
    this.predictionService.predict(this.payload).subscribe({
      next: (res: PredictionResult) => this.result = res,
      error: (err: HttpErrorResponse) => alert(err.error?.error ?? err.message)
    });
  }

  private loadUser(): void {
    if (this.loginService.userInfo) {
      this.user = this.loginService.userInfo;
      return;
    }
  }

  private hasActiveSession(): boolean {
    this.loadUser();
    if (this.user) return true;
    return this.guestAuth.isGuestActive;
  }

  private collectPayload(): PredictionPayload {
    const guestPayload = this.guestAuth.sessionPayload;

    return {
      CDR_SUM: this.resolveScore(this.user?.CDR_SUM, guestPayload?.cdrSum),
      MMSE: this.resolveScore(this.user?.MMSE_Score, guestPayload?.naccMmse),
      MEMORY_DECLINE: Number(localStorage.getItem('memoryDeclineAnswer') ?? 0),
      VEGETABLE_COUNT: this.readTotal('verbalFluencyResult_vegetables'),
      ANIMAL_COUNT: this.readTotal('verbalFluencyResult_animals'),
      TRAIL_A_SECONDS: this.readDuration('trailMakingTestAResult'),
      TRAIL_B_SECONDS: this.readDuration('trailMakingTestBResult'),
      CDR_MEMORY: this.resolveScore(this.user?.MEMORY, guestPayload?.cdrMemory),
      CDR_GLOB: this.resolveScore(this.user?.CDRGLOB, guestPayload?.cdrGlob),
    };
  }

  private resolveScore(primary: number | null | undefined, fallback: number | undefined): number {
    if (typeof primary === 'number') return primary;
    if (typeof fallback === 'number') return fallback;
    return 0;
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
