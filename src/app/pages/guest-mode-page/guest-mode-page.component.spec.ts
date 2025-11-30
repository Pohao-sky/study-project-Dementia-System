import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuestModePageComponent } from './guest-mode-page.component';

describe('GuestModePageComponent', () => {
  let component: GuestModePageComponent;
  let fixture: ComponentFixture<GuestModePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuestModePageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuestModePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
