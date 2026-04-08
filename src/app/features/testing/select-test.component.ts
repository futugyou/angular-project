import { Component, effect, Injector, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { SELECT_COMPONENTS } from '@shared/ui/select.component'

@Component({
  selector: 'app-select-test',
  standalone: true,
  imports: [CommonModule, ...SELECT_COMPONENTS, NgIconsModule],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Select Component/Directive Test</h1>
    <app-select [(value)]="currentTech" class="w-64">
      <app-select-trigger>
        <app-select-value placeholder="Please select a tech stack" />
      </app-select-trigger>

      <app-select-content>
        <app-select-group>
          <app-select-label>Frontend Frameworks</app-select-label>
          <app-select-item value="Angular">Angular</app-select-item>
          <app-select-item value="React">React</app-select-item>
          <app-select-item value="Vue">Vue</app-select-item>
        </app-select-group>

        <app-select-separator />

        <app-select-group>
          <app-select-label>Build Tools</app-select-label>
          <app-select-item value="Vite">Vite</app-select-item>
          <app-select-item value="Webpack" [disabled]="true">Webpack (Disabled)</app-select-item>
        </app-select-group>
      </app-select-content>
    </app-select>

    <div class="rounded-lg bg-slate-50 p-4 border border-slate-200">
      <p class="text-sm text-slate-600">
        Console logging is enabled. Current Signal Status:

        <span class="font-bold text-blue-600 underline">{{ currentTech() || 'Not Selected' }}</span>
      </p>

      <button
        (click)="currentTech.set('Angular')"
        class="mt-3 text-xs bg-white border px-2 py-1 rounded shadow-sm hover:bg-slate-50"
      >
        Reset to Angular
      </button>
    </div>
  `,
})
export class SelectTestComponent {
  currentTech = signal<string>('Angular')

  constructor(private injector: Injector) {
    effect(() => {
      console.log('🚀 [Select Change]:', this.currentTech())
    })
  }
}
