import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrailMakingALine, TrailMakingANode } from '../../models/trail-making';
import { TrailMakingTestAPageComponent } from './trail-making-test-a-page.component';

const createTouchEvent = (identifier: number, clientX: number, clientY: number): TouchEvent => {
  const touch = { identifier, clientX, clientY, pageX: clientX, pageY: clientY } as Touch;
  const list: Partial<TouchList> = {
    length: 1,
    item: () => touch
  };
  (list as Record<number, Touch>)[0] = touch as Touch;
  return {
    changedTouches: list as TouchList,
    touches: list as TouchList,
    preventDefault: jasmine.createSpy('preventDefault')
  } as unknown as TouchEvent;
};

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

  it('should update connections equally for mouse and touch interactions', () => {
    component.started = true;
    component.nodes = [
      { label: 1, x: 50, y: 50 },
      { label: 2, x: 100, y: 100 }
    ];
    component.lines = [];
    const canvas = component.canvasRef.nativeElement;
    spyOn(canvas, 'getBoundingClientRect').and.returnValue({
      left: 0,
      top: 0,
      right: 700,
      bottom: 500,
      width: 700,
      height: 500,
      x: 0,
      y: 0,
      toJSON: () => ''
    });
    spyOn(component as unknown as { drawAll(): void }, 'drawAll').and.stub();

    const results: number[] = [];
    const targets: number[] = [];

    const scenarios: Array<() => [MouseEvent | TouchEvent, MouseEvent | TouchEvent, MouseEvent | TouchEvent]> = [
      () => [
        new MouseEvent('mousedown', { clientX: 50, clientY: 50 }),
        new MouseEvent('mousemove', { clientX: 100, clientY: 100 }),
        new MouseEvent('mouseup', { clientX: 100, clientY: 100 })
      ],
      () => [
        createTouchEvent(1, 50, 50),
        createTouchEvent(1, 100, 100),
        createTouchEvent(1, 100, 100)
      ]
    ];

    scenarios.forEach(factory => {
      const [start, move, end] = factory();
      component.canvasPointerStart(start);
      component.canvasPointerMove(move);
      component.canvasPointerEnd(end);
      results.push(component.lines.length);
      targets.push(component.lines[0]?.to.label ?? 0);
      component.lines = [];
      component.dragging = false;
      component.lastNode = null;
      component.currentPath = [];
      (component as unknown as { activePointerId: number | null }).activePointerId = null;
    });

    expect(results).toEqual([1, 1]);
    expect(targets).toEqual([2, 2]);
  });
});
