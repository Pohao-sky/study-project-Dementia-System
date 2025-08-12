import { TestBed } from '@angular/core/testing';

import { TrailMakingTestBService } from './trail-making-test-b.service';

describe('TrailMakingTestBService', () => {
  let service: TrailMakingTestBService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrailMakingTestBService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
