import { Injectable, OnDestroy } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { BehaviorSubject, Observable, Subject, of } from 'rxjs'
import { catchError, takeUntil, finalize, tap } from 'rxjs/operators'

@Injectable()
export class RequestManagerService implements OnDestroy {
  private isCancellingSubject = new BehaviorSubject<boolean>(false)
  public isCancelling$ = this.isCancellingSubject.asObservable()

  private cancelSignal$ = new Subject<void>()

  constructor(private http: HttpClient) {}

  executeRequest(url: string): Observable<any> {
    this.isCancellingSubject.next(false)

    return this.http.get(url).pipe(
      takeUntil(this.cancelSignal$),
      tap(() => console.log('Request completed successfully.')),
      catchError((err) => {
        throw err
      }),
      finalize(() => {
        this.isCancellingSubject.next(false)
      }),
    )
  }

  cancel(): void {
    this.isCancellingSubject.next(true)
    this.cancelSignal$.next()
    setTimeout(() => this.isCancellingSubject.next(false), 500)
  }

  ngOnDestroy(): void {
    this.cancelSignal$.next()
    this.cancelSignal$.complete()
  }
}
