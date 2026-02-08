import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core'
import { provideRouter } from '@angular/router'
import { provideIcons } from '@ng-icons/core'
import {
  lucideHome,
  lucideClipboardList,
  lucideLayoutDashboard,
  lucideChevronLeft,
  lucideChevronRight,
  lucideX,
  lucideMenu,
  lucideUser,
  lucideImage,
  lucideFileText,
  lucideMusic,
  lucideTrash2,
  lucideCheck,
  lucideMinus,
} from '@ng-icons/lucide'

import { routes } from './app.routes'

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    provideIcons({
      lucideHome,
      lucideClipboardList,
      lucideLayoutDashboard,
      lucideChevronLeft,
      lucideChevronRight,
      lucideX,
      lucideMenu,
      lucideUser,
      lucideImage,
      lucideFileText,
      lucideMusic,
      lucideTrash2,
      lucideCheck,
      lucideMinus,
    }),
  ],
}
