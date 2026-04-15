import { render, screen, fireEvent } from '@testing-library/angular'
import { InputComponent } from './input.component'
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { Component, signal } from '@angular/core'
import { describe, it, expect } from 'vitest'

describe('InputComponent', () => {
  it('CVA mode: Reactive Forms initial value synchronization', async () => {
    @Component({
      standalone: true,
      imports: [InputComponent, ReactiveFormsModule],
      template: `<app-input [formControl]="control" />`,
    })
    class Host {
      control = new FormControl('Form value')
    }

    const { fixture } = await render(Host)
    fixture.detectChanges()

    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('Form value')
  })

  it('Independent mode: use [value] binding directly', async () => {
    const { fixture } = await render(InputComponent, {
      inputs: { value: 'independent value' },
    })

    fixture.detectChanges()

    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('independent value')
  })

  it('should sync value with NgModel', async () => {
    @Component({
      standalone: true,
      imports: [InputComponent, FormsModule],
      template: `<app-input [(ngModel)]="modelValue" />`,
    })
    class TestWrapper {
      modelValue = signal('initial')
    }

    const { fixture } = await render(TestWrapper)
    await fixture.whenStable()
    const input = screen.getByRole('textbox') as HTMLInputElement

    //Initial value verification
    expect(input.value).toBe('initial')

    //Analog input
    fireEvent.input(input, { target: { value: 'updated' } })
    expect(fixture.componentInstance.modelValue()).toBe('updated')
  })
})
