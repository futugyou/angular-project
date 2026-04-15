import { Meta, StoryObj, moduleMetadata } from '@storybook/angular'
import { ToastContainerComponent, ToastComponent, ToastService } from './toast.component'
import { provideIcons } from '@ng-icons/core'
import { lucideX } from '@ng-icons/lucide'
import { Component, inject } from '@angular/core'

/**
 * Demo Wrapper Component: Simulates a real-world business scenario where clicking buttons triggers a Toast notification.
 */
@Component({
  selector: 'app-toast-demo',
  standalone: true,
  imports: [ToastContainerComponent],
  template: `
    <div
      class="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 gap-4"
    >
      <h3 class="text-lg font-semibold text-gray-700">Toast System Interaction Demo</h3>
      <div class="flex gap-2">
        <button
          (click)="add('success')"
          class="px-4 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 transition-colors"
        >
          Success Message
        </button>
        <button
          (click)="add('error')"
          class="px-4 py-2 bg-red-600 text-white rounded-md shadow hover:bg-red-700 transition-colors"
        >
          Error Notification
        </button>
        <button
          (click)="add('warning')"
          class="px-4 py-2 bg-orange-500 text-white rounded-md shadow hover:bg-orange-600 transition-colors"
        >
          Warning Alert
        </button>
      </div>
      <p class="text-xs text-gray-400">
        Click the buttons to observe the stacking and auto-dismissal of Toasts in the top-right
        corner.
      </p>
    </div>

    <app-toast-container
      [toasts]="toastService.toasts()"
      (onRemove)="toastService.remove($event)"
    />
  `,
})
class ToastDemoComponent {
  toastService = inject(ToastService)

  add(type: 'success' | 'error' | 'warning') {
    const messages = {
      success: 'Data saved successfully! Your changes have been synchronized in real-time.',
      error: 'Network connection error. Please check your network cable or proxy settings.',
      warning:
        'Your system version is outdated; please update as soon as possible to access the latest features.',
    }

    if (type === 'success') this.toastService.success(messages.success)
    else if (type === 'error') this.toastService.error(messages.error)
    else this.toastService.show(messages.warning, 'warning')
  }
}

const meta: Meta = {
  title: 'Components/Toast System',
  // Note: Here, we do not directly use ToastContainer as the component.
  // Instead, we use our Demo wrapper component to showcase the complete interaction flow.
  component: ToastDemoComponent,
  decorators: [
    moduleMetadata({
      // The Demo component and its dependencies must be imported here.
      imports: [ToastDemoComponent, ToastContainerComponent, ToastComponent],
      providers: [ToastService, provideIcons({ lucideX })],
    }),
  ],
}

export default meta
type Story = StoryObj<ToastDemoComponent>

export const InteractiveStack: Story = {
  name: 'Dynamic Stacking Effect',
  render: (args) => ({
    props: args,
    // Explicitly specify the template.
    template: `<app-toast-demo />`,
  }),
}
