import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core'; // ✅ 1. เพิ่ม OnInit และ ChangeDetectorRef
import { AsyncPipe, DatePipe, NgClass, JsonPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AddMission } from '../../_models/add-mission';
import { NewMission } from '../../_dialog/new-mission/new-mission';
import { Mission } from '../../_models/mission';
import { MissionService } from '../../_services/mission-service';

@Component({
  selector: 'app-mission-manager',
  standalone: true,
  imports: [
    AsyncPipe, 
    DatePipe,
    NgClass,
    JsonPipe, 
    MatButtonModule, 
    MatIconModule
  ], 
  templateUrl: './mission-manager.html',
  styleUrl: './mission-manager.css',
})
export class MissionManager implements OnInit { // ✅ 2. เพิ่ม implements OnInit
  private _missionService = inject(MissionService);
  private _dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef); // ✅ 3. ฉีดตัวกระตุ้น (ChangeDetectorRef)
  
  get myUserId(): number {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr).id : 26;
  }

  leadingMissions: Mission[] = [];
  joinedMissions: Mission[] = [];

  stats = {
    total: 0, leading: 0, joined: 0, open: 0
  };

  // ❌ ลบ constructor เดิมออก (ปล่อยว่างไว้)
  constructor() {}

  // ✅ 4. ย้ายคำสั่งโหลดมาไว้ที่นี่ (ทำงานเมื่อหน้าพร้อม)
  ngOnInit() {
    this.loadMyMission();
  }

  async onDelete(mission: Mission) {
    if (!confirm(`ต้องการลบภารกิจ "${mission.name}" ใช่หรือไม่?`)) return;

    try {
      await this._missionService.delete(mission.id);
      alert('🗑️ ลบภารกิจเรียบร้อย');
      await this.loadMyMission();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  }

  onEdit(mission: Mission) {
    const ref = this._dialog.open(NewMission, {
      data: mission 
    });

    ref.afterClosed().subscribe(async (result: AddMission) => {
      if (!result) return; 

      try {
        await this._missionService.update(mission.id, result);
        alert('✏️ แก้ไขข้อมูลสำเร็จ');
        await this.loadMyMission(); 
      } catch (error) {
        console.error('Update failed:', error);
        alert('แก้ไขไม่สำเร็จ');
      }
    });
  }

  async onLeave(mission: Mission) {
    if (!confirm(`ต้องการออกจากภารกิจ "${mission.name}" ใช่หรือไม่?`)) return;
    try {
      const key = 'my_joined_missions';
      let current: number[] = JSON.parse(localStorage.getItem(key) || '[]');
      current = current.filter(id => id !== mission.id); 
      localStorage.setItem(key, JSON.stringify(current));
      
      this.loadMyMission();
      
    } catch (error) {
      console.error(error);
      alert('ออกจากภารกิจไม่สำเร็จ');
    }
  }

  private async loadMyMission() {
    try {
      console.log('🔄 กำลังโหลด My Missions...');
      
      const response: any = await this._missionService.gets({}); 
      let allMissions: any[] = [];
      
      if (Array.isArray(response)) {
        allMissions = response;
      } else if (response?.data && Array.isArray(response.data)) {
        allMissions = response.data;
      }

      const myId = this.myUserId;
      this.leadingMissions = allMissions.filter(m => m.chief_id == myId);

      const joinedIds = JSON.parse(localStorage.getItem('my_joined_missions') || '[]');
      this.joinedMissions = allMissions.filter(m => {
        return m.chief_id != myId && joinedIds.includes(m.id);
      });

      console.log(`✅ Loaded: Leading=${this.leadingMissions.length}, Joined=${this.joinedMissions.length}`);
      
      this.calculateStats();

      // -------------------------------------------------------------
      // ✅ 5. สั่ง Angular ให้อัปเดตหน้าจอทันที! (แก้ปัญหาข้อมูลไม่ขึ้น)
      // -------------------------------------------------------------
      this.cdr.detectChanges();

    } catch (error) {
      console.error('❌ Error loading missions:', error);
    }
  }

  private calculateStats() {
    this.stats.leading = this.leadingMissions.length;
    this.stats.joined = this.joinedMissions.length;
    this.stats.total = this.stats.leading + this.stats.joined;
    
    this.stats.open = [...this.leadingMissions, ...this.joinedMissions]
                      .filter(m => m.status === 'Open').length;
  }

  openDialog() {
    const ref = this._dialog.open(NewMission);
    
    ref.afterClosed().subscribe(async (addMission: AddMission) => {
      if (!addMission) return;

      try {
        await this._missionService.add(addMission);
        await this.loadMyMission();
      } catch (error) {
        console.error('❌ Error creating mission:', error);
        alert('เกิดข้อผิดพลาดในการสร้างภารกิจ: ' + error);
      }
    });
  }
}