import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { VerbalFluencyTestComponent } from '../verbal-fluency-test/verbal-fluency-test.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-voice-test-page',
  standalone: true,
  imports: [CommonModule, VerbalFluencyTestComponent],
  templateUrl: './voice-test-page.component.html',
  styleUrl: './voice-test-page.component.scss'
})
export class VoiceTestPageComponent {
  animalDone = false;
  vegetableDone = false;
  animalResult: any = null;
  vegetableResult: any = null;

  constructor(private router: Router) {}

  onAnimalTestComplete(result: any) {
    this.animalResult = result;
    this.animalDone = true;
  }

  onVegetableTestComplete(result: any) {
    this.vegetableResult = result;
    this.vegetableDone = true;
  }

  canNext(): boolean {
    return this.animalDone && this.vegetableDone;
  }

  nextPage() {
    // 語詞流暢性測驗完成後導頁至 TMT-A
    if (this.canNext()) {
      this.router.navigate(['/trail-making-test-a']);
    }
  }
}
