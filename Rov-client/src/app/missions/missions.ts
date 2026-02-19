import { Component, inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subscription, BehaviorSubject, timer, from, of } from 'rxjs'; // ✅ เพิ่ม of
import { switchMap, map, tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MissionService } from '../_services/mission-service';
import { PassportService } from '../_services/passport-service';
import { MissionFilter } from '../_models/mission-filter';
import { Mission } from '../_models/mission';
import { BrawlerProfile } from '../_models/brawler';

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
export class Missions implements OnInit, OnDestroy {
  private _missionService = inject(MissionService);
  private _passportService = inject(PassportService);
  private _router = inject(Router);
  private _platformId = inject(PLATFORM_ID);

  filter: MissionFilter = {
    status: 'Open'
  };

  isLoading = true;
  private _pollSubscription: Subscription | undefined;
  
  // ใช้ Subject เพื่อสั่ง Trigger การโหลดใหม่ (ทั้ง Auto และ Manual)
  private refresh$ = new BehaviorSubject<void>(undefined);

  missions: Mission[] = [];
  topBrawlers: BrawlerProfile[] = [];

  constructor() { }

  ngOnInit() {
    this.loadLeaderboard();
    if (isPlatformBrowser(this._platformId)) {
      this.startPolling();
    } else {
      // Server-side: fetch once without polling
      this.fetchMissions();
    }
  }

  ngOnDestroy() {
    if (this._pollSubscription) {
      this._pollSubscription.unsubscribe();
    }
  }

  private startPolling() {
    this._pollSubscription = this.refresh$.pipe(
      // เมื่อมีการสั่ง refresh (หรือเริ่มทำงาน) ให้เริ่มนับเวลาใหม่
      // timer(0, 5000) คือเริ่มทันที (0) และทำซ้ำทุก 5 วินาที
      switchMap(() => timer(0, 5000)),
      
      switchMap(() => {
        // Fetch data
        return from(this._missionService.gets(this.filter)).pipe(
          catchError(err => {
            console.error('Polling error:', err);
            return of([]); // ✅ ใช้ of([]) เพื่อส่งอาเรย์ว่างกลับไป แทนที่จะ error แตก
          })
        );
      }),
      
      tap(() => {
        // ✅ ปิด Loading ทันทีที่ได้ข้อมูลชุดแรกมา (ไม่ว่าจะว่างหรือไม่ก็ตาม)
        if (this.isLoading) this.isLoading = false;
      }),

      map(results => {
        // ✅ แก้บั๊ก: ของเดิมถ้า results ว่าง มัน return null ทำให้หน้าจอไม่เคลียร์ค่าเก่า
        // ของใหม่: ส่งไป process เสมอ เพื่อให้หน้าจออัปเดตว่าเป็น "ไม่พบข้อมูล"
        return this.processMissionData(results || []);
      })
    ).subscribe(filteredMissions => {
      // อัปเดตข้อมูลเข้าตัวแปร missions เพื่อแสดงผล
      this.missions = filteredMissions;
    });
  }

  // Fallback for SSR
  async fetchMissions() {
    try {
      const results = await this._missionService.gets(this.filter);
      this.missions = this.processMissionData(results);
    } catch (error) {
      console.error('SSR Fetch error:', error);
      this.missions = []; // ถ้า Error ให้เคลียร์เป็นว่าง
    } finally {
      this.isLoading = false;
    }
  }

  // Extract filtering logic
  private processMissionData(results: Mission[]): Mission[] {
    let joinedIds: number[] = [];
    if (isPlatformBrowser(this._platformId)) {
      joinedIds = JSON.parse(localStorage.getItem('my_joined_missions') || '[]');
    }

    return results.filter(m => {
      const isNotMyOwn = m.chief_id !== this.myUserId;
      const isNotJoined = !joinedIds.includes(m.id);
      const isOpen = m.status === 'Open';
      const isNotFull = m.crew_count < (m.max_crew || 3);

      return isNotMyOwn && isNotJoined && isOpen && isNotFull;
    });
  }

  async loadLeaderboard() {
    try {
      const data = await this._missionService.getLeaderboard();
      this.topBrawlers = data.sort((a: BrawlerProfile, b: BrawlerProfile) => b.total_points - a.total_points);
    } catch (error) {
      console.error('Leaderboard error:', error);
    }
  }

  get myUserId(): number {
    return this._passportService.data()?.user?.id || 0;
  }

  onSubmit() {
    // ✅ ถูกต้อง: ไม่มีการสั่ง isLoading = true หน้าจะไม่กระพริบ
    // แค่สั่งให้ reset timer และดึงข้อมูลใหม่ทันที
    this.refresh$.next();
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
      // ✅ แนะนำ: หลัง Join เสร็จ ให้ดึงข้อมูลใหม่ทันทีเพื่อให้ปุ่มเปลี่ยนสถานะ
      this.refresh$.next(); 
    } catch (error: any) {
      if (error.status === 404 || error.status === 200) {
        this.handleJoinSuccess(id);
        this.refresh$.next();
      } else {
        const msg = typeof error.error === 'string' ? error.error : 'เกิดข้อผิดพลาดในการเข้าร่วม';
        alert(msg);
      }
    }
  }

  private handleJoinSuccess(id: number) {
    this.saveJoinedToLocal(id);
    alert('✅ Join Success! เข้าร่วมภารกิจสำเร็จ');
  }

  private saveJoinedToLocal(id: number) {
    if (!isPlatformBrowser(this._platformId)) return;
    const key = 'my_joined_missions';
    const current = JSON.parse(localStorage.getItem(key) || '[]') as any[];
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(key, JSON.stringify(current));
    }
  }

  isJoined(id: number): boolean {
    if (!isPlatformBrowser(this._platformId)) return false;
    const joinedIds = JSON.parse(localStorage.getItem('my_joined_missions') || '[]') as any[];
    return joinedIds.includes(id);
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