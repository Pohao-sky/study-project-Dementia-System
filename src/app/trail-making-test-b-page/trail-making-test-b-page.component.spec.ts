import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrailMakingTestBPageComponent } from './trail-making-test-b-page.component';
import { Router } from '@angular/router';
import { LoginService } from '../service/login.service';
import { TrailMakingTestBService } from '../service/trail-making-test-b.service';
import { of } from 'rxjs';

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
        { provide: TrailMakingTestBService, useValue: { submitResult: () => of({}) } }
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
    const node1 = { type: 'num', label: '1', x: 0, y: 0 } as any;
    expect((component as any).isNodeConnected(node1)).toBeTrue();
    const nodeA = { type: 'char', label: 'A', x: 0, y: 0 } as any;
    component.lines = [{ from: node1, to: nodeA } as any];
    expect((component as any).isNodeConnected(nodeA)).toBeTrue();
    const node2 = { type: 'num', label: '2', x: 0, y: 0 } as any;
    expect((component as any).isNodeConnected(node2)).toBeFalse();
  });

  it('should block navigation until test is finished', () => {
    component.canProceed = false;
    component.nextPage();
    expect(router.navigate).not.toHaveBeenCalled();
    component.canProceed = true;
    component.nextPage();
    expect(router.navigate).toHaveBeenCalledWith(['/memory-decline']);
  });
});
