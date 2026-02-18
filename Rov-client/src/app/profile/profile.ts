import { Component, inject, computed, Signal, OnInit, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { PassportService } from '../_services/passport-service';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../_services/user-service';
import { UploadPhoto } from '../_dialog/upload-photo/upload-photo';
import { EditProfileDialog } from '../_dialog/edit-profile/edit-profile';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { getAvatar } from '../_helpers/avatar';
import { MissionService } from '../_services/mission-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  avatar_url: Signal<string | undefined>
  user_data: Signal<any>

  stats = {
    missions: 0,
    points: 0,
    rank: 0
  };

  private _passportService = inject(PassportService)
  private _userService = inject(UserService)
  private _missionService = inject(MissionService)
  private _dialog = inject(MatDialog)
  private _router = inject(Router)
  private cdr = inject(ChangeDetectorRef)
  private _platformId = inject(PLATFORM_ID);

  constructor() {
    this.avatar_url = computed(() => this._passportService.image())
    this.user_data = computed(() => this._passportService.data()?.user)
  }

  async ngOnInit() {
    // Only run on browser? Or fetch on both?
    // Leaderboard fetch works on server.
    // Local data fetch works only on browser.

    // We can run fetchStats on server too, but be safe.
    await this.fetchStats();
  }

  async fetchStats() {
    try {
      // 1. Get Me (Points)
      const brawler = await this._missionService.getMe();
      this.stats.points = brawler.total_points;

      // 2. Get Rank from Leaderboard
      const leaderboard = await this._missionService.getLeaderboard();
      const meIndex = leaderboard.findIndex((b: any) => b.id === brawler.id);
      this.stats.rank = meIndex !== -1 ? meIndex + 1 : 0;

      // 3. Get Missions Count
      const myId = brawler.id;
      let joinedIds: any[] = [];
      if (isPlatformBrowser(this._platformId)) {
        joinedIds = JSON.parse(localStorage.getItem('my_joined_missions') || '[]');
      }

      // Fetch all missions
      const allMissions: any = await this._missionService.gets({});
      let missionsList: any[] = [];
      if (Array.isArray(allMissions)) missionsList = allMissions;
      else if (allMissions && allMissions.data) missionsList = allMissions.data;

      const leadingCount = missionsList.filter((m: any) => m.chief_id == myId).length;
      const joinedCount = missionsList.filter((m: any) => m.chief_id != myId && joinedIds.includes(m.id)).length;

      this.stats.missions = leadingCount + joinedCount;

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    }
  }

  openDialog() {
    const ref = this._dialog.open(UploadPhoto);
    ref.afterClosed().subscribe(async file => {
      if (file)
        await this._userService.uploadAvaterImage(file);
    })
  }

  openEditProfile() {
    const user = this.user_data();
    const currentData = {
      displayName: user?.display_name || '',
      username: user?.username || '',
      bio: user?.bio || ''
    };

    const ref = this._dialog.open(EditProfileDialog, {
      data: currentData
    });

    ref.afterClosed().subscribe(result => {
      if (result) {
        this._passportService.updateProfile(result);
        // Refresh stats as name might affect leaderboard lookup
        this.fetchStats();
      }
    });
  }


  getRankTitle(): string {
    const rank = this.stats.rank;
    if (rank === 1) return 'Challenger';
    if (rank === 2) return 'Grandmaster';
    if (rank === 3) return 'Master';
    return 'Warrior';
  }
}