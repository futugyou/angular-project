import { Component, OnInit } from '@angular/core'
import {
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
  Router,
  ActivatedRoute,
  NavigationEnd,
} from '@angular/router'
import { filter, map, mergeMap } from 'rxjs/operators'

import { NgIconsModule } from '@ng-icons/core'
import { MenuStack, MENU_STACK } from '@angular/cdk/menu'
import { FullscreenToggleComponent } from '@shared/ui/fullscreen-toggle.component'
import { LayoutService } from '@shared/services/layout.service'

@Component({
  selector: 'angular-app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIconsModule, FullscreenToggleComponent],
  providers: [{ provide: MENU_STACK, useClass: MenuStack }],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  showButton = false

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public layoutService: LayoutService,
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map((route) => {
          while (route.firstChild) route = route.firstChild
          return route
        }),
        mergeMap((route) => route.data),
      )
      .subscribe((data) => {
        // 1. 如果配置了强制全屏，直接进入全屏模式
        if (data['forceFullScreen']) {
          this.layoutService.setFullScreen(true)
          this.showButton = false
        } else {
          // 2. 否则，根据路由决定是否显示按钮，并重置全屏状态为正常
          this.layoutService.setFullScreen(false)
          this.showButton = data['showToggle'] || false
        }
      })
  }
}
