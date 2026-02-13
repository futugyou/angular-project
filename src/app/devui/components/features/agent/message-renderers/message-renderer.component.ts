import { Component, computed, input, type Signal } from '@angular/core'
import type { ConversationItem } from '../../../../types'
import {
  OpenAIContentRendererComponent,
  FunctionCallRendererComponent,
  FunctionResultRendererComponent,
} from './content-renderer.component'

@Component({
  selector: 'app-openai-message-renderer',
  standalone: true,
  imports: [
    OpenAIContentRendererComponent,
    FunctionCallRendererComponent,
    FunctionResultRendererComponent,
  ],
  template: `
    <div [class]="className()">
      @if (messageItem(); as res) {
        @for (content of res.content; track $index) {
          <openai-content-renderer
            [content]="content"
            [class]="$index > 0 ? 'mt-2' : ''"
            [isStreaming]="isStreaming()"
          />
        }

        @if (showTypingIndicator()) {
          <div class="flex items-center space-x-1">
            <div class="flex space-x-1">
              <div
                class="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]"
              ></div>
              <div
                class="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]"
              ></div>
              <div class="h-2 w-2 animate-bounce rounded-full bg-current"></div>
            </div>
          </div>
        }
      } @else if (functionCallItem(); as res) {
        <function-call-renderer [name]="res.name" [arguments]="res.arguments" />
      } @else if (functionResultItem(); as res) {
        <function-result-renderer [output]="res.output" [callId]="res.call_id" />
      }
    </div>
  `,
  host: {
    '[class]': 'className()',
  },
})
export class OpenAIMessageRenderer {
  // Inputs using Signal API
  item = input.required<ConversationItem>()
  className = input<string>('')

  protected messageItem = computed(() => {
    const it = this.item()
    return it.type === 'message' ? it : null
  })

  protected functionCallItem = computed(() => {
    const it = this.item()
    return it.type === 'function_call' ? it : null
  })

  protected functionResultItem = computed(() => {
    const it = this.item()
    return it.type === 'function_call_output' ? it : null
  })

  // Derived state using Computed Signals
  protected isStreaming: Signal<boolean> = computed(
    () => this.item().type === 'message' && this.item().status === 'in_progress',
  )

  protected hasContent: Signal<boolean> = computed(() => {
    const it = this.item()
    return it.type === 'message' && it.content.length > 0
  })

  protected showTypingIndicator: Signal<boolean> = computed(
    () => this.isStreaming() && !this.hasContent(),
  )
}
