import { Component, inject, computed, Signal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule, Router } from '@angular/router'; 
import { PassportService } from '../_services/passport-service'; 

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterModule 
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {

  private _passportService = inject(PassportService);

  private _routerService = inject(Router);

  display_name: Signal<string | undefined>;
  avatar_url: Signal<string | undefined>;

  constructor() {
    this.display_name = computed(() => this._passportService.data()?.user?.display_name);
    
    this.avatar_url = computed(() => {
        const url = this._passportService.data()?.user?.avatar_url;
        return this.getAvatar(url);
    });
  }
 
  logout() {
      this._passportService.destroy();
      this._routerService.navigate(['/']);
  }

  private getAvatar(url: string | undefined): string {
      if (url) return url;
      return `https://ui-avatars.com/api/?name=${this.display_name() || 'User'}&background=random`;
  }
  
}