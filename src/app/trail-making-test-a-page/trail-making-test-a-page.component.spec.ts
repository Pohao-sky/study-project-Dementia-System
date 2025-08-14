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

  it('should determine connected nodes correctly', () => {
    const node1 = { label: 1, x: 0, y: 0 } as any;
    expect((component as any).isNodeConnected(node1)).toBeTrue();
    const node2 = { label: 2, x: 0, y: 0 } as any;
    component.lines = [{ from: node1, to: node2 } as any];
    expect((component as any).isNodeConnected(node2)).toBeTrue();
    const node3 = { label: 3, x: 0, y: 0 } as any;
    expect((component as any).isNodeConnected(node3)).toBeFalse();
  });
});
