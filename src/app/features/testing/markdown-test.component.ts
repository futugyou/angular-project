import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { MarkdownRendererComponent } from '@shared/ui/markdown-renderer'
import { FormsModule } from '@angular/forms'

@Component({
  selector: 'app-markdown-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, MarkdownRendererComponent, FormsModule],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Markdown Component Test</h1>
    <header class="flex justify-between items-center border-b pb-4">
      <div class="space-x-2">
        <button
          (click)="loadMarkdownExample('basic')"
          class="px-3 py-1 bg-secondary rounded hover:bg-secondary/80 text-sm"
        >
          Basic syntax
        </button>
        <button
          (click)="loadMarkdownExample('technical')"
          class="px-3 py-1 bg-secondary rounded hover:bg-secondary/80 text-sm"
        >
          Technical Documentation
        </button>
      </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="flex flex-col">
        <label class="text-sm font-medium mb-2 uppercase tracking-wider text-muted-foreground"
          >Markdown Input</label
        >
        <textarea
          [(ngModel)]="rawMarkdownText"
          class="flex-1 w-full p-4 font-mono text-sm border rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none bg-background shadow-sm"
          placeholder="Enter Markdown here..."
        ></textarea>
      </div>

      <div class="flex flex-col">
        <label class="text-sm font-medium mb-2 uppercase tracking-wider text-muted-foreground"
          >Live Preview</label
        >
        <div
          class="flex-1 border rounded-lg overflow-y-auto p-4 bg-white dark:bg-zinc-950 shadow-sm"
        >
          <app-markdown-renderer [content]="rawMarkdownText()" />
        </div>
      </div>
    </div>
  `,
})
export class MarkdownTestComponent {
  // markdown
  rawMarkdownText = signal<string>(EXAMPLES.basic)

  loadMarkdownExample(type: 'basic' | 'technical') {
    this.rawMarkdownText.set(EXAMPLES[type])
  }
}

const EXAMPLES = {
  basic: `
## System Architecture Design

The backend of this project is built using **Go (Gin)**, while the frontend utilizes **Angular**.

### Core Code Snippets
\`\`\`typescript
@Component({
selector: 'app-root',
template: '<h1>{{ title() }}</h1>'
})
export class AppComponent {
title = signal('Hello Angular 18');
}
\`\`\`

### To-Do List
1. Optimize GORM association query logic
2. Implement agent orchestration based on **ADK**
3. Migrate \`AppData\` cache from drive C to drive D to save space

### Important Notes
* This project is incompatible with the legacy **ViewEngine**.
* All styling is built using **Tailwind CSS**.
`,
  technical: `
# Welcome to the Markdown Renderer

This is a custom renderer built upon **Angular Signals**.

## Basic Feature Showcase
* **Bold** and *Italic* text
* Hyperlinks: [Visit Google](https://google.com)
* Inline code: \`const version = '17.0';\`

> This is a blockquote, often used to emphasize a specific passage.
> It can span across multiple lines.

---

### Image Showcase

This is a standard inline image:
![Angular Logo](https://angular.dev/assets/images/press-kit/angular_wordmark_gradient.png)

Even when an image appears within paragraph text ![Small Icon](https://avatars.githubusercontent.com/u/17871902?v=4&size=64), it displays correctly.

---

### Simple Table
| Property | Description | Status |
| :--- | :--- | :--- |
| Signal | Reactive Core | Live |
| SSR | Server-Side Rendering | Supported |
| Control Flow | @if / @for | Migrated |
`,
}
