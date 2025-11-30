import { TestBed } from '@angular/core/testing';

import { GuestAuthService } from './guest-auth.service';

describe('GuestAuthService', () => {
  let service: GuestAuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GuestAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
