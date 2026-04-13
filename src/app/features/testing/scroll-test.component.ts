import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { ScrollAreaComponent } from '@shared/ui/scroll-area'

@Component({
  selector: 'app-scroll-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, ScrollAreaComponent],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">ScrollArea Component Test</h1>
    <app-scroll-area height="400px">
      <div class="p-6">
        <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 text-blue-700 text-sm">
          💡 <b>Test Instructions:</b>
          There are 100 data entries below. If the logic is correct, when you drag the scrollbar to
          the very bottom, you should see exactly the 100th entry.
        </div>

        @for (item of itemsScrollArea; track item) {
          <div class="flex items-center gap-4 py-4 border-b border-slate-50 last:border-0">
            <div
              class="shrink-0 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-mono text-slate-500"
            >
              {{ item }}
            </div>
            <div class="flex-1">
              <div class="h-4 w-32 bg-slate-100 rounded mb-2"></div>
              <div class="h-3 w-full bg-slate-50 rounded"></div>
            </div>
          </div>
        }
      </div>
    </app-scroll-area>
  `,
})
export class ScrollTestComponent {
  // scroll area
  itemsScrollArea = Array.from({ length: 100 }, (_, i) => i + 1)
}
