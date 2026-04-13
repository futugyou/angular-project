// select.component.spec.ts
import { render, screen, fireEvent } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { expect, describe, it, vi } from 'vitest'
import '@testing-library/jest-dom'
import { SELECT_COMPONENTS } from './select.component'
import { NgIconsModule } from '@ng-icons/core'
import { lucideChevronDown, lucideChevronUp, lucideCheck } from '@ng-icons/lucide'

describe('Select Component Integration', () => {
  const setup = async () => {
    return await render(
      `
      <app-select>
        <app-select-trigger>
          <app-select-value placeholder="Select tech" />
        </app-select-trigger>
        <app-select-content>
          <app-select-item value="Angular">Angular</app-select-item>
          <app-select-item value="React">React</app-select-item>
        </app-select-content>
      </app-select>
    `,
      {
        imports: [
          ...SELECT_COMPONENTS,
          NgIconsModule.withIcons({ lucideChevronDown, lucideChevronUp, lucideCheck }),
        ],
      },
    )
  }

  it('Clicking the trigger should correctly open the dropdown (located via data-slot)', async () => {
    const { fixture } = await setup()
    const user = userEvent.setup()

    // 1. Locate the trigger element based on the host binding [attr.data-slot]="'select-trigger'"
    const trigger = fixture.nativeElement.querySelector('[data-slot="select-trigger"]')
    expect(trigger).toBeInTheDocument()

    // 2. Trigger the action by clicking
    await user.click(trigger)

    // 3. Verify the dropdown content. (Note: CdkListbox adds role="listbox" to its host element;
    //    SelectContent utilizes this via hostDirectives: [CdkListbox])
    const listbox = await screen.findByRole('listbox')
    expect(listbox).toBeInTheDocument()
    expect(screen.getByText('Angular')).toBeInTheDocument()
  })

  it('Selecting an option should update the value and close the dropdown content', async () => {
    const { fixture } = await setup()
    const user = userEvent.setup()

    // 1. Open the dropdown
    const trigger = fixture.nativeElement.querySelector('[data-slot="select-trigger"]')
    await user.click(trigger)

    // At this point, the options should be present on the page (within the Overlay container)
    expect(screen.getByText('Angular')).toBeInTheDocument()

    // 2. Click an option
    const option = screen.getByRole('option', { name: /angular/i })
    await user.click(option)

    // 3. Verify that the value has been updated
    expect(screen.getByText('Angular')).toBeInTheDocument()

    // 4. Verify that the dropdown content has closed
    // Note: The app-select-content component itself may still exist, but its internal "content"
    //       should have disappeared. We check if specific elements that were originally inside
    //       the dropdown have been removed.
    expect(screen.queryByText('React')).not.toBeInTheDocument()

    // Alternatively, for a more precise check:
    const portalContent = document.querySelector('.select-content-portal')
    expect(portalContent).toBeNull()
  })
})
