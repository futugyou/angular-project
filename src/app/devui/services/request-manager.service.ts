import { Injectable, OnDestroy } from '@angular/core'
import { Subject, takeUntil } from 'rxjs'

@Injectable()
export class RequestManagerService implements OnDestroy {
  private cancel$ = new Subject<void>()
  public isCancelling = false

  get cancelSignal() {
    return this.cancel$.asObservable()
  }

  cancel() {
    this.isCancelling = true
    this.cancel$.next()
    this.isCancelling = false
  }

  ngOnDestroy() {
    this.cancel$.next()
    this.cancel$.complete()
  }
}
