import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <div class="edit-profile-container">
      <h2 mat-dialog-title>Edit Profile</h2>
      
      <mat-dialog-content>
        <div class="form-container">
          <!-- Display Name -->
          <mat-form-field appearance="outline" class="full-width custom-field">
            <mat-label>Display Name</mat-label>
            <input matInput [(ngModel)]="data.displayName" placeholder="Enter your name">
            <mat-icon matSuffix class="suffix-icon">badge</mat-icon>
          </mat-form-field>

          <!-- Username -->
          <mat-form-field appearance="outline" class="full-width custom-field">
            <mat-label>Username (@handle)</mat-label>
            <input matInput [(ngModel)]="data.username" placeholder="checkers">
            <span matPrefix class="prefix-text">@&nbsp;</span>
          </mat-form-field>

          <!-- Bio -->
          <mat-form-field appearance="outline" class="full-width custom-field">
            <mat-label>Bio (แนะนำตัว)</mat-label>
            <textarea matInput rows="3" [(ngModel)]="data.bio" placeholder="Tell us about yourself..."></textarea>
          </mat-form-field>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close class="cancel-btn">Cancel</button>
        <button mat-flat-button color="primary" class="save-btn" (click)="save()">Save</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .edit-profile-container { padding: 5px; background: white; }
    h2 { font-family: 'Inter', sans-serif; font-weight: 700; color: #1e293b; padding: 16px 24px; margin: 0; border-bottom: 1px solid #f1f5f9; }
    mat-dialog-content { padding: 30px 24px !important; min-width: 400px; }
    
    .form-container { display: flex; flex-direction: column; gap: 16px; }

    /* Remove Borders */
    .custom-field ::ng-deep .mat-mdc-text-field-wrapper { background-color: #f8fafc !important; border-radius: 12px !important; padding: 0 16px; }
    .custom-field ::ng-deep .mdc-notched-outline__leading,
    .custom-field ::ng-deep .mdc-notched-outline__notch,
    .custom-field ::ng-deep .mdc-notched-outline__trailing { border-color: transparent !important; border-width: 0 !important; }
    
    .custom-field.mat-focused ::ng-deep .mat-mdc-text-field-wrapper { background-color: #fff !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }

    .suffix-icon { color: #94a3b8; }
    .prefix-text { color: #64748b; font-weight: 600; }

    mat-dialog-actions { padding: 16px 24px; background: #fff; border-top: 1px solid #f1f5f9; }
    .cancel-btn { color: #64748b !important; border-radius: 8px !important; }
    .save-btn { border-radius: 8px !important; padding: 0 20px !important; font-weight: 600 !important; }
    
    textarea { resize: none; }
  `]
})
export class EditProfileDialog {
  data: { displayName: string, username: string, bio: string };

  constructor(
    public dialogRef: MatDialogRef<EditProfileDialog>,
    @Inject(MAT_DIALOG_DATA) public inputData: any
  ) {
    this.data = { ...inputData };
  }

  save() {
    this.dialogRef.close(this.data);
  }
}
