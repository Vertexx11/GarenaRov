import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule, DecimalPipe } from '@angular/common';
import { AddMission } from '../../_models/add-mission';
import { NewMission } from '../../_dialog/new-mission/new-mission';
import { Mission } from '../../_models/mission';
import { MissionService } from '../../_services/mission-service';

@Component({
  selector: 'app-mission-manager',
  standalone: true,
  imports: [ 
    CommonModule,
    DecimalPipe,
    DatePipe,
    NgClass,
    MatButtonModule, 
    MatIconModule
  ], 
  templateUrl: './mission-manager.html',
  styleUrl: './mission-manager.css',
})
export class MissionManager implements OnInit {
  private _missionService = inject(MissionService);
  private _dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  
  missions: Mission[] = [];
  
  get myUserId(): number {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr).id : 26;
  }

  leadingMissions: Mission[] = [];
  joinedMissions: Mission[] = [];

  stats = {
    total: 0, 
    leading: 0, 
    joined: 0, 
    open: 0,
    points: 0 // 🌟 เพิ่มตัวแปรเก็บแต้มสะสม
  };

  constructor() {}
  
  async ngOnInit() {
    await this.loadMyMission();
    await this.fetchMyTotalPoints(); // 🌟 เรียกโหลดแต้มเมื่อเปิดหน้า
  }

  // 🌟 ฟังก์ชันดึงแต้มสะสมจาก Leaderboard
  private async fetchMyTotalPoints() {
    try {
      const leaderboard = await this._missionService.getLeaderboard();
      const myId = this.myUserId;
      // ค้นหาตัวเองในรายชื่อเพื่อดึงแต้มล่าสุดมาแสดง
      const me = leaderboard.find((b: any) => b.id === myId || b.username === 'Kinn'); 
      this.stats.points = me ? me.total_points : 0;
    } catch (error) {
      console.error('Error fetching points:', error);
      this.stats.points = 0;
    } finally {
      this.cdr.detectChanges();
    }
  }

  onEdit(mission: Mission) {
    const ref = this._dialog.open(NewMission, {
      width: '500px',
      data: { ...mission } 
    });

    ref.afterClosed().subscribe(async (result: any) => {
      if (!result) return; 

      try {
        await this._missionService.update(mission.id, result);
        alert('✅ แก้ไขข้อมูลสำเร็จ!');
        await this.loadMyMission(); 
      } catch (error: any) {
        console.error('Update failed:', error);
        const errorMessage = error.error?.message || error.message || JSON.stringify(error);
        alert('❌ แก้ไขไม่สำเร็จ: ' + errorMessage);
      }
    });
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
      const response: any = await this._missionService.gets({}); 
      let allMissions: any[] = []; 
      
      if (Array.isArray(response)) {
        allMissions = response;
      } else if (response?.data && Array.isArray(response.data)) {
        allMissions = response.data;
      }

      const myId = this.myUserId;
      this.leadingMissions = allMissions.filter((m: any) => m.chief_id == myId);

      const joinedIds = JSON.parse(localStorage.getItem('my_joined_missions') || '[]');
      this.joinedMissions = allMissions.filter((m: any) => {
        return m.chief_id != myId && joinedIds.includes(m.id);
      });

      this.calculateStats();
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
    const ref = this._dialog.open(NewMission, {
      width: '500px'
    });
    
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