import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-new-mission',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatFormFieldModule, 
    MatInputModule
  ],
  templateUrl: './new-mission.html',
  styleUrl: './new-mission.css'
})

export class NewMission {
  missionData: any;

  constructor(
    public dialogRef: MatDialogRef<NewMission>,
    @Inject(MAT_DIALOG_DATA) public data: any 
  ) {
    console.log('ข้อมูลที่ได้รับ:', data); 

    if (data) {
      this.missionData = { ...data };

    } else {
      this.missionData = { 
        name: '', 
        description: '', 
        status: 'Open' 
      };
    }
  }

  onSubmit() {
    const payload = this.clean(this.missionData);
    console.log('📦 กำลังจะส่งข้อมูลไปหา Backend:', payload);
    
    this.dialogRef.close(payload);
  }

  private clean(data: any): any {
    const cleanData: any = {
      name: data.name?.trim() || 'Untitled',
      description: data.description?.trim() || undefined,
      status: data.status 
    };
    
    return cleanData;
  }
}