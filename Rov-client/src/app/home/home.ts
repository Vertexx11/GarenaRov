import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { PassportService } from '../_services/passport-service';
import { environment } from '../../environments/environment';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatButtonModule, 
    MatIconModule
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private _router = inject(Router);
  private _passport = inject(PassportService);
  private _http = inject(HttpClient);

  constructor() {
  
    if (!this._passport.data()) {
      this._router.navigate(['/login']);
    }
  }

  makeError(code: number) {
    const baseUrl = environment.baseUrl + 'api';  
    this._http.get(`${baseUrl}/error/${code}`).subscribe({
        next: () => console.log('Error triggered'),
        error: (err) => console.error(err)
    });
  }
}