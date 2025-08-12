import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrailMakingTestBPageComponent } from './trail-making-test-b-page.component';

describe('TrailMakingTestBPageComponent', () => {
  let component: TrailMakingTestBPageComponent;
  let fixture: ComponentFixture<TrailMakingTestBPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrailMakingTestBPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrailMakingTestBPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
