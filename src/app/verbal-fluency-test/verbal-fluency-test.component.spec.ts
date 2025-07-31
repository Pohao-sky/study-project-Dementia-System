import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerbalFluencyTestComponent } from './verbal-fluency-test.component';

describe('VerbalFluencyTestComponent', () => {
  let component: VerbalFluencyTestComponent;
  let fixture: ComponentFixture<VerbalFluencyTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerbalFluencyTestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerbalFluencyTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
