import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MissionService } from '../_services/mission-service';
import { MissionFilter } from '../_models/mission-filter';
import { Mission } from '../_models/mission';

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
  
  filter: MissionFilter = {
    status: 'Open' 
  };
  
  missions: Mission[] = [];

  constructor() {}
  
  ngOnInit() {
    this.onSubmit(); 
  }

  get myUserId(): number {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr).id : 26;
  }

  async onSubmit() {
    try {
      const results = await this._missionService.gets(this.filter);
      const joinedIds = JSON.parse(localStorage.getItem('my_joined_missions') || '[]');

      this.missions = results.filter(m => {
        const isNotMyOwn = m.chief_id !== this.myUserId;
        const isNotJoined = !joinedIds.includes(m.id);
        return isNotMyOwn && isNotJoined;
      });

      console.log('Search results (Hidden Joined):', this.missions);
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  async joinMission(id: number) {
    if (!confirm('คุณต้องการเข้าร่วมภารกิจนี้ใช่หรือไม่?')) return;

    try {
      await this._missionService.join(id);
      this.handleJoinSuccess(id);
    } catch (error: any) {
      if (error.status === 404 || error.status === 200) { 
        this.handleJoinSuccess(id);
      } else {
        alert('เกิดข้อผิดพลาดในการเข้าร่วม');
      }
    }
  }

  private handleJoinSuccess(id: number) {
    this.saveJoinedToLocal(id);
    alert('✅ Join Success! เข้าร่วมภารกิจสำเร็จ');
    this.onSubmit(); 
  }

  private saveJoinedToLocal(id: number) {
    const key = 'my_joined_missions';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(key, JSON.stringify(current));
    }
  }
}