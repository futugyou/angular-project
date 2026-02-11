import { Injectable, PLATFORM_ID, computed, inject, signal, effect } from '@angular/core'
import { isPlatformBrowser } from '@angular/common'

export type Theme = 'light' | 'dark' | 'system'

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID)
  private readonly STORAGE_KEY = 'theme'

  #theme = signal<Theme>(this.getInitialTheme())

  readonly theme = this.#theme.asReadonly()

  readonly resolvedTheme = computed(() => {
    const current = this.#theme()
    if (current !== 'system') return current
    return this.getSystemPreference()
  })

  constructor() {
    effect(() => {
      const theme = this.resolvedTheme()
      if (isPlatformBrowser(this.platformId)) {
        this.updateDom(theme)
        localStorage.setItem(this.STORAGE_KEY, this.#theme())
      }
    })

    if (isPlatformBrowser(this.platformId)) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.#theme() === 'system') {
          this.updateDom(this.getSystemPreference())
        }
      })
    }
  }

  setTheme(newTheme: Theme) {
    this.#theme.set(newTheme)
  }

  private getInitialTheme(): Theme {
    if (isPlatformBrowser(this.platformId)) {
      return (localStorage.getItem(this.STORAGE_KEY) as Theme) || 'system'
    }
    return 'system'
  }

  private getSystemPreference(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  private updateDom(theme: 'light' | 'dark') {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    root.setAttribute('data-theme', theme)
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
