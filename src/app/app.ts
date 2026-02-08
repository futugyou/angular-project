import { Component } from '@angular/core'
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'

import { NgIconsModule } from '@ng-icons/core'
import { CdkMenuModule } from '@angular/cdk/menu'

@Component({
  selector: 'angular-app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CdkMenuModule, NgIconsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
