import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrailMakingALine, TrailMakingANode } from '../../models/trail-making';
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
    const node1: TrailMakingANode = { label: 1, x: 0, y: 0 };
    const comp = component as unknown as { isNodeConnected(node: TrailMakingANode): boolean };
    expect(comp.isNodeConnected(node1)).toBeTrue();
    const node2: TrailMakingANode = { label: 2, x: 0, y: 0 };
    const line: TrailMakingALine = { from: node1, to: node2 };
    component.lines = [line];
    expect(comp.isNodeConnected(node2)).toBeTrue();
    const node3: TrailMakingANode = { label: 3, x: 0, y: 0 };
    expect(comp.isNodeConnected(node3)).toBeFalse();
  });
});
