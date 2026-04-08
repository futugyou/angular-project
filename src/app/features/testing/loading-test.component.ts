import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { LoadingStateComponent } from '@shared/ui/loading-state.component'
import { LoadingSpinnerComponent } from '@shared/ui/loading-spinner.component'

@Component({
  selector: 'app-loading-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, LoadingStateComponent, LoadingSpinnerComponent],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Loading Component Test</h1>
    <section>
      <h2>Global Loading State</h2>
      <app-loading-state
        message="Preparing your data"
        description="This may take a few seconds..."
        size="lg"
        [fullPage]="true"
      >
        <button class="btn-secondary">Cancel Task</button>
      </app-loading-state>

      <hr />

      <h2>sm md lg Size</h2>
      @for (size of ['sm', 'md', 'lg']; track size) {
        <div class="card">
          <app-loading-state [size]="$any(size)" message="Updating..." />
        </div>
      }
      <hr />

      <h2>Spinner Only (Standalone)</h2>
      <app-loading-spinner size="md" className="text-blue-500" />
    </section>
  `,
})
export class LoadingTestComponent {}
