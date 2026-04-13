import { Component, signal } from '@angular/core'
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { InputComponent } from '@shared/ui/input'
@Component({
  standalone: true,
  imports: [InputComponent, ReactiveFormsModule, FormsModule],
  template: `
    <div class="p-8 max-w-2xl mx-auto space-y-12">
      <header class="border-b pb-4">
        <h1 class="text-3xl font-bold text-slate-800">Input Component Playground</h1>
        <p class="text-slate-500">Verify the component's behavior across different modes</p>
      </header>

      <section class="space-y-4">
        <h2 class="text-xl font-semibold">1. Standalone Mode</h2>
        <div class="grid gap-4 p-4 border rounded-lg bg-slate-50">
          <app-input
            [value]="standaloneValue()"
            (input)="onStandaloneInput($event)"
            placeholder="Bound via [value] only"
            data-testid="standalone-input"
          />
          <div class="text-sm">
            Current Internal State:
            <code class="bg-white px-2 py-1 rounded border" data-testid="standalone-display">{{
              standaloneValue()
            }}</code>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-xl font-semibold">2. Two-way Binding (Template-driven)</h2>
        <div class="grid gap-4 p-4 border rounded-lg bg-slate-50">
          <app-input
            [(ngModel)]="modelValue"
            placeholder="Using [(ngModel)]"
            data-testid="model-input"
          />
          <div class="text-sm">
            Live ngModel Value:
            <code class="bg-white px-2 py-1 rounded border" data-testid="model-display">{{
              modelValue
            }}</code>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-xl font-semibold">3. Reactive Forms</h2>
        <div class="grid gap-4 p-4 border rounded-lg bg-slate-50">
          <app-input
            [formControl]="control"
            placeholder="use [formControl]"
            data-testid="reactive-input"
          />
          <div class="flex items-center gap-4">
            <div class="text-sm">
              FormControl value:
              <code class="bg-white px-2 py-1 rounded border" data-testid="reactive-display">{{
                control.value
              }}</code>
            </div>
            <button
              (click)="control.disabled ? control.enable() : control.disable()"
              class="text-xs px-2 py-1 bg-slate-800 text-white rounded hover:bg-slate-700"
            >
              Toggle disabled state
            </button>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class InputTestComponent {
  // Scene 1
  standaloneValue = signal('Initial Static')
  onStandaloneInput(event: Event) {
    const val = (event.target as HTMLInputElement).value
    this.standaloneValue.set(val)
  }

  // Scene 2
  modelValue = 'Hello World'

  // Scene 3
  control = new FormControl('Reactive Value')
}
