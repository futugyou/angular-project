import { Component, computed, input, type Signal } from '@angular/core'
import { NgIconComponent } from '@ng-icons/core'
import { cn } from '../../lib/utils'

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [NgIconComponent],
  template: ` <ng-icon name="lucLoader2" [class]="computedClass()" /> `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      .animate-spin {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class LoadingSpinner {
  size = input<'sm' | 'md' | 'lg'>('md')
  className = input<string>('')

  protected computedClass: Signal<string> = computed(() => {
    return cn(
      'animate-spin',
      {
        'size-4': this.size() === 'sm',
        'size-6': this.size() === 'md',
        'size-8': this.size() === 'lg',
      },
      this.className(),
    )
  })
}
