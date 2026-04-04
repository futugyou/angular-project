import { Component, input, computed } from '@angular/core'
import { cn } from '../utils/utils'

@Component({
  selector: 'app-alert',
  standalone: true,
  template: `<ng-content></ng-content>`,
  host: {
    role: 'alert',
    '[class]': 'classes()',
  },
})
export class Alert {
  readonly userClass = input<string>('', { alias: 'class' })

  readonly classes = computed(() =>
    cn(
      'relative block w-full rounded-lg border p-4',
      '[&>svg~*]:pl-7',
      '[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
      this.userClass(),
    ),
  )
}

@Component({
  selector: 'app-alert-title',
  standalone: true,
  template: `<ng-content />`,
  host: { '[class]': 'classes()' },
})
export class AlertTitle {
  readonly userClass = input<string>('', { alias: 'class' })
  readonly classes = computed(() =>
    cn('block mb-1 font-medium leading-none tracking-tight', this.userClass()),
  )
}

@Component({
  selector: 'app-alert-description',
  standalone: true,
  template: `<ng-content></ng-content>`,
  host: {
    '[class]': 'computedClass()',
  },
})
export class AlertDescription {
  readonly userClass = input<string>('', { alias: 'class' })

  readonly computedClass = computed(() =>
    cn('block text-sm [&_p]:leading-relaxed', this.userClass()),
  )
}
