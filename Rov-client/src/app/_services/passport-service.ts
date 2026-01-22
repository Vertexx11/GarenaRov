import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAvatar } from '../_helpers/avatar'; 

export interface LoginData {
  username?: string;
  password?: string;
  display_name?: string;
  confirm_password?: string;
}

export interface Passport {
  avatar_url: string;
  access_token: string;
  expires_in?: number;
  token_type?: string;
  user?: {
    display_name: string;
    avatar_url?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PassportService {
  private _storage_key = 'passport';
  private _api_url = environment.baseUrl + 'api';
  private _http = inject(HttpClient);

  private _platformId = inject(PLATFORM_ID);

  data = signal<Passport | undefined>(undefined);

  image = signal<string>(""); 

  saveAvatarImage(url: string) {
      let passport = this.data();
      if (passport ) {
        passport.avatar_url = url;
        this.data.set(passport);
        this.savePassportToLocalStorage();
        
        this.image.set(url); 
      }
  }

  constructor() {
    if (isPlatformBrowser(this._platformId)) {
      this.getPassportFromLocalStorage();
    }
  }

  async new(registerData: LoginData): Promise<string> {
    try {
      const url = this._api_url + '/brawlers/register';
      const { confirm_password, ...payload } = registerData;

      console.log('Register Payload:', payload);

      const source: Observable<Passport> = this._http.post<Passport>(url, payload);
      const passport: Passport = await firstValueFrom(source);

      this.data.set(passport);
      
      this.image.set(getAvatar(passport.avatar_url));

      this.savePassportToLocalStorage();
      return '';
    } catch (error: any) {
      console.error(error);
      return error.error?.message || error.message || 'Registration failed';
    }
  }

  destroy(): void {
    if (isPlatformBrowser(this._platformId)) {
      localStorage.removeItem(this._storage_key);
    }
    this.data.set(undefined);
    this.image.set("");
  }

  async get(loginData: LoginData): Promise<string> {
    try {
      const url = this._api_url + '/authentication/login';
      const source: Observable<Passport> = this._http.post<Passport>(url, loginData);
      const passport: Passport = await firstValueFrom(source);

      this.data.set(passport);
      
      this.image.set(getAvatar(passport.avatar_url));

      this.savePassportToLocalStorage();

      return '';
    } catch (error: any) {
      if (error.status === 400) {
        return 'Invalid username or password';
      }
      return error.error?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'; 
    }
  }

  private getPassportFromLocalStorage(): void {
    if (!isPlatformBrowser(this._platformId)) return;

    const jsonStr = localStorage.getItem(this._storage_key);
    if (!jsonStr) return;
    try {
      const passport: Passport = JSON.parse(jsonStr) as Passport;
      this.data.set(passport);
      
      this.image.set(getAvatar(this.data()?.avatar_url));

    } catch (error) {
      console.error(error);
    }
  }

  private savePassportToLocalStorage(): void {
    if (!isPlatformBrowser(this._platformId)) return;

    const passport = this.data();
    if (passport) {
      localStorage.setItem(this._storage_key, JSON.stringify(passport));
    }
  }
}