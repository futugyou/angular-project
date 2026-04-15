import { Component, inject, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { ToastContainerComponent, ToastService } from '@shared/ui/toast'
@Component({
  selector: 'app-toast-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, ToastContainerComponent],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Toast Component Test</h1>
    <div class="grid grid-cols-2 gap-4">
      <button
        (click)="toast.success('Operation successful! Data has been synchronized.')"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
      >
        Success Notification
      </button>

      <button
        (click)="toast.error('Login failed. Please check your network connection.')"
        class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
      >
        Error Notification
      </button>

      <button
        (click)="toast.show('Please note: The system will undergo maintenance tonight.', 'warning')"
        class="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
      >
        Warning Notification
      </button>

      <button
        (click)="toast.show('This is a standard message notification.', 'info')"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Info Notification
      </button>

      <button
        (click)="toast.show('This message will display for 10 seconds', 'info', 10000)"
        class="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition col-span-2"
      >
        Custom Duration (10s)
      </button>
    </div>

    <app-toast-container [toasts]="toast.toasts()" (onRemove)="toast.remove($event)" />
  `,
})
export class ToastTestComponent {
  readonly toast = inject(ToastService)
}
