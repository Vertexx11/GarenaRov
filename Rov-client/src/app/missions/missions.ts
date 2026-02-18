import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MissionService } from '../_services/mission-service';
import { PassportService } from '../_services/passport-service';
import { MissionFilter } from '../_models/mission-filter';
import { Mission } from '../_models/mission';
import { Brawler } from '../_models/brawler';

@Component({
  selector: 'app-missions',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule
  ],
  templateUrl: './missions.html',
  styleUrl: './missions.css',
})
export class Missions implements OnInit {
  private _missionService = inject(MissionService);
  private _passportService = inject(PassportService);
  private _router = inject(Router);

  filter: MissionFilter = {
    status: undefined
  };

  missions: Mission[] = [];
  topBrawlers: Brawler[] = [];

  constructor() { }

  ngOnInit() {
    this.onSubmit();
    this.loadLeaderboard();
  }
  async loadLeaderboard() {
    try {
      const data = await this._missionService.getLeaderboard();
      this.topBrawlers = data.sort((a: Brawler, b: Brawler) => b.total_points - a.total_points);
    } catch (error) {
      console.error('Leaderboard error:', error);
    }
  }

  // --- โค้ดเดิมของคุณ (ห้ามลบ) ---
  get myUserId(): number {
    return this._passportService.data()?.user?.id || 0;
  }

  async onSubmit() {
    try {
      const results = await this._missionService.gets(this.filter);
      const joinedIds = JSON.parse(localStorage.getItem('my_joined_missions') || '[]');

      this.missions = results.filter(m => {
        const isNotMyOwn = m.chief_id !== this.myUserId;
        const isNotJoined = !joinedIds.includes(m.id);

        // Show if it's (Not Mine AND Not Joined)
        // User requested to HIDE joined missions from this list
        return isNotMyOwn && isNotJoined;
      });

      console.log('Search results:', this.missions);

      console.log('Search results (Hidden Joined):', this.missions);
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  async joinMission(id: number) {
    const mission = this.missions.find(m => m.id === id);
    if (mission && mission.status !== 'Open') {
      alert('ไม่สามารถเข้าร่วมภารกิจที่เริ่มไปแล้วหรือจบไปแล้วได้');
      return;
    }

    if (!confirm('คุณต้องการเข้าร่วมภารกิจนี้ใช่หรือไม่?')) return;

    try {
      await this._missionService.join(id);
      this.handleJoinSuccess(id);
    } catch (error: any) {
      if (error.status === 404 || error.status === 200) {
        this.handleJoinSuccess(id);
      } else {
        const msg = typeof error.error === 'string' ? error.error : 'เกิดข้อผิดพลาดในการเข้าร่วม';
        alert(msg);
      }
    }
  }

  private handleJoinSuccess(id: number) {
    this.saveJoinedToLocal(id);
    alert('✅ Join Success! เข้าร่วมภารกิจสำเร็จ');
    this._router.navigate(['/missions', id, 'chat']);
  }

  private saveJoinedToLocal(id: number) {
    const key = 'my_joined_missions';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(key, JSON.stringify(current));
    }
  }

  isJoined(id: number): boolean {
    const joinedIds = JSON.parse(localStorage.getItem('my_joined_missions') || '[]');
    return joinedIds.includes(id);
  }

  openChat(id: number) {
    this._router.navigate(['/missions', id, 'chat']);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'Open': return 'เปิดรับสมัคร';
      case 'InProgress': return 'กำลังดำเนินการ';
      case 'Completed': return 'ภารกิจสำเร็จ';
      case 'Failed': return 'ภารกิจล้มเหลว';
      case 'Closed': return 'ปิดรับสมัคร';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Open': return 'badge-open';
      case 'InProgress': return 'badge-warning';
      case 'Completed': return 'badge-success';
      case 'Failed': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getDifficultyClass(difficulty: string | undefined): string {
    return (difficulty || 'NORMAL').toUpperCase();
  }
}