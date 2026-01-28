import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissionManager } from './mission-manager';

describe('MissionManager', () => {
  let component: MissionManager;
  let fixture: ComponentFixture<MissionManager>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissionManager]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MissionManager);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
