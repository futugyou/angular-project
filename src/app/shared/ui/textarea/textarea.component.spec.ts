import { render, screen, fireEvent } from '@testing-library/angular'
import { Component, signal } from '@angular/core'
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms'
import { TextareaComponent } from './textarea.component'
import { expect, describe, it } from 'vitest'
import '@testing-library/jest-dom'

describe('TextareaComponent', () => {
  // 1. Basic rendering and non-CVA mode testing
  it('should render with provided placeholder and rows', async () => {
    await render(TextareaComponent, {
      componentInputs: {
        placeholder: 'Enter bio',
        rows: 5,
      },
    })

    const textarea = screen.getByPlaceholderText('Enter bio') as HTMLTextAreaElement
    expect(textarea).toBeInTheDocument()
    expect(textarea.rows).toBe(5)
  })

  // 2. CVA mode test (integration test)
  it('should sync value with NgModel', async () => {
    @Component({
      standalone: true,
      imports: [TextareaComponent, FormsModule],
      template: `<app-textarea [(ngModel)]="modelValue" />`,
    })
    class TestWrapper {
      modelValue = signal('initial')
    }

    const { fixture } = await render(TestWrapper)
    await fixture.whenStable()
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement

    //Initial value verification
    expect(textarea.value).toBe('initial')

    //Analog input
    fireEvent.input(textarea, { target: { value: 'updated' } })
    expect(fixture.componentInstance.modelValue()).toBe('updated')
  })

  // 3. Disable state testing (combining Signal Input and CVA)
  it('should be disabled when ReactiveForm control is disabled', async () => {
    @Component({
      standalone: true,
      imports: [TextareaComponent, ReactiveFormsModule],
      template: `<app-textarea [formControl]="control" />`,
    })
    class TestWrapper {
      control = new FormControl({ value: '', disabled: true })
    }

    await render(TestWrapper)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeDisabled()
  })
})
