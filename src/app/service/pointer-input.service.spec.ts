import { PointerInputService } from './pointer-input.service';

interface MockTouch extends Partial<Touch> {
  identifier: number;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
}

const createTouchList = (touches: MockTouch[]): TouchList => {
  const list: Partial<TouchList> = {
    length: touches.length,
    item: (index: number) => touches[index] as Touch | undefined || null
  };

  touches.forEach((touch, index) => {
    (list as Record<number, Touch>)[index] = touch as Touch;
  });

  return list as TouchList;
};

describe('PointerInputService', () => {
  let service: PointerInputService;

  beforeEach(() => {
    service = new PointerInputService();
  });

  it('should normalize mouse events', () => {
    const event = new MouseEvent('mousedown', { clientX: 10, clientY: 20 });
    const normalized = service.onPointerStart(event);
    expect(normalized).toEqual(jasmine.objectContaining({
      clientX: 10,
      clientY: 20,
      identifier: -1
    }));
  });

  it('should normalize touch events and call preventDefault', () => {
    const touch = { identifier: 7, clientX: 30, clientY: 40, pageX: 30, pageY: 40 } as Touch;
    const touchList = createTouchList([touch as unknown as MockTouch]);
    const preventDefault = jasmine.createSpy('preventDefault');
    const event = {
      changedTouches: touchList,
      touches: touchList,
      preventDefault
    } as unknown as TouchEvent;

    const normalized = service.onPointerStart(event);

    expect(normalized).toEqual(jasmine.objectContaining({
      clientX: 30,
      clientY: 40,
      identifier: 7
    }));
    expect(preventDefault).toHaveBeenCalled();
  });

  it('should match touch events by identifier on move/end', () => {
    const touchA = { identifier: 3, clientX: 50, clientY: 60, pageX: 50, pageY: 60 } as Touch;
    const touchB = { identifier: 5, clientX: 70, clientY: 80, pageX: 70, pageY: 80 } as Touch;
    const touchList = createTouchList([touchA as unknown as MockTouch, touchB as unknown as MockTouch]);
    const preventDefault = jasmine.createSpy('preventDefault');
    const event = {
      changedTouches: touchList,
      touches: touchList,
      preventDefault
    } as unknown as TouchEvent;

    const normalized = service.onPointerMove(event, 5);
    expect(normalized).toEqual(jasmine.objectContaining({ identifier: 5, clientX: 70 }));
  });
});
