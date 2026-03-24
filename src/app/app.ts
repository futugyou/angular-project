import { Component } from '@angular/core'
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'

import { NgIconsModule } from '@ng-icons/core'
import { MenuStack, MENU_STACK } from '@angular/cdk/menu'

@Component({
  selector: 'angular-app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIconsModule],
  providers: [{ provide: MENU_STACK, useClass: MenuStack }],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
