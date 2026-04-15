import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { SwitchComponent } from '@shared/ui/switch'
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms'

@Component({
  selector: 'app-switch-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, SwitchComponent, ReactiveFormsModule],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Switch Component Test</h1>
    <section class="space-y-4 p-4 border rounded-lg">
      <h2 class="text-lg font-semibold text-gray-700">1. Signal two-way binding (Model Input)</h2>
      <div class="flex items-center gap-4">
        <app-switch [(checked)]="isSwitchChecked" />
        <span class="text-sm font-mono">Current status: {{ isSwitchChecked() }}</span>
      </div>
      <button
        (click)="isSwitchChecked.set(!isSwitchChecked())"
        class="px-3 py-1 bg-blue-500 text-white rounded text-sm"
      >
        external click toggle
      </button>
    </section>

    <section class="space-y-4 p-4 border rounded-lg">
      <h2 class="text-lg font-semibold text-gray-700">2. Reactive Forms</h2>
      <form [formGroup]="testSwitchForm" class="space-y-4">
        <div class="flex items-center justify-between p-2 bg-slate-50 rounded">
          <span>Enable notifications</span>
          <app-switch formControlName="notifications" [showIcons]="true" />
        </div>

        <div class="flex items-center justify-between p-2 bg-slate-50 rounded">
          <span>Privacy mode (disabled)</span>
          <app-switch formControlName="privacy" />
        </div>

        <div class="bg-gray-100 p-3 rounded text-xs font-mono">
          Form Value: {{ testSwitchForm.value | json }}
        </div>

        <button
          type="button"
          (click)="testSwitchForm.reset({ notifications: false, privacy: true })"
          class="text-red-500 underline text-sm"
        >
          Reset form
        </button>
      </form>
    </section>

    <section class="space-y-4 p-4 border rounded-lg">
      <h2 class="text-lg font-semibold text-gray-700">3. Style and Icon Configuration</h2>
      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col items-center gap-2 border p-4 rounded">
          <span class="text-xs text-gray-400">With Icons</span>
          <app-switch [showIcons]="true" />
        </div>

        <div class="flex flex-col items-center gap-2 border p-4 rounded">
          <span class="text-xs text-gray-400">Large Custom Size (via className)</span>
          <app-switch className="scale-150 origin-center" />
        </div>
      </div>
    </section>
  `,
})
export class SwitchTestComponent {
  // switch
  isSwitchChecked = signal(false)
  testSwitchForm = new FormGroup({
    notifications: new FormControl(true),
    privacy: new FormControl({ value: false, disabled: true }),
  })
}
