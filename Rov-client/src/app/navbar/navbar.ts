import { Component } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButton } from "@angular/material/button"



@Component({
  selector: 'app-navbar',
  imports: [
    MatSlideToggleModule,
    MatToolbarModule,
    MatButton
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {

}
