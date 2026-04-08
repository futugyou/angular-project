import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { CodeBlock } from '@shared/ui/code-block.component'

@Component({
  selector: 'app-code-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, CodeBlock],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Code Component Test</h1>

    <section class="mb-8">
      <h2 class="text-sm font-semibold text-muted-foreground mb-2">1. TypeScript Example</h2>
      <app-code-block code="const message: string = 'Hello Angular 19!';" language="typescript" />
    </section>

    <section class="mb-8">
      <h2 class="text-sm font-semibold text-muted-foreground mb-2">
        2. Multiline HTML (Automatic Line Wrapping Test)
      </h2>

      <app-code-block [code]="htmlSnippet" language="html" />
    </section>

    <section class="mb-8">
      <h2 class="text-sm font-semibold text-muted-foreground mb-2">3. No language identifier</h2>
      <app-code-block code="npm install @ng-icons/core @ng-icons/lucide" />
    </section>

    <p class="text-xs text-muted-foreground mt-10 italic">
      Tip: Hovering the mouse over the code block will display the copy button.
    </p>
  `,
})
export class CodeTestComponent {
  // code
  htmlSnippet = `
<div class="container">
  <h1>Title</h1>
  <p>This is a test scenario for automatic line wrapping of long text, ensuring that even if the code is very long, it will not break the layout, but will gracefully wrap within the container.</p>
</div>`.trim()
}
