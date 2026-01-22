import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadPhoto } from './upload-photo';

describe('UploadPhoto', () => {
  let component: UploadPhoto;
  let fixture: ComponentFixture<UploadPhoto>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadPhoto]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadPhoto);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
