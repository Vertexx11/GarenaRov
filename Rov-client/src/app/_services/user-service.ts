import { Injectable, inject } from '@angular/core';
import { PassportService } from './passport-service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private _passportService = inject(PassportService);
  private _http = inject(HttpClient);
  private _api_url = environment.baseUrl + 'api/v1';

  async uploadAvaterImage(file: File): Promise<boolean> {
    try {
      const base64 = await this.toBase64(file);
      const url = `${this._api_url}/brawlers/avatar`;

      // Call Backend API
      const response: any = await firstValueFrom(
        this._http.post(url, { base64_string: base64 })
      );

      // Save real URL from response
      if (response && response.url) {
        this._passportService.saveAvatarImage(response.url);
        console.log("Upload Success! URL:", response.url);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Upload failed", error);
      return false;
    }
  }

  private toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
}