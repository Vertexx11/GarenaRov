import { error } from "console";
import { read } from "fs";
import { firstValueFrom } from "rxjs/internal/firstValueFrom";
import { PassportService } from "../_services/passport-service";
import { inject } from "@angular/core/primitives/di";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment.development";
import { CloudinaryImage } from "../_models/cloudinary-image";

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const base64String = reader.result as string;
            resolve(base64String);
        };

        reader.onerror = (error) => {
            reject(error);
        }

        reader.readAsDataURL(file);
    });
}

export class UserService {
  private _api_url = environment.baseUrl + 'api/v1'
  private _http = inject(HttpClient)
  private _passportService = inject(PassportService)

  async uploadAvaterImage(file: File): Promise<boolean> {
    const url = this._api_url + '/brawler/avatar'
    const base64_string = await fileToBase64(file)
    // console.log(base64_string)
    const uploadData = {
      "base64_string": base64_string.split(',')[1]
    }
    try {
      const cloud_image = await firstValueFrom(this._http.post<CloudinaryImage>(url, uploadData))
      this._passportService.saveAvatarImage(cloud_image.url)
      return true
    } catch (error) {
      console.table(error)
      return false
    }
  }
}