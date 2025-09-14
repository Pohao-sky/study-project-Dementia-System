import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MemoryDeclinePageComponent } from './memory-decline-page.component';
import { LoginService } from '../../service/login.service';

describe('MemoryDeclinePageComponent', () => {
  let component: MemoryDeclinePageComponent;
  let fixture: ComponentFixture<MemoryDeclinePageComponent>;
  let router: Router;

  beforeEach(async () => {
    localStorage.removeItem('memoryDeclineAnswer');
    await TestBed.configureTestingModule({
      imports: [MemoryDeclinePageComponent],
      providers: [
        { provide: LoginService, useValue: { userInfo: {} } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MemoryDeclinePageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stores "1" for yes in localStorage when selected', () => {
    component.selectAnswer('yes');
    expect(localStorage.getItem('memoryDeclineAnswer')).toBe('1');
  });

  it('stores "0" for no in localStorage when selected', () => {
    component.selectAnswer('no');
    expect(localStorage.getItem('memoryDeclineAnswer')).toBe('0');
  });

  it('does not navigate when no answer selected', () => {
    component.onNextButtonClick();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('navigates after selecting an answer', () => {
    component.selectAnswer('yes');
    component.onNextButtonClick();
    expect(router.navigate).toHaveBeenCalledWith(['/dementia-prediction']);
  });
});
