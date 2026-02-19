import { Component, inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subscription, BehaviorSubject, timer, from } from 'rxjs';
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
      // When filter changes (refresh$ emits), restart the timer
      // timer(0, 3000) emits 0 immediately, then every 3s
      switchMap(() => timer(0, 3000)),
      switchMap(() => {
        // Fetch data
        return from(this._missionService.gets(this.filter)).pipe(
          catchError(err => {
            console.error('Polling error:', err);
            return []; // Return empty on error to keep stream alive
          })
        );
      }),
      tap(() => this.isLoading = false), // Stop loading spinner after first fetch
      map(results => this.processMissionData(results))
    ).subscribe(filteredMissions => {
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

  // --- โค้ดเดิมของคุณ (ห้ามลบ) ---
  get myUserId(): number {
    return this._passportService.data()?.user?.id || 0;
  }

  onSubmit() {
    // When user changes filter, trigger refresh
    // This resets the timer and fetches immediately
    this.isLoading = true; // Show loading for manual filter change
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