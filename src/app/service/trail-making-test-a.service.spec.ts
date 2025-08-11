import { TestBed } from '@angular/core/testing';

import { TrailMakingTestAService } from './trail-making-test-a.service';

describe('TrailMakingTestAService', () => {
  let service: TrailMakingTestAService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrailMakingTestAService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
