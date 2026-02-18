import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { MissionFilter } from '../_models/mission-filter';
import { Mission } from '../_models/mission';
import { AddMission } from '../_models/add-mission';
import { Brawler } from '../_models/brawler';

@Injectable({
  providedIn: 'root'
})
export class MissionService {
  private _api_url = environment.baseUrl + 'api/v1';
  private _http = inject(HttpClient);

  async getLeaderboard(): Promise<Brawler[]> {
    return lastValueFrom(this._http.get<Brawler[]>(`${this._api_url}/brawlers/leaderboard`));
  }

  async getMe(): Promise<Brawler> {
    return lastValueFrom(this._http.get<Brawler>(`${this._api_url}/brawlers/me`));
  }

  async getMyMissions(): Promise<Mission[]> {
    const url = this._api_url + '/view/my-missions';
    const observable = this._http.get<Mission[]>(url);
    const missions = await firstValueFrom(observable);
    return missions;
  }

  async add(mission: AddMission): Promise<number> {
    const url = this._api_url + '/mission-management';
    const observable = this._http.post<{ mission_id: number }>(url, mission);
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

  async getOne(id: number): Promise<Mission> {
    const url = `${this._api_url}/view/${id}`;
    return await firstValueFrom(this._http.get<Mission>(url));
  }

  async getMembers(id: number): Promise<Brawler[]> {
    const url = `${this._api_url}/view/count/${id}`;
    return await firstValueFrom(this._http.get<Brawler[]>(url));
  }

  async getChatMessages(missionId: number): Promise<any[]> {
    const url = `${this._api_url}/chat/${missionId}/messages`;
    return await firstValueFrom(this._http.get<any[]>(url));
  }

  async sendChatMessage(missionId: number, content: string): Promise<any> {
    const url = `${this._api_url}/chat/${missionId}/messages`;
    return await firstValueFrom(this._http.post<any>(url, { content }));
  }

  // --- Mission Operations (Transitions) ---
  async start(id: number): Promise<any> {
    const url = `${this._api_url}/mission/in-progress/${id}`;
    return await firstValueFrom(this._http.patch(url, {}));
  }

  async complete(id: number): Promise<any> {
    const url = `${this._api_url}/mission/to-completed/${id}`;
    return await firstValueFrom(this._http.patch(url, {}));
  }

  async fail(id: number): Promise<any> {
    const url = `${this._api_url}/mission/to-failed/${id}`;
    return await firstValueFrom(this._http.patch(url, {}));
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