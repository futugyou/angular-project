import { Component, computed, input, signal, forwardRef } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { NgIconComponent } from '@ng-icons/core'

@Component({
  selector: 'app-code-block',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    <div class="relative group">
      <pre
        class="my-3 p-3 bg-foreground/5 dark:bg-foreground/10 rounded overflow-x-auto border border-foreground/10"
      >
        <code class="text-xs font-mono block whitespace-pre-wrap break-words">
          @if (language()) {
            <span class="opacity-60 text-[10px] mb-1 block uppercase">{{ language() }}</span>
          }
          {{ code() }}
        </code>
      </pre>
      <button
        (click)="handleCopy()"
        class="absolute top-2 right-2 p-1.5 rounded-md border shadow-sm
               bg-background hover:bg-accent text-muted-foreground hover:text-foreground
               transition-all duration-200 opacity-0 group-hover:opacity-100"
        [title]="copied() ? 'Copied!' : 'Copy code'"
      >
        @if (copied()) {
          <ng-icon name="lucideCheck" class="text-green-600 dark:text-green-400" size="14" />
        } @else {
          <ng-icon name="lucideCopy" size="14" />
        }
      </button>
    </div>
  `,
})
export class CodeBlock {
  code = input.required<string>()
  language = input<string>('')
  copied = signal(false)
  private timeoutId: any

  async handleCopy() {
    try {
      await navigator.clipboard.writeText(this.code())
      this.copied.set(true)
      if (this.timeoutId) clearTimeout(this.timeoutId)
      this.timeoutId = setTimeout(() => this.copied.set(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }
}

@Component({
  selector: 'app-markdown-renderer',
  standalone: true,
  imports: [FormsModule, CodeBlock],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownRenderer),
      multi: true,
    },
  ],
  template: `
    <div [class]="'markdown-content break-words ' + className()">
      @for (element of parsedElements(); track $index) {
        @switch (element.type) {
          @case ('code') {
            <app-code-block [code]="element.content" [language]="element.lang" />
          }
          @case ('h1') {
            <h1 [class]="element.css" [innerHTML]="renderInlineHtml(element.content)"></h1>
          }
          @case ('h2') {
            <h2 [class]="element.css" [innerHTML]="renderInlineHtml(element.content)"></h2>
          }
          @case ('h3') {
            <h3 [class]="element.css" [innerHTML]="renderInlineHtml(element.content)"></h3>
          }
          @case ('h4') {
            <h4 [class]="element.css" [innerHTML]="renderInlineHtml(element.content)"></h4>
          }
          @case ('h5') {
            <h5 [class]="element.css" [innerHTML]="renderInlineHtml(element.content)"></h5>
          }
          @case ('h6') {
            <h6 [class]="element.css" [innerHTML]="renderInlineHtml(element.content)"></h6>
          }

          @case ('ul') {
            <ul class="my-2 ml-4 list-disc space-y-1 break-words">
              @for (item of element.items; track $index) {
                <li class="text-sm break-words" [innerHTML]="renderInlineHtml(item)"></li>
              }
            </ul>
          }

          @case ('ol') {
            <ol class="my-2 ml-4 list-decimal space-y-1 break-words">
              @for (item of element.items; track $index) {
                <li class="text-sm break-words" [innerHTML]="renderInlineHtml(item)"></li>
              }
            </ol>
          }

          @case ('table') {
            <div class="my-3 overflow-x-auto">
              <table class="min-w-full border border-foreground/10 text-sm">
                <thead class="bg-foreground/5">
                  <tr>
                    @for (head of element.headers; track $index) {
                      <th
                        class="border-b border-foreground/10 px-3 py-2 text-left font-semibold break-words"
                        [innerHTML]="renderInlineHtml(head)"
                      ></th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of element.rows; track $index) {
                    <tr class="border-b border-foreground/5 last:border-b-0">
                      @for (cell of row; track $index) {
                        <td
                          class="px-3 py-2 border-r border-foreground/5 last:border-r-0 break-words"
                          [innerHTML]="renderInlineHtml(cell)"
                        ></td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          @case ('blockquote') {
            <blockquote
              class="my-2 pl-4 border-l-4 border-current/30 opacity-80 italic break-words"
            >
              @for (line of element.lines; track $index) {
                <div class="break-words" [innerHTML]="renderInlineHtml(line)"></div>
              }
            </blockquote>
          }

          @case ('hr') {
            <hr class="my-4 border-t border-border" />
          }
          @case ('spacer') {
            <div class="h-2"></div>
          }
          @case ('p') {
            <p class="my-1 break-words" [innerHTML]="renderInlineHtml(element.content)"></p>
          }
        }
      }
    </div>
  `,
})
export class MarkdownRenderer implements ControlValueAccessor {
  content = input<string>('')
  className = input<string>('')

  private _val = signal<string>('')

  constructor(private sanitizer: DomSanitizer) {}

  parsedElements = computed(() => {
    const raw = this.content() || this._val()
    return this.parseMarkdown(raw)
  })

  // --- ControlValueAccessor ---
  onChange = (v: any) => {}
  onTouched = () => {}

  writeValue(value: any): void {
    this._val.set(value || '')
  }
  registerOnChange(fn: any): void {
    this.onChange = fn
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }

  private parseMarkdown(content: string) {
    if (!content) return []
    const lines = content.split('\n')
    const elements: any[] = []
    let i = 0
    const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm']

    while (i < lines.length) {
      const line = lines[i]

      // Code blocks
      if (line.trim().startsWith('```')) {
        const langMatch = line.trim().match(/^```(\w+)?/)
        const language = langMatch?.[1] || ''
        const codeLines: string[] = []
        i++
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i])
          i++
        }
        i++
        elements.push({ type: 'code', content: codeLines.join('\n'), lang: language })
        continue
      }

      // Headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headerMatch) {
        const level = headerMatch[1].length
        elements.push({
          type: `h${level}`,
          content: headerMatch[2],
          css: `${sizes[level - 1]} font-semibold mt-4 mb-2 first:mt-0 break-words`,
        })
        i++
        continue
      }

      // Lists (Unordered)
      if (line.match(/^[\s]*[-*+]\s+/)) {
        const items = []
        while (i < lines.length && lines[i].match(/^[\s]*[-*+]\s+/)) {
          items.push(lines[i].replace(/^[\s]*[-*+]\s+/, ''))
          i++
        }
        elements.push({ type: 'ul', items })
        continue
      }

      // Lists (Ordered)
      if (line.match(/^[\s]*\d+\.\s+/)) {
        const items = []
        while (i < lines.length && lines[i].match(/^[\s]*\d+\.\s+/)) {
          items.push(lines[i].replace(/^[\s]*\d+\.\s+/, ''))
          i++
        }
        elements.push({ type: 'ol', items })
        continue
      }

      // Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines = []
        while (
          i < lines.length &&
          lines[i].trim().startsWith('|') &&
          lines[i].trim().endsWith('|')
        ) {
          tableLines.push(lines[i].trim())
          i++
        }
        if (tableLines.length >= 2 && tableLines[1].match(/^\|[\s\-:|]+\|$/)) {
          const headers = tableLines[0]
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
          const rows = tableLines.slice(2).map((r) =>
            r
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim()),
          )
          elements.push({ type: 'table', headers, rows })
          continue
        } else {
          tableLines.forEach((tl) => elements.push({ type: 'p', content: tl }))
          continue
        }
      }

      // Blockquotes
      if (line.trim().startsWith('>')) {
        const quoteLines = []
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''))
          i++
        }
        elements.push({ type: 'blockquote', lines: quoteLines })
        continue
      }

      // HR
      if (line.match(/^[\s]*[-*_]{3,}[\s]*$/)) {
        elements.push({ type: 'hr' })
        i++
        continue
      }

      // Blank or Paragraph
      if (line.trim() === '') {
        elements.push({ type: 'spacer' })
      } else {
        elements.push({ type: 'p', content: line })
      }
      i++
    }
    return elements
  }

  renderInlineHtml(text: string): SafeHtml {
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // Code
    html = html.replace(
      /`([^`]+)`/g,
      '<code class="px-1.5 py-0.5 bg-foreground/10 rounded text-xs font-mono border border-foreground/20">$1</code>',
    )

    // Bold Links & Italic Links
    html = html.replace(
      /\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/g,
      '<strong class="font-semibold"><a href="$2" target="_blank" rel="noopener" class="text-primary hover:underline">$1</a></strong>',
    )
    html = html.replace(
      /\*\[([^\]]+)\]\(([^)]+)\)\*/g,
      '<em class="italic"><a href="$2" target="_blank" rel="noopener" class="text-primary hover:underline">$1</a></em>',
    )

    // Normal Links
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="text-primary hover:underline">$1</a>',
    )

    // Bold / Italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    html = html.replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>')
    html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    html = html.replace(/_(.+?)_/g, '<em class="italic">$1</em>')

    return this.sanitizer.bypassSecurityTrustHtml(html)
  }
}
