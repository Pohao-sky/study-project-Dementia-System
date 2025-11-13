import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrailMakingTestBPageComponent } from './trail-making-test-b-page.component';
import { Router } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { TrailMakingBLine, TrailMakingBNode } from '../../models/trail-making';


const createTouchEvent = (identifier: number, clientX: number, clientY: number): TouchEvent => {
  const touch = { identifier, clientX, clientY, pageX: clientX, pageY: clientY } as Touch;
  const list: Partial<TouchList> = {
    length: 1,
    item: () => touch
  };
  (list as Record<number, Touch>)[0] = touch;
  return {
    changedTouches: list as TouchList,
    touches: list as TouchList,
    preventDefault: jasmine.createSpy('preventDefault')
  } as unknown as TouchEvent;
};


describe('TrailMakingTestBPageComponent', () => {
  let component: TrailMakingTestBPageComponent;
  let fixture: ComponentFixture<TrailMakingTestBPageComponent>;

  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrailMakingTestBPageComponent],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: LoginService, useValue: { userInfo: {} } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TrailMakingTestBPageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should determine connected nodes correctly', () => {
    const node1: TrailMakingBNode = { type: 'num', label: '1', x: 0, y: 0 };
    const comp = component as unknown as { isNodeConnected(node: TrailMakingBNode): boolean };
    expect(comp.isNodeConnected(node1)).toBeTrue();
    const nodeA: TrailMakingBNode = { type: 'char', label: 'A', x: 0, y: 0 };
    const line: TrailMakingBLine = { from: node1, to: nodeA };
    component.lines = [line];
    expect(comp.isNodeConnected(nodeA)).toBeTrue();
    const node2: TrailMakingBNode = { type: 'num', label: '2', x: 0, y: 0 };
    expect(comp.isNodeConnected(node2)).toBeFalse();
  });

  it('should block navigation until test is finished', () => {
    component.canProceed = false;
    component.nextPage();
    expect(router.navigate).not.toHaveBeenCalled();
    component.canProceed = true;
    component.nextPage();
    expect(router.navigate).toHaveBeenCalledWith(['/memory-decline']);
  });

  it('should handle mouse and touch pointer sequences the same way', () => {
    component.started = true;
    const originalOrder = [...component.orderList];
    component.orderList.splice(0, component.orderList.length, { type: 'num', label: '1' }, { type: 'char', label: 'A' });
    component.nodes = [
      { type: 'num', label: '1', x: 60, y: 60 },
      { type: 'char', label: 'A', x: 120, y: 120 }
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

    const sequences: Array<() => [MouseEvent | TouchEvent, MouseEvent | TouchEvent, MouseEvent | TouchEvent]> = [
      () => [
        new MouseEvent('mousedown', { clientX: 60, clientY: 60 }),
        new MouseEvent('mousemove', { clientX: 120, clientY: 120 }),
        new MouseEvent('mouseup', { clientX: 120, clientY: 120 })
      ],
      () => [
        createTouchEvent(2, 60, 60),
        createTouchEvent(2, 120, 120),
        createTouchEvent(2, 120, 120)
      ]
    ];

    const lineCounts: number[] = [];

    sequences.forEach(sequenceFactory => {
      const [start, move, end] = sequenceFactory();
      component.canvasPointerStart(start);
      component.canvasPointerMove(move);
      component.canvasPointerEnd(end);
      lineCounts.push(component.lines.length);
      component.lines = [];
      component.dragging = false;
      component.lastNode = null;
      component.currentPath = [];
      (component as unknown as { activePointerId: number | null }).activePointerId = null;
    });

    expect(lineCounts).toEqual([1, 1]);

    component.orderList.splice(0, component.orderList.length, ...originalOrder);
  });
});
