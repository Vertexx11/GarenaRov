import { Injectable, inject } from '@angular/core';
import { PassportService } from './passport-service'; 

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private _passportService = inject(PassportService);

  async uploadAvaterImage(file: File): Promise<boolean> {
    

    const fakeUrl = URL.createObjectURL(file);

    this._passportService.saveAvatarImage(fakeUrl);

    console.log(" Upload สำเร็จ! รูปเปลี่ยนแล้วครับ");
    return true; 
  }
}