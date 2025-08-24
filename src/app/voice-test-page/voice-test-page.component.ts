import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { VerbalFluencyTestComponent } from '../verbal-fluency-test/verbal-fluency-test.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-voice-test-page',
  standalone: true,
  imports: [CommonModule, VerbalFluencyTestComponent],
  templateUrl: './voice-test-page.component.html',
  styleUrl: './voice-test-page.component.scss'
})
export class VoiceTestPageComponent implements OnInit {
  animalDone = false;
  vegetableDone = false;
  animalResult: unknown = null;
  vegetableResult: unknown = null;

  showIncompleteWarning = false;

  private readonly animalStorageKey = 'verbalFluencyResult_animals';
  private readonly vegetableStorageKey = 'verbalFluencyResult_vegetables';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.restoreCompletionState();
  }

  /** 用唯讀屬性避免重複呼叫造成的狀態不一致 */
  get canProceedToNextPage(): boolean {
    return this.animalDone && this.vegetableDone;
  }

  onAnimalTestComplete(result: unknown): void {
    this.animalResult = result;
    this.animalDone = true;
    this.hideWarningIfReady();
  }

  onVegetableTestComplete(result: unknown): void {
    this.vegetableResult = result;
    this.vegetableDone = true;
    this.hideWarningIfReady();
  }

  /** 從 localStorage 讀取完成狀態 */
  private restoreCompletionState(): void {
    const animalSaved = localStorage.getItem(this.animalStorageKey);
    if (animalSaved) {
      this.animalResult = JSON.parse(animalSaved);
      this.animalDone = true;
    }

    const vegetableSaved = localStorage.getItem(this.vegetableStorageKey);
    if (vegetableSaved) {
      this.vegetableResult = JSON.parse(vegetableSaved);
      this.vegetableDone = true;
    }

    this.hideWarningIfReady();
  }

  /** 只做一件事：若已達成條件，就把警告關掉 */
  private hideWarningIfReady(): void {
    if (this.canProceedToNextPage) {
      this.showIncompleteWarning = false;
    }
  }

  /** 按鈕點擊的唯一入口，使用 Early Return */
  onNextButtonClick(): void {
    if (!this.canProceedToNextPage) {
      if (!this.showIncompleteWarning) {
        alert('請先完成測驗');
      }
      this.showIncompleteWarning = true;
      return;
    }
    this.showIncompleteWarning = false;
    this.router.navigate(['/trail-making-test-a']);
  }
}
