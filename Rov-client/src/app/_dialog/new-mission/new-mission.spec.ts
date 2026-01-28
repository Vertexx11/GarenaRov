import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewMission } from './new-mission';

describe('NewMission', () => {
  let component: NewMission;
  let fixture: ComponentFixture<NewMission>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewMission]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewMission);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
