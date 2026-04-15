import { render, screen, fireEvent } from '@testing-library/angular'
import { Component, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import {
  TabsComponent,
  TabsContentComponent,
  TabsListComponent,
  TabsTriggerComponent,
} from './tab.component'
import { expect, test, describe } from 'vitest'
import '@testing-library/jest-dom'

@Component({
  standalone: true,
  imports: [
    TabsComponent,
    TabsListComponent,
    TabsTriggerComponent,
    TabsContentComponent,
    FormsModule,
  ],
  template: `
    <app-tabs [(ngModel)]="modelValue">
      <app-tabs-list>
        <button tabsTrigger value="tab1" className="t1">Tab 1</button>
        <button tabsTrigger value="tab2" [disabled]="isDisabled()">Tab 2</button>
      </app-tabs-list>
      <app-tabs-content value="tab1" className="c1">Content 1</app-tabs-content>
      <app-tabs-content value="tab2">Content 2</app-tabs-content>
    </app-tabs>
  `,
})
class TestHost {
  modelValue = 'tab1'
  isDisabled = signal(false)
}
describe('Tabs System Unit/Integration', () => {
  // --- TabsComponent & ControlValueAccessor ---
  test('TabsComponent should support ngModel two-way binding', async () => {
    const { fixture } = await render(TestHost)
    const host = fixture.componentInstance

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
    fireEvent.click(tab2)

    expect(host.modelValue).toBe('tab2')
  })

  test('TabsComponent initial value should be correctly synchronized to child components', async () => {
    const { fixture } = await render(TestHost)

    await fixture.whenStable()
    fixture.detectChanges()
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
    expect(tab1).toHaveAttribute('data-state', 'active')
  })

  // --- TabsTriggerComponent ---
  test('TabsTrigger should not trigger a switch when disabled is true', async () => {
    const { fixture } = await render(TestHost)
    fixture.componentInstance.isDisabled.set(true)
    fixture.detectChanges()

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
    fireEvent.click(tab2)

    expect(tab2).toHaveAttribute('data-state', 'inactive')
    expect(fixture.componentInstance.modelValue).toBe('tab1')
  })

  test('TabsTrigger should correctly merge the className input', async () => {
    await render(TestHost)
    const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
    expect(tab1.className).toContain('t1')
  })

  // --- TabsContentComponent ---
  test('TabsContent should retain the host element but remove its internal content when inactive', async () => {
    const { fixture } = await render(TestHost)

    // 1. Wait for the initial ngModel to stabilize
    await fixture.whenStable()
    fixture.detectChanges()

    // 2. Switch via a simulated click rather than directly changing the property,
    //    to avoid the NG0100 error.
    const tab2Trigger = screen.getByRole('tab', { name: 'Tab 2' })
    fireEvent.click(tab2Trigger)

    // 3. Handle asynchronous signals and ngModel feedback
    fixture.detectChanges()
    await fixture.whenStable()

    const content1Host = fixture.nativeElement.querySelector('app-tabs-content[value="tab1"]')

    // Verification logic
    expect(content1Host).not.toBeNull()
    // Use `contains` for the check, as `hostClass` might contain other class names
    expect(content1Host.classList.contains('hidden')).toBe(true)
    // Verify that @if has removed the content
    expect(content1Host.textContent.trim()).toBe('')
  })

  test('TabsContent should correctly apply the data-state attribute', async () => {
    const { fixture } = await render(TestHost)
    await fixture.whenStable()
    fixture.detectChanges()

    const content1 = fixture.nativeElement.querySelector('app-tabs-content[value="tab1"]')
    expect(content1).toHaveAttribute('data-state', 'active')

    const content2 = fixture.nativeElement.querySelector('app-tabs-content[value="tab2"]')
    expect(content2).toHaveAttribute('data-state', 'inactive')
  })

  // --- TabsListComponent ---
  test('TabsList should have the correct ARIA role', async () => {
    await render(TestHost)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  // Use Case 1: Verify Host Container Layout Classes
  test('the app-tabs host element should have flex-col layout classes', async () => {
    const { container } = await render(
      `
      <app-tabs value="1">
      <app-tabs-list></app-tabs-list>
      <app-tabs-content value="1">C1</app-tabs-content>
      </app-tabs>
      `,
      {
        imports: [TabsComponent, TabsListComponent, TabsTriggerComponent, TabsContentComponent],
      },
    )
    const host = container.querySelector('app-tabs')
    expect(host).toHaveClass('flex', 'flex-col')
  })

  // Use Case 2: Verify the Vertical Order of Child Components (List above Content)
  test('TabsList should render before TabsContent', async () => {
    const { container } = await render(
      `
      <app-tabs value="1">
      <app-tabs-list></app-tabs-list>
      <app-tabs-content value="1">C1</app-tabs-content>
      </app-tabs>
      `,
      { imports: [TabsComponent, TabsListComponent, TabsTriggerComponent, TabsContentComponent] },
    )

    const list = container.querySelector('app-tabs-list')
    const content = container.querySelector('app-tabs-content')

    // Verify DOM order: the element immediately following the list should be the content
    expect(list?.nextElementSibling).toBe(content)
  })

  test('should have the justify-start class by default', async () => {
    const { container } = await render(
      `<app-tabs-list>
      <app-tabs-content value="1">C1</app-tabs-content>
      </app-tabs-list>`,
      {
        imports: [TabsListComponent],
      },
    )
    const host = container.querySelector('app-tabs-list')
    expect(host).toHaveClass('justify-start')
  })

  // Use Case 2: Verify passing the 'center' parameter
  test('should switch to justify-center when align is set to center', async () => {
    const props = {
      alignProp: 'center' as 'start' | 'center' | 'end',
    }

    const { container, rerender } = await render(
      `<app-tabs-list [align]="alignProp">
      <app-tabs-content value="1">C1</app-tabs-content>
      </app-tabs-list>`,
      {
        imports: [TabsListComponent],
        componentProperties: props,
      },
    )

    const host = container.querySelector('app-tabs-list')
    expect(host).toHaveClass('justify-center')

    await rerender({ componentProperties: { alignProp: 'end' } })
    expect(host).toHaveClass('justify-end')
  })
})
