import { Injectable, signal } from '@angular/core'

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  isFullScreen = signal(false)

  toggleFullScreen() {
    this.isFullScreen.set(!this.isFullScreen())
  }

  setFullScreen(value: boolean) {
    this.isFullScreen.set(value)
  }
}
