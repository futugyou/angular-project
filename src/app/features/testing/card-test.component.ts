import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { CARD_COMPONENTS } from '@shared/ui/card.component'

@Component({
  selector: 'app-card-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, ...CARD_COMPONENTS],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Card Component Test</h1>
    <div ui-card>
      <div ui-card-header>
        <div ui-card-title>Card Title</div>
        <div ui-card-description>This is a simple card component.</div>
        <div ui-card-action>
          <button class="text-sm text-blue-500 hover:underline">Edit</button>
        </div>
      </div>
      <div ui-card-content>
        <p class="text-sm text-muted-foreground">
          This is the content area of the card. You can put any content here.
        </p>
      </div>
      <div ui-card-footer>
        <p class="text-sm text-muted-foreground">This is the footer of the card.</p>
      </div>
    </div>
  `,
})
export class CardTestComponent {}
