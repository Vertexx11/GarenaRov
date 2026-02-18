import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MissionService } from '../_services/mission-service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.css'
})
export class LeaderboardComponent implements OnInit {
  private _missionService = inject(MissionService);
  private cdr = inject(ChangeDetectorRef);
  topBrawlers: any[] = [];

  ngOnInit() {
    this.loadLeaderboard();
  }

  async loadLeaderboard() {
    try {
      const data = await this._missionService.getLeaderboard();
      this.topBrawlers = data || [];
    } catch (error: any) {
      console.error('Leaderboard error:', error);
    } finally {
      this.cdr.detectChanges();
    }
  }
}