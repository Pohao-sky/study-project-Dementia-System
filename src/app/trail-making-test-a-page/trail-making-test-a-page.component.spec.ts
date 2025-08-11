import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrailMakingTestAPageComponent } from './trail-making-test-a-page.component';

describe('TrailMakingTestAPageComponent', () => {
  let component: TrailMakingTestAPageComponent;
  let fixture: ComponentFixture<TrailMakingTestAPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrailMakingTestAPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrailMakingTestAPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
