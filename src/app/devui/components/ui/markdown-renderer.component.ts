import { Component, computed, input, signal, forwardRef, inject } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { CodeBlock } from './code-block.component'

@Component({
  selector: 'app-markdown-renderer',
  standalone: true,
  imports: [CodeBlock],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownRendererComponent),
      multi: true,
    },
  ],
  template: `
    <div [class]="'markdown-content wrap-break-word ' + className()">
      @for (el of elements(); track $index) {
        @switch (el.type) {
          @case ('code') {
            <app-code-block [code]="el.content" [language]="el.lang" />
          }
          @case ('h') {
            <div [class]="el.css" [innerHTML]="el.safeHtml"></div>
          }
          @case ('list') {
            @switch (el.listType) {
              @case ('ul') {
                <ul class="my-2 ml-4 list-disc space-y-1 wrap-break-word">
                  @for (item of el.items; track $index) {
                    <li class="text-sm wrap-break-word" [innerHTML]="item"></li>
                  }
                </ul>
              }
              @case ('ol') {
                <ol class="my-2 ml-4 list-decimal space-y-1 wrap-break-word">
                  @for (item of el.items; track $index) {
                    <li class="text-sm wrap-break-word" [innerHTML]="item"></li>
                  }
                </ol>
              }
            }
          }
          @case ('table') {
            <div class="my-3 overflow-x-auto">
              <table class="min-w-full border border-foreground/10 text-sm">
                <thead class="bg-foreground/5">
                  <tr>
                    @for (h of el.headers; track $index) {
                      <th
                        class="border-b border-foreground/10 px-3 py-2 text-left font-semibold wrap-break-word"
                        [innerHTML]="h"
                      ></th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of el.rows; track $index) {
                    <tr class="border-b border-foreground/5 last:border-b-0">
                      @for (cell of row; track $index) {
                        <td
                          class="px-3 py-2 border-r border-foreground/5 last:border-r-0 wrap-break-word"
                          [innerHTML]="cell"
                        ></td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          @case ('quote') {
            <blockquote
              class="my-2 pl-4 border-l-4 border-current/30 opacity-80 italic wrap-break-word"
            >
              @for (line of el.lines; track $index) {
                <div class="wrap-break-word" [innerHTML]="line"></div>
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
            <p class="my-1 wrap-break-word" [innerHTML]="el.safeHtml"></p>
          }
        }
      }
    </div>
  `,
})
export class MarkdownRendererComponent implements ControlValueAccessor {
  private sanitizer = inject(DomSanitizer)

  // Inputs
  className = input<string>('')
  content = input<string>('')

  // ControlValueAccessor State
  private _formValue = signal<string>('')
  disabled = signal(false)

  private effectiveContent = computed(() => this.content() || this._formValue())

  elements = computed(() => {
    const text = this.effectiveContent()
    if (!text) return []

    const lines = text.split('\n')
    const result: any[] = []
    let i = 0

    const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm']

    while (i < lines.length) {
      const line = lines[i]

      // 1. Code Blocks
      if (line.trim().startsWith('```')) {
        const lang = line.trim().match(/^```(\w+)?/)?.[1] || ''
        const codeRows = []
        i++
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeRows.push(lines[i++])
        }
        i++
        result.push({ type: 'code', content: codeRows.join('\n'), lang })
        continue
      }

      // 2. Headers
      const hMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (hMatch) {
        const level = hMatch[1].length
        result.push({
          type: 'h',
          level,
          safeHtml: this.parseInline(hMatch[2]),
          css: `${sizes[level - 1]} font-semibold mt-4 mb-2 first:mt-0`,
        })
        i++
        continue
      }

      // 3. Lists
      const ulMatch = line.match(/^[\s]*[-*+]\s+/)
      const olMatch = line.match(/^[\s]*\d+\.\s+/)
      if (ulMatch || olMatch) {
        const listType = ulMatch ? 'ul' : 'ol'
        const regex = ulMatch ? /^[\s]*[-*+]\s+/ : /^[\s]*\d+\.\s+/
        const items = []
        while (i < lines.length && lines[i].match(regex)) {
          items.push(this.parseInline(lines[i++].replace(regex, '')))
        }
        result.push({ type: 'list', listType, items })
        continue
      }

      // 4. Tables
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tLines = []
        while (
          i < lines.length &&
          lines[i].trim().startsWith('|') &&
          lines[i].trim().endsWith('|')
        ) {
          tLines.push(lines[i++].trim())
        }
        if (tLines.length >= 2 && tLines[1].match(/^\|[\s\-:|]+\|$/)) {
          const headers = tLines[0]
            .split('|')
            .slice(1, -1)
            .map((c) => this.parseInline(c.trim()))
          const rows = tLines.slice(2).map((r) =>
            r
              .split('|')
              .slice(1, -1)
              .map((c) => this.parseInline(c.trim())),
          )
          result.push({ type: 'table', headers, rows })
          continue
        }
        tLines.forEach((l) => result.push({ type: 'p', safeHtml: this.parseInline(l) }))
        continue
      }

      // 5. Blockquotes
      if (line.trim().startsWith('>')) {
        const qLines = []
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          qLines.push(this.parseInline(lines[i++].replace(/^>\s?/, '')))
        }
        result.push({ type: 'quote', lines: qLines })
        continue
      }

      // 6. HR / Spacer / P
      if (line.match(/^[\s]*[-*_]{3,}[\s]*$/)) {
        result.push({ type: 'hr' })
      } else if (line.trim() === '') {
        result.push({ type: 'spacer' })
      } else {
        result.push({ type: 'p', safeHtml: this.parseInline(line) })
      }
      i++
    }
    return result
  })

  private parseInline(text: string): SafeHtml {
    let h = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // Inline Code
    h = h.replace(
      /`([^`]+)`/g,
      '<code class="px-1.5 py-0.5 bg-foreground/10 rounded text-xs font-mono border border-foreground/20">$1</code>',
    )
    // Bold/Italic Links
    h = h.replace(
      /\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/g,
      '<strong class="font-semibold"><a href="$2" target="_blank" rel="noopener" class="text-primary hover:underline">$1</a></strong>',
    )
    h = h.replace(
      /\*\[([^\]]+)\]\(([^)]+)\)\*/g,
      '<em class="italic"><a href="$2" target="_blank" rel="noopener" class="text-primary hover:underline">$1</a></em>',
    )
    // Links
    h = h.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener" class="text-primary hover:underline">$1</a>',
    )
    // Bold
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    h = h.replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    h = h.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    h = h.replace(/_(.+?)_/g, '<em class="italic">$1</em>')

    return this.sanitizer.bypassSecurityTrustHtml(h)
  }

  // CVA Implementation
  onChange = (_: any) => {}
  onTouched = () => {}

  writeValue(v: any): void {
    this._formValue.set(v || '')
  }
  registerOnChange(fn: any): void {
    this.onChange = fn
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }
  setDisabledState?(isDisabled: boolean): void {
    this.disabled.set(isDisabled)
  }
}
