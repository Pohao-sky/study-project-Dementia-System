import { Injectable } from '@angular/core';
import { NormalizedPointerEvent } from '../models/pointer-input';

@Injectable({ providedIn: 'root' })
export class PointerInputService {
  private readonly mouseIdentifier = -1;

  onPointerStart(event: MouseEvent | TouchEvent): NormalizedPointerEvent | null {
    return this.normalizeEvent(event, null);
  }

  onPointerMove(event: MouseEvent | TouchEvent, pointerId: number | null): NormalizedPointerEvent | null {
    return this.normalizeEvent(event, pointerId);
  }

  onPointerEnd(event: MouseEvent | TouchEvent, pointerId: number | null): NormalizedPointerEvent | null {
    return this.normalizeEvent(event, pointerId);
  }

  private normalizeEvent(event: MouseEvent | TouchEvent, pointerId: number | null): NormalizedPointerEvent | null {
    if (event instanceof MouseEvent) {
      return {
        clientX: event.clientX,
        clientY: event.clientY,
        pageX: event.pageX,
        pageY: event.pageY,
        identifier: this.mouseIdentifier
      };
    }

    const targetTouch = this.extractTouch(event, pointerId);
    if (!targetTouch) {
      return null;
    }

    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    return {
      clientX: targetTouch.clientX,
      clientY: targetTouch.clientY,
      pageX: targetTouch.pageX,
      pageY: targetTouch.pageY,
      identifier: targetTouch.identifier
    };
  }

  private extractTouch(event: TouchEvent, pointerId: number | null): Touch | null {
    if (event.changedTouches.length === 0) {
      return null;
    }

    if (pointerId === null) {
      return event.changedTouches.item(0);
    }

    return this.findTouchById(event.changedTouches, pointerId) || this.findTouchById(event.touches, pointerId);
  }

  private findTouchById(list: TouchList, pointerId: number): Touch | null {
    for (let i = 0; i < list.length; i++) {
      const touch = list.item(i);
      if (touch && touch.identifier === pointerId) {
        return touch;
      }
    }
    return null;
  }
}
