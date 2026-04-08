import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ButtonComponent } from '@shared/ui/button'
import { NgIconsModule } from '@ng-icons/core'

@Component({
  selector: 'app-button-test',
  standalone: true,
  imports: [CommonModule, ButtonComponent, NgIconsModule],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Button Component/Directive Test</h1>
    <a [appButton] title="Link" variant="default" href="/orders">Link</a>
    <button [appButton] title="disabled" variant="default" disabled>disabled</button>
    <button [appButton] title="default" variant="default" size="icon">
      <ng-icon name="lucideCheckCheck" class="h-3.5 w-3.5" />
    </button>
    <button [appButton] title="destructive" variant="destructive" size="sm">destructive</button>
    <button appButton variant="destructive" size="sm">destructive2</button>
    <button appButton="destructive" size="sm">destructive3</button>
    <button [appButton]="'destructive'" size="sm">destructive4</button>
    <button [appButton] title="outline" variant="outline" size="lg">outline</button>
    <button [appButton] title="secondary" variant="secondary" size="lg">secondary</button>
    <button [appButton] title="ghost" variant="ghost">ghost</button>
    <button [appButton] title="link" variant="link">link</button>
  `,
})
export class ButtonTestComponent {}
