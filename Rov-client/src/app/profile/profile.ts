import { Component, inject, computed, Signal } from '@angular/core';
import { PassportService } from '../_services/passport-service';
import { MatDialog } from '@angular/material/dialog';
import { getAvatar } from '../_helpers/avatar'; 
import { UserService } from '../_services/user-service';
import { UploadPhoto } from '../_dialog/upload-photo/upload-photo';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './profile.html', 
  styleUrl: './profile.css'     
})
export class Profile {
  avatar_url: Signal<string>

  private _passportService = inject(PassportService)
  private _userService = inject(UserService)
  private _dialog = inject(MatDialog)

  constructor() {
    this.avatar_url = computed(() => this._passportService.image())
  }

  openDialog() {
    const ref = this._dialog.open(UploadPhoto);
    ref.afterClosed().subscribe(async file => {
      if (file) 
        await this._userService.uploadAvaterImage(file);
    })
  }
}