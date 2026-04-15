import { Component, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { TextareaComponent } from '@shared/ui/textarea'

@Component({
  standalone: true,
  imports: [TextareaComponent, FormsModule],
  template: `
    <section>
      <h2>Pure Signal Input Mode</h2>
      <app-textarea
        data-testid="signal-input-only"
        [value]="staticValue()"
        placeholder="I am static"
      />
      <button (click)="staticValue.set('Reset')">Reset Content</button>
    </section>

    <section>
      <h2>CVA (ngModel) Mode</h2>
      <app-textarea data-testid="cva-textarea" [(ngModel)]="formValue" />
      <p>
        Current Model: <span data-testid="model-display">{{ formValue }}</span>
      </p>
    </section>
  `,
})
export class TextareaTestComponent {
  staticValue = signal('Initial Static')
  formValue = 'Initial Form'
}
