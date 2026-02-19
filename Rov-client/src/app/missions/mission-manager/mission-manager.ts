import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { AddMission } from '../../_models/add-mission';
import { NewMission } from '../../_dialog/new-mission/new-mission';
import { Mission } from '../../_models/mission';
import { MissionService } from '../../_services/mission-service';
import { PassportService } from '../../_services/passport-service';

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
  private _passportService = inject(PassportService);
  private _router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private _platformId = inject(PLATFORM_ID);

  missions: Mission[] = [];

  get myUserId(): number {
    return this._passportService.data()?.user?.id || 0;
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

  constructor() { }

  async ngOnInit() {
    await this.loadMyMission();
    await this.fetchMyTotalPoints(); // 🌟 เรียกโหลดแต้มเมื่อเปิดหน้า
  }

  // 🌟 ฟังก์ชันดึงแต้มสะสมจาก Leaderboard
  private async fetchMyTotalPoints() {
    try {
      const brawler = await this._missionService.getMe();
      this.stats.points = brawler.total_points;
      this.calculateStats();
      this.cdr.detectChanges();
    } catch (error: any) {
      console.error('❌ Error fetching total points:', error);
      this.stats.points = 0;
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
    } catch (error: any) {
      console.error('Delete failed:', error);
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  }

  async onLeave(mission: Mission) {
    if (!confirm(`ต้องการออกจากภารกิจ "${mission.name}" ใช่หรือไม่?`)) return;
    try {
      await this._missionService.leave(mission.id);

      if (isPlatformBrowser(this._platformId)) {
        const key = 'my_joined_missions';
        let current: number[] = JSON.parse(localStorage.getItem(key) || '[]') as number[];
        current = current.filter(id => id !== mission.id);
        localStorage.setItem(key, JSON.stringify(current));
      }

      alert('ออกจากภารกิจสำเร็จ');
      await this.loadMyMission();
    } catch (error: any) {
      console.error('Leave failed:', error);
      alert('ออกจากภารกิจไม่สำเร็จ: ' + (error.error || error.message));
    }
  }


  async onStart(mission: Mission) {
    if (mission.status !== 'Open') return;
    try {
      await this._missionService.start(mission.id);
      alert('🚀 ภารกิจเริ่มต้นแล้ว!');
      await this.loadMyMission();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + (error.error || error.message));
    }
  }

  async onComplete(mission: Mission) {
    if (mission.status !== 'InProgress') {
      alert('ต้องเป็นสถานะ InProgress เท่านั้นถึงจะจบภารกิจได้');
      return;
    }
    if (!confirm('ยืนยันจบภารกิจและรับแต้ม?')) return;
    try {
      await this._missionService.complete(mission.id);
      alert('✅ ภารกิจสำเร็จ! ได้รับแต้มรางวัล');
      await this.loadMyMission();
      await this.fetchMyTotalPoints(); // 🌟 รีโหลดแต้มล่าสุด
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + (error.error || error.message));
    }
  }

  async onFail(mission: Mission) {
    if (mission.status !== 'InProgress') return;
    if (!confirm('ยืนยันว่าภารกิจล้มเหลว?')) return;
    try {
      await this._missionService.fail(mission.id);
      alert('❌ ภารกิจล้มเหลว');
      await this.loadMyMission();
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + (error.error || error.message));
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
      // 🌟 Filter out Completed from leading (User preference for active list)
      this.leadingMissions = allMissions.filter((m: any) => m.chief_id == myId && m.status !== 'Completed' && m.status !== 'Failed');

      let joinedIds: number[] = [];
      if (isPlatformBrowser(this._platformId)) {
        joinedIds = JSON.parse(localStorage.getItem('my_joined_missions') || '[]') as number[];
      }

      this.joinedMissions = allMissions.filter((m: any) => {
        // Specific request to hide Mission #9
        if (m.id === 9) return false;
        return m.chief_id != myId && joinedIds.includes(m.id);
      });

      this.calculateStats();
      this.cdr.detectChanges();
    } catch (error: any) {
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
      } catch (error: any) {
        console.error('❌ Error creating mission:', error);
        const msg = typeof error.error === 'string' ? error.error : 'เกิดข้อผิดพลาดในการสร้างภารกิจ';
        alert(msg);
      }
    });
  }

  getDifficultyClass(difficulty: string | undefined): string {
    return (difficulty || 'NORMAL').toUpperCase();
  }
}