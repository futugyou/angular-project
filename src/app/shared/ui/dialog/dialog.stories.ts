import type { Meta, StoryObj } from '@storybook/angular'
import { moduleMetadata, componentWrapperDecorator } from '@storybook/angular'
import { DIALOG_COMPONENTS } from './index'
import { signal } from '@angular/core'
import { NgIconComponent, provideIcons } from '@ng-icons/core'
import { lucideX } from '@ng-icons/lucide'

const meta: Meta = {
  title: 'Components/Dialog',
  decorators: [
    moduleMetadata({
      imports: [...DIALOG_COMPONENTS, NgIconComponent],
      providers: [provideIcons({ lucideX })],
    }),
  ],
}

export default meta

export const Basic: StoryObj = {
  render: () => ({
    props: {
      isOpen: signal(true),
    },
    template: `
      <app-dialog [open]="isOpen()">
        <app-dialog-header>
          <app-dialog-title>Modal Title</app-dialog-title>
          <app-dialog-description>This is a description for the dialog.</app-dialog-description>
        </app-dialog-header>
        <app-dialog-content>
          <p>Main content area with scrollable behavior enabled by default.</p>
        </app-dialog-content>
        <app-dialog-footer>
          <button (click)="isOpen.set(false)">Cancel</button>
        </app-dialog-footer>
      </app-dialog>
    `,
  }),
}

export const CustomSize: StoryObj = {
  render: () => ({
    props: {
      isOpen: signal(true),
    },
    template: `
      <app-dialog [open]="isOpen()" class="max-w-sm min-h-50">
        <app-dialog-header>
          <app-dialog-title>Small Dialog</app-dialog-title>
        </app-dialog-header>
        <app-dialog-content>
          This dialog uses a custom Tailwind class for sizing.
        </app-dialog-content>
      </app-dialog>
    `,
  }),
}

export const ModalBehavior: StoryObj = {
  argTypes: {
    isModal: { control: 'boolean' },
  },
  render: (args) => ({
    props: {
      isOpen: signal(true),
      isModal: args['isModal'],
    },
    template: `
    <app-dialog [open]="isOpen()" [isModal]="isModal">
      <app-dialog-header>
        <app-dialog-title>Modal Behavior Demo</app-dialog-title>
      </app-dialog-header>
      <app-dialog-content>
        Current Mode: {{ isModal ? 'Forced Mode (Clicking outside has no effect)' : 'Normal Mode' }}
      </app-dialog-content>
      <app-dialog-footer>
        <button (click)="isOpen.set(false)">You must click me to close</button>
      </app-dialog-footer>
    </app-dialog>
    `,
  }),
}
