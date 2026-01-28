import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common'; // <--- เพิ่ม DatePipe ตรงนี้
import { BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// Imports จากไฟล์ของคุณ
import { AddMission } from '../../_models/add-mission';
import { NewMission } from '../../_dialog/new-mission/new-mission';
import { Mission } from '../../_models/mission';
import { MissionService } from '../../_services/mission-service';

@Component({
  selector: 'app-mission-manager',
  standalone: true,
  imports: [
    AsyncPipe, 
    DatePipe,       // <--- ใส่ DatePipe ใน imports array เพื่อให้ HTML รู้จัก | date
    MatButtonModule, 
    MatIconModule
  ], 
  templateUrl: './mission-manager.html',
  styleUrl: './mission-manager.css',
})
export class MissionManager {
  private _missionService = inject(MissionService);
  private _dialog = inject(MatDialog);
  
  // ใช้ BehaviorSubject เพื่อเก็บ State ของ Mission
  private _missionsSubject = new BehaviorSubject<Mission[]>([]);
  readonly myMissions$ = this._missionsSubject.asObservable(); 

  constructor() {
    this.loadMyMission();
  }

  private async loadMyMission() {
    // โหลดข้อมูลเริ่มต้น
    const missions = await this._missionService.getMyMissions(); 
    this._missionsSubject.next(missions);
  }

  openDialog() {
    const ref = this._dialog.open(NewMission);
    
    ref.afterClosed().subscribe(async (addMission: AddMission) => {
      if (!addMission) return;


      const id = await this._missionService.add(addMission);
      const now = new Date();
      
      const newMission: Mission = {
        id,
        name: addMission.name,
        description: addMission.description,
        status: 'Open',
        chief_id: 0,
        crew_count: 0,
        created_at: now,
        updated_at: now
      };

 
      const currentMissions = this._missionsSubject.value;
      this._missionsSubject.next([...currentMissions, newMission]);
    });
  }
}