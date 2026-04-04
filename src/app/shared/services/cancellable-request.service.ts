import { Injectable, OnDestroy, signal } from '@angular/core'

@Injectable({
  providedIn: 'root',
})
export class CancellableRequestService implements OnDestroy {
  public isCancelling = signal(false)
  private abortController: AbortController | null = null

  createAbortSignal(): AbortSignal {
    this.abortController = new AbortController()
    this.isCancelling.set(false)
    return this.abortController.signal
  }

  handleCancel(): void {
    if (this.abortController) {
      this.isCancelling.set(true)
      this.abortController.abort()
      this.abortController = null
    }
  }

  resetCancelling(): void {
    this.isCancelling.set(false)
  }

  ngOnDestroy(): void {
    this.handleCancel()
  }
}
