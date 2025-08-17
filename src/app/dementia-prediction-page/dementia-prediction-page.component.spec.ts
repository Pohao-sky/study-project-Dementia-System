import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DementiaPredictionPageComponent } from './dementia-prediction-page.component';
import { LoginService } from '../service/login.service';
import { Router } from '@angular/router';
import { PredictionService } from '../service/prediction.service';
import { of } from 'rxjs';

describe('DementiaPredictionPageComponent', () => {
  let component: DementiaPredictionPageComponent;
  let fixture: ComponentFixture<DementiaPredictionPageComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DementiaPredictionPageComponent],
      providers: [
        { provide: LoginService, useValue: { userInfo: {} } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: PredictionService, useValue: { predict: () => of({ prediction: '0', probability: 0.5 }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DementiaPredictionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
