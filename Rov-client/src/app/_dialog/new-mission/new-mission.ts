import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select'; 

@Component({
  selector: 'app-new-mission',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule 
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
        status: 'Open',
        max_crew: 3,
        difficulty: 'NORMAL', 
        base_points: 3        
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
      status: data.status,
      max_crew: data.max_crew || 1,
      difficulty: data.difficulty || 'NORMAL',    
      base_points: Number(data.base_points) || 3  
    };

    return cleanData;
  }
}