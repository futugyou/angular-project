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
import { FullscreenToggleComponent } from '@shared/ui/fullscreen-toggle'
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
        map(() => {
          let route = this.activatedRoute
          while (route.firstChild) {
            route = route.firstChild
          }
          return route
        }),
        mergeMap((route) => {
          let data = { ...route.snapshot.data }
          let parent = route.parent

          while (parent) {
            data = { ...parent.snapshot.data, ...data }
            parent = parent.parent
          }
          return [data]
        }),
      )
      .subscribe((data) => {
        if (data['exitForceFullScreen']) {
          this.layoutService.setFullScreen(false)
          this.showButton = data['showToggle'] || false
        } else if (data['forceFullScreen']) {
          this.layoutService.setFullScreen(true)
          this.showButton = false
        } else {
          this.layoutService.setFullScreen(false)
          this.showButton = data['showToggle'] || false
        }
      })
  }
}
