import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrailMakingTestBPageComponent } from './trail-making-test-b-page.component';
import { Router } from '@angular/router';
import { LoginService } from '../../service/login.service';
import { TrailMakingBLine, TrailMakingBNode } from '../../models/trail-making';


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
});
