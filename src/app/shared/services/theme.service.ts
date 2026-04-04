import {
  Injectable,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  effect,
  InjectionToken,
  RendererFactory2,
} from '@angular/core'
import { isPlatformBrowser } from '@angular/common'

export interface ThemeConfig {
  attribute?: 'class' | 'data-theme' | 'data-mode'
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
}

export const THEME_CONFIG = new InjectionToken<ThemeConfig>('THEME_CONFIG', {
  factory: () => ({
    attribute: 'class',
    defaultTheme: 'dark',
    enableSystem: true,
    disableTransitionOnChange: true,
    storageKey: 'theme',
  }),
})

export type Theme = 'light' | 'dark' | 'system'

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID)
  private config = inject(THEME_CONFIG)
  private renderer = inject(RendererFactory2).createRenderer(null, null)

  #theme = signal<Theme>(this.getInitialTheme())
  readonly theme = this.#theme.asReadonly()

  readonly resolvedTheme = computed(() => {
    const t = this.#theme()
    if (t !== 'system' || !this.config.enableSystem) return t
    return this.getSystemPreference()
  })

  constructor() {
    effect(() => {
      const theme = this.resolvedTheme()
      if (isPlatformBrowser(this.platformId)) {
        this.applyTheme(theme)
        localStorage.setItem(this.config.storageKey || 'theme', this.#theme())
      }
    })
  }

  setTheme(newTheme: Theme) {
    this.#theme.set(newTheme)
  }

  private applyTheme(theme: string) {
    const root = document.documentElement

    let disableCursor: HTMLStyleElement | null = null
    if (this.config.disableTransitionOnChange) {
      disableCursor = document.createElement('style')
      disableCursor.appendChild(document.createTextNode(`* { transition: none !important; }`))
      document.head.appendChild(disableCursor)
    }

    const attr = this.config.attribute || 'class'
    if (attr === 'class') {
      this.renderer.removeClass(root, 'light')
      this.renderer.removeClass(root, 'dark')
      this.renderer.addClass(root, theme)
    } else {
      this.renderer.setAttribute(root, attr, theme)
    }

    if (disableCursor) {
      window.getComputedStyle(disableCursor).opacity
      document.head.removeChild(disableCursor)
    }
  }

  private getInitialTheme(): Theme {
    if (isPlatformBrowser(this.platformId)) {
      return (
        (localStorage.getItem(this.config.storageKey || 'theme') as Theme) ||
        (this.config.defaultTheme as Theme) ||
        'system'
      )
    }
    return 'system'
  }

  private getSystemPreference(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
}

// usage
export class ModeToggle {
  private themeService = inject(ThemeService)

  currentTheme = this.themeService.theme

  setTheme(theme: Theme) {
    this.themeService.setTheme(theme)
  }
}
