import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { VoiceTestPageComponent } from './voice-test-page.component';

describe('VoiceTestPageComponent', () => {
  afterEach(() => localStorage.clear());

  async function createComponent(): Promise<VoiceTestPageComponent> {
    await TestBed.configureTestingModule({
      imports: [VoiceTestPageComponent],
      providers: [
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(VoiceTestPageComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('should create', async () => {
    const component = await createComponent();
    expect(component).toBeTruthy();
  });

  it('should restore completion state from storage', async () => {
    localStorage.setItem('verbalFluencyResult_animals', '{}');
    localStorage.setItem('verbalFluencyResult_vegetables', '{}');
    const component = await createComponent();
    expect(component.canProceedToNextPage).toBeTrue();
  });
});
