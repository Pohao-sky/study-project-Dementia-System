import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GuestSessionRequest, GuestSessionState } from '../../models/guest-mode';
import { GuestAuthService } from '../../service/guest-auth.service';


interface GuestFormControls {
  cdrSum: FormControl<number | null>;
  cdrMemory: FormControl<number | null>;
  cdrGlob: FormControl<number | null>;
  naccMmse: FormControl<number | null>;
}

const allowedCdrScores: number[] = [0, 0.5, 1, 2, 3];
const disallowedCdrSumValues = new Set([16.5, 17.5]);

function validateCdrSum(control: FormControl<number | null>): ValidationErrors | null {
  const value = control.value;
  if (value === null) return { required: true };
  if (!Number.isFinite(value)) return { numeric: true };
  if (value < 0 || value > 18) return { range: true };
  if (!Number.isInteger(value * 2)) return { step: true };
  if (disallowedCdrSumValues.has(value)) return { disallowedValue: true };
  return null;
}

function validateCdrCategory(control: FormControl<number | null>): ValidationErrors | null {
  const value = control.value;
  if (value === null) return { required: true };
  if (!Number.isFinite(value)) return { numeric: true };
  if (!allowedCdrScores.includes(value)) return { invalidChoice: true };
  return null;
}

function validateMmse(control: FormControl<number | null>): ValidationErrors | null {
  const value = control.value;
  if (value === null) return { required: true };
  if (!Number.isInteger(value)) return { integer: true };
  if (value < 0 || value > 30) return { range: true };
  return null;
}

@Component({
  selector: 'app-guest-mode-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './guest-mode-page.component.html',
  styleUrls: ['./guest-mode-page.component.scss']
})
export class GuestModePageComponent {
  guestForm: FormGroup<GuestFormControls>;
  submissionError = '';
  sessionState: GuestSessionState | null = null;

  constructor(private fb: FormBuilder, private guestAuth: GuestAuthService, private router: Router) {
    this.guestForm = this.fb.group({
      cdrSum: this.fb.control<number | null>(null, [Validators.required, validateCdrSum]),
      cdrMemory: this.fb.control<number | null>(null, [Validators.required, validateCdrCategory]),
      cdrGlob: this.fb.control<number | null>(null, [Validators.required, validateCdrCategory]),
      naccMmse: this.fb.control<number | null>(null, [Validators.required, validateMmse]),
    });
  }

  submitGuestForm(): void {
    this.submissionError = '';
    if (this.guestForm.invalid) {
      this.guestForm.markAllAsTouched();
      return;
    }
    const payload = this.buildRequest();
    this.guestAuth.createGuestSession(payload).subscribe({
      next: state => {
        this.sessionState = state;
        this.router.navigateByUrl('/voice-test');
      },
      error: error => {
        this.submissionError = error?.error?.error || '無法建立訪客模式，請稍後再試。';
        this.sessionState = null;
      }
    });
  }

  private buildRequest(): GuestSessionRequest {
    const value = this.guestForm.value;
    return {
      cdrSum: value.cdrSum ?? 0,
      cdrMemory: value.cdrMemory ?? 0,
      cdrGlob: value.cdrGlob ?? 0,
      naccMmse: value.naccMmse ?? 0,
    };
  }
}
