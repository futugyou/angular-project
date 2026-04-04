import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core'
import { provideRouter } from '@angular/router'
import { provideIcons } from '@ng-icons/core'
import { APP_ICONS } from './app-icons'

import { routes } from './app.routes'
import { THEME_CONFIG } from './shared/services/theme.service'

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: THEME_CONFIG,
      useValue: {
        attribute: 'class',
        defaultTheme: 'dark',
        enableSystem: true,
        disableTransitionOnChange: true,
      },
    },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    provideIcons(APP_ICONS),
  ],
}
