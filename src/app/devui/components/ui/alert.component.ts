import { Component, Input, HostBinding, input, computed } from '@angular/core'
import { cn } from '../../lib/utils'
// usage
// import { Alert, AlertTitle, AlertDescription } from './components/alert';

// @Component({
//   standalone: true,
//   imports: [Alert, AlertTitle, AlertDescription],
//   template: `
//     <div hl-alert class="bg-blue-50 text-blue-900 border-blue-200">
//       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>

//       <h5 hl-alert-title>Update Available</h5>
//       <div hl-alert-description>
//         A new software version is ready; please update it as soon as possible.
//       </div>
//     </div>
//   `
// })
// export class AppComponent {}

@Component({
  selector: 'div[hl-alert]',
  standalone: true,
  template: `<ng-content></ng-content>`,
  host: {
    role: 'alert',
  },
})
export class Alert {
  @Input() class: string = ''

  @HostBinding('class')
  get hostClasses() {
    return cn(
      'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
      this.class,
    )
  }
}

@Component({
  selector: 'h5[hl-alert-title]',
  standalone: true,
  template: `<ng-content />`,
  host: { '[class]': 'classes()' },
})
export class AlertTitle {
  readonly userClass = input<string>('', { alias: 'class' })
  readonly classes = computed(() =>
    cn('mb-1 font-medium leading-none tracking-tight', this.userClass()),
  )
}

@Component({
  selector: 'div[hl-alert-description]',
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class AlertDescription {
  @Input() class: string = ''

  @HostBinding('class')
  get hostClasses() {
    return cn('text-sm [&_p]:leading-relaxed', this.class)
  }
}
