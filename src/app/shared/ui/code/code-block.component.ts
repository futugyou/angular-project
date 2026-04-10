import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core'

import { NgIconComponent } from '@ng-icons/core'

@Component({
  selector: 'app-code-block',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    <div class="relative group">
      <pre
        class="my-3 p-3 bg-foreground/5 dark:bg-foreground/10 rounded overflow-x-auto border border-foreground/10"
        [class.pt-7]="language()"
      ><code class="text-xs font-mono block whitespace-pre-wrap wrap-break-word">{{ formattedCode() }}</code></pre>

      @if (language()) {
        <span class="absolute top-2 left-2 opacity-60 text-[10px] mb-1 block uppercase">{{
          language()
        }}</span>
      }
      <button
        (click)="handleCopy()"
        class="absolute top-2 right-2 p-1.5 rounded-md border shadow-sm
               bg-background hover:bg-accent text-muted-foreground hover:text-foreground
               transition-all duration-200 opacity-0 group-hover:opacity-100"
        [title]="copied() ? 'Copied!' : 'Copy code'"
      >
        <ng-icon
          [name]="copied() ? 'lucideCheck' : 'lucideCopy'"
          [class.text-green-600]="copied()"
          size="14"
        />
      </button>
    </div>
  `,
})
export class CodeBlockComponent {
  codeText = input.required<string>({ alias: 'code' })
  language = input<string>('')

  private _destroyRef = inject(DestroyRef)
  copied = signal(false)
  private _timer: any
  formattedCode = computed(() => this.codeText().trim())

  async handleCopy() {
    try {
      await navigator.clipboard.writeText(this.formattedCode())
      this.copied.set(true)
      clearTimeout(this._timer)
      this._timer = setTimeout(() => this.copied.set(false), 2000)
      this._destroyRef.onDestroy(() => clearTimeout(this._timer))
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
}
