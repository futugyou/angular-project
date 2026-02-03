import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgIconsModule, provideIcons } from '@ng-icons/core';
import { lucideMenu, lucideUser, lucideLogOut, lucideBell, lucideSettings } from '@ng-icons/lucide';
import { CdkMenuModule } from '@angular/cdk/menu';

@Component({
  selector: 'angular-app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CdkMenuModule,
    NgIconsModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [
    provideIcons({ lucideMenu, lucideUser, lucideLogOut, lucideBell, lucideSettings })
  ]
})
export class App {
}