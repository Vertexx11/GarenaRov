import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { MissionFilter } from '../_models/mission-filter';
import { Mission } from '../_models/mission';
import { AddMission } from '../_models/add-mission';

@Injectable({
  providedIn: 'root'
})
export class MissionService {
  private _api_url = environment.baseUrl + 'api/v1'; 
  private _http = inject(HttpClient);

  async getMyMissions(): Promise<Mission[]> {
    const url = this._api_url + '/brawlers/my-missions';
    const observable = this._http.get<Mission[]>(url);
    const missions = await firstValueFrom(observable);
    return missions;
  }

  async add(mission: AddMission): Promise<number> {
    const url = this._api_url + '/mission-management';
    const observable = this._http.post<{mission_id: number}>(url, mission);
    const response = await firstValueFrom(observable);
    return response.mission_id;
  }

  async gets(filter: MissionFilter): Promise<Mission[]> {
    const queryString = this.toQueryString(filter);
    const url = this._api_url + '/view/gets?' + queryString; 
    const observable = this._http.get<Mission[]>(url);
    const missions = await firstValueFrom(observable);
    return missions;
  }

  async join(missionId: number): Promise<any> {
    const url = `${this._api_url}/mission-management/${missionId}/join`;
    return await firstValueFrom(this._http.post(url, {}, { responseType: 'text' }));
  }

  async update(id: number, data: AddMission): Promise<any> {
    const url = `${this._api_url}/mission-management/${id}`;
    return await firstValueFrom(
      this._http.patch(url, data, { responseType: 'text' })
    ); 
  }

  async delete(id: number): Promise<any> {
    const url = `${this._api_url}/mission-management/${id}`;
    return await firstValueFrom(this._http.delete(url, { responseType: 'text' }));
  }



  private toQueryString(filter: MissionFilter): string {
    const params: string[] = [];
    if (filter.name && filter.name.trim()) {
       params.push(`name=${encodeURIComponent(filter.name.trim())}`);
    }
    if (filter.status) {
       params.push(`status=${encodeURIComponent(filter.status)}`);
    }
    return params.join('&');
  }
}