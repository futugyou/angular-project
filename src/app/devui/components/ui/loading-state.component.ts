import { Component, computed, input, Signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { cn } from '../../lib/utils'
import { LoadingSpinner } from './loading-spinner.component'

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule, LoadingSpinner],
  template: `
    @if (fullPage()) {
      <div class="flex items-center justify-center min-h-screen bg-background">
        <ng-container *ngTemplateOutlet="contentTpl" />
      </div>
    } @else {
      <ng-container *ngTemplateOutlet="contentTpl" />
    }

    <ng-template #contentTpl>
      <div [className]="containerClasses()">
        <app-loading-spinner [size]="size()" className="text-muted-foreground" />

        <div class="text-center space-y-1">
          <p [className]="messageClasses()">
            {{ message() }}
          </p>

          @if (description()) {
            <p class="text-sm text-muted-foreground/80">
              {{ description() }}
            </p>
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class LoadingState {
  message = input<string>('Loading...')
  description = input<string | undefined>()
  size = input<'sm' | 'md' | 'lg'>('md')
  className = input<string>('')
  fullPage = input<boolean>(false)

  protected containerClasses: Signal<string> = computed(() => {
    return cn(
      'flex flex-col items-center justify-center gap-3',
      this.fullPage() ? 'min-h-[50vh]' : 'py-8',
      this.className(),
    )
  })

  protected messageClasses: Signal<string> = computed(() => {
    const s = this.size()
    return cn('font-medium text-muted-foreground', s === 'sm' && 'text-sm', s === 'lg' && 'text-lg')
  })
}
