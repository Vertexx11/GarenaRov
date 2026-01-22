import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms'; // ✅ ต้องมีตัวนี้
import { CommonModule } from '@angular/common'; // ✅ ต้องมีตัวนี้สำหรับ json pipe
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
export class Missions {
  private _missionService = inject(MissionService);
  
  filter: MissionFilter = {};
  missions: Mission[] = [];

  constructor() {}

  async onSubmit() {
    this.missions = await this._missionService.gets(this.filter);
  }
}