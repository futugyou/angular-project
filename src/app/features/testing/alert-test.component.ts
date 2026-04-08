import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { Alert, AlertTitle, AlertDescription } from '@shared/ui/alert'

@Component({
  selector: 'app-alert-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, Alert, AlertTitle, AlertDescription],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Alert Component Test</h1>
    <app-alert class="bg-blue-50 text-blue-900 border-blue-200">
      <svg
        xmlns="http:www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>

      <app-alert-title>Update Available</app-alert-title>
      <app-alert-description>
        A new software version is ready; please update it as soon as possible.
      </app-alert-description>
    </app-alert>
  `,
})
export class AlertTestComponent {}
