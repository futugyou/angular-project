import { Component, computed, input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { cn } from '../../lib/utils'
import { LoadingSpinner } from './loading-spinner.component'

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule, LoadingSpinner],
  template: `
    <div
      [class.min-h-screen]="fullPage()"
      [class.bg-background]="fullPage()"
      [class.flex]="fullPage()"
      [class.items-center]="fullPage()"
      [class.justify-center]="fullPage()"
    >
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

          <div class="mt-2">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoadingState {
  message = input<string>('Loading...')
  description = input<string | undefined>()
  size = input<'sm' | 'md' | 'lg'>('md')
  className = input<string>('')
  fullPage = input<boolean>(false)

  protected containerClasses = computed(() =>
    cn(
      'flex flex-col items-center justify-center gap-3',
      this.fullPage() ? 'min-h-[50vh]' : 'py-8',
      this.className(),
    ),
  )

  protected messageClasses = computed(() =>
    cn(
      'font-medium text-muted-foreground',
      this.size() === 'sm' && 'text-sm',
      this.size() === 'lg' && 'text-lg',
    ),
  )
}
