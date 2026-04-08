import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'

import { CheckboxComponent } from '@shared/ui/checkbox'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms'

@Component({
  selector: 'app-checkbox-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, CheckboxComponent, FormsModule, ReactiveFormsModule],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Checkbox Component Test</h1>
    <section class="p-4 border rounded-lg bg-card">
      <h2 class="text-lg font-semibold mb-2">1. Reactive Forms (FormControl)</h2>
      <form [formGroup]="testCheckboxForm" class="space-y-2">
        <div class="flex items-center gap-2">
          <app-checkbox formControlName="acceptTerms" id="terms" />
          <label for="terms">Accept Terms and Conditions</label>
        </div>
        <p class="text-sm text-muted-foreground">
          Form Value: <code class="bg-muted px-1">{{ testCheckboxForm.value | json }}</code>
        </p>
        <button
          (click)="
            testCheckboxForm.get('acceptTerms')?.disabled
              ? testCheckboxForm.get('acceptTerms')?.enable()
              : testCheckboxForm.get('acceptTerms')?.disable()
          "
          class="mt-2 px-3 py-1 text-xs border rounded bg-secondary"
        >
          Toggle Disable State
        </button>
      </form>
    </section>

    <section class="p-4 border rounded-lg bg-card">
      <h2 class="text-lg font-semibold mb-2">2. Standard Model Binding (No Form)</h2>
      <div class="flex items-center gap-2">
        <app-checkbox [(checked)]="standaloneCheckboxChecked" />
        <span
          >Standalone Checkbox: <strong>{{ standaloneCheckboxChecked() }}</strong></span
        >
      </div>
      <button
        (click)="standaloneCheckboxChecked.set(!standaloneCheckboxChecked())"
        class="mt-2 px-3 py-1 text-xs border rounded bg-secondary"
      >
        Toggle Externally
      </button>
    </section>

    <section class="p-4 border rounded-lg bg-card">
      <h2 class="text-lg font-semibold mb-2">3. Indeterminate State</h2>
      <div class="flex items-center gap-2">
        <app-checkbox
          [(checked)]="parentCheckboxChecked"
          [(indeterminate)]="isCheckboxIndeterminate"
        />
        <span>Select All Options</span>
      </div>
      <div class="ml-6 mt-2 space-y-1 flex flex-col">
        <label><input type="checkbox" checked disabled /> Option A</label>
        <label><input type="checkbox" disabled /> Option B</label>
      </div>
      <button
        (click)="isCheckboxIndeterminate.set(!isCheckboxIndeterminate())"
        class="mt-2 px-3 py-1 text-xs border rounded bg-secondary"
      >
        Toggle Indeterminate
      </button>
    </section>

    <section class="p-4 border rounded-lg bg-card opacity-80">
      <h2 class="text-lg font-semibold mb-2">4. Disabled State (Hardcoded)</h2>
      <div class="flex items-center gap-2">
        <app-checkbox [disabled]="true" [checked]="true" />
        <span class="text-muted-foreground">Always Disabled & Checked</span>
      </div>
    </section>
  `,
})
export class CheckboxTestComponent {
  // checkbox
  testCheckboxForm = new FormGroup({
    acceptTerms: new FormControl(false),
  })

  standaloneCheckboxChecked = signal(false)
  parentCheckboxChecked = signal(false)
  isCheckboxIndeterminate = signal(true)
}
