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

  it('should determine connected nodes correctly', () => {
    const node1 = { type: 'num', label: '1', x: 0, y: 0 } as any;
    const nodeA = { type: 'char', label: 'A', x: 0, y: 0 } as any;
    component.lines = [{ from: node1, to: nodeA } as any];
    expect((component as any).isNodeConnected(node1)).toBeTrue();
    expect((component as any).isNodeConnected(nodeA)).toBeTrue();
    const node2 = { type: 'num', label: '2', x: 0, y: 0 } as any;
    expect((component as any).isNodeConnected(node2)).toBeFalse();
  });
});
