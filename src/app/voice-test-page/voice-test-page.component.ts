import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { VerbalFluencyTestComponent } from '../verbal-fluency-test/verbal-fluency-test.component';

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
    // 進入下一個頁面或顯示全部結果
    alert('語詞流暢性測驗全部完成，可進入下個步驟！');
    // this.router.navigate(...)
  }
}
