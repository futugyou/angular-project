import { Component, input, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core'
import { NgIconComponent, provideIcons } from '@ng-icons/core'
import { OpenAIMessageRenderer } from './message-renderers/message-renderer.component'
import { ButtonComponent } from '../../ui/button.component'
import { DevUIStore } from '../../../stores/devuiStore'
import type {
  ConversationItem,
  ConversationFunctionCall,
  ConversationFunctionCallOutput,
  MessageTextContent,
} from '../../../types'
import { ConversationMessage } from '../../../types/openai'

@Component({
  selector: 'app-conversation-item-bubble',
  standalone: true,
  imports: [NgIconComponent, OpenAIMessageRenderer, ButtonComponent],
  template: `
    @if (asMessage(); as msg) {
      <div
        class="flex gap-3"
        [class.flex-row-reverse]="isUser()"
        (mouseenter)="isHovered.set(true)"
        (mouseleave)="isHovered.set(false)"
      >
        <div
          class="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border"
          [class]="avatarClass()"
        >
          <ng-icon [name]="iconName()" class="h-4 w-4" />
        </div>

        <div
          class="flex flex-col space-y-1 max-w-[80%]"
          [class.items-end]="isUser()"
          [class.items-start]="!isUser()"
        >
          <div class="relative group">
            <div class="rounded px-3 py-2 text-sm" [class]="bubbleClass()">
              @if (isError()) {
                <div class="flex items-start gap-2 mb-2">
                  <ng-icon
                    name="lucideAlertCircle"
                    class="h-4 w-4 text-orange-500 mt-0.5 shrink-0"
                  />
                  <span class="font-medium text-sm">Unable to process request</span>
                </div>
              }
              <div
                [class.text-xs]="isError()"
                [class.leading-relaxed]="isError()"
                [class.break-all]="isError()"
              >
                <app-openai-message-renderer [item]="msg" />
              </div>
            </div>

            @if (messageText() && isHovered()) {
              <button
                [appButton]
                (click)="handleCopy()"
                class="absolute top-1 right-1 p-1.5 rounded-md border shadow-sm bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200 opacity-100"
                [title]="copied() ? 'Copied!' : 'Copy message'"
              >
                <ng-icon
                  [name]="copied() ? 'lucideCheckCheck' : 'lucideCopy'"
                  [class.text-green-600]="copied()"
                  class="h-3.5 w-3.5"
                />
              </button>
            }
          </div>

          <div class="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>{{ formattedTime() }}</span>

            @if (!isUser() && msg.usage; as usage) {
              <span>•</span>
              <span class="flex items-center gap-1">
                <span class="text-blue-600 dark:text-blue-400">↑{{ usage.input_tokens }}</span>
                <span class="text-green-600 dark:text-green-400">↓{{ usage.output_tokens }}</span>
                <span>({{ usage.total_tokens }} tokens)</span>
              </span>
            }

            @if (!isUser() && showToolCalls() && toolCalls().length > 0) {
              <span>•</span>
              <button
                [appButton]
                (click)="showToolDetails.set(!showToolDetails())"
                class="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <ng-icon name="lucideWrench" class="h-3 w-3" />
                <span>{{ toolCalls().length }}</span>
              </button>
            }
          </div>

          @if (!isUser() && showToolDetails() && toolCalls().length > 0) {
            <div class="mt-2 ml-0 p-3 bg-muted/30 rounded-md border border-muted">
              <div class="space-y-2">
                @for (call of toolCalls(); track call.id) {
                  @let result = getToolResult(call.call_id);
                  <div class="text-xs">
                    <div class="flex items-start gap-2">
                      <ng-icon
                        name="lucWrench"
                        class="h-3 w-3 text-muted-foreground mt-0.5 shrink-0"
                      />
                      <div class="flex-1 min-w-0">
                        <div class="font-mono text-muted-foreground">
                          <span class="text-blue-600 dark:text-blue-400">{{ call.name }}</span>
                          @if (call.arguments) {
                            <span class="text-muted-foreground/60 ml-1 break-all"
                              >({{ call.arguments }})</span
                            >
                          }
                        </div>

                        @if (result && result.output) {
                          <div class="mt-1 pl-5 border-l-2 border-green-600/20">
                            <div class="flex items-start gap-1">
                              <ng-icon
                                name="lucCheck"
                                class="h-3 w-3 text-green-600 mt-0.5 shrink-0"
                              />
                              <pre
                                class="font-mono text-muted-foreground whitespace-pre-wrap break-all"
                                >{{ truncate(result.output) }}</pre
                              >
                            </div>
                          </div>
                        }

                        @if (call.status === 'incomplete') {
                          <div class="mt-1 pl-5 border-l-2 border-orange-600/20">
                            <div class="flex items-start gap-1">
                              <ng-icon
                                name="lucX"
                                class="h-3 w-3 text-orange-600 mt-0.5 shrink-0"
                              />
                              <span class="font-mono text-orange-600">Failed</span>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationItemBubble {
  item = input.required<ConversationItem>()
  toolCalls = input<ConversationFunctionCall[]>([])
  toolResults = input<ConversationFunctionCallOutput[]>([])

  isHovered = signal(false)
  copied = signal(false)
  showToolDetails = signal(false)

  private devStore = inject(DevUIStore)
  showToolCalls = computed(() => this.devStore.showToolCalls)

  asMessage = computed(() => {
    const i = this.item()
    return i.type === 'message' ? (i as ConversationMessage) : null
  })

  isUser = computed(() => this.asMessage()?.role === 'user')
  isError = computed(() => this.asMessage()?.status === 'incomplete')

  iconName = computed(() => {
    if (this.isUser()) return 'lucUser'
    return this.isError() ? 'lucAlertCircle' : 'lucBot'
  })

  avatarClass = computed(() => {
    if (this.isUser()) return 'bg-primary text-primary-foreground'
    if (this.isError()) return 'bg-orange-100 dark:bg-orange-900 text-orange-600 border-orange-200'
    return 'bg-muted'
  })

  bubbleClass = computed(() => {
    if (this.isUser()) return 'bg-primary text-primary-foreground'
    if (this.isError())
      return 'bg-orange-50 dark:bg-orange-950/50 text-orange-800 border border-orange-200'
    return 'bg-muted'
  })

  messageText = computed(() => {
    const msg = this.asMessage()
    if (msg) {
      return msg.content
        .filter((c): c is MessageTextContent => c.type === 'text')
        .map((c) => c.text)
        .join('\n')
    }
    return ''
  })

  formattedTime = computed(() => {
    const time = this.item().created_at
    return time ? new Date(time * 1000).toLocaleTimeString() : new Date().toLocaleTimeString()
  })

  getToolResult(callId: string): ConversationFunctionCallOutput | undefined {
    return this.toolResults().find((r) => r.call_id === callId)
  }

  truncate(text: string | undefined): string {
    if (!text) return ''
    return text.length > 200 ? text.substring(0, 200) + '...' : text
  }

  async handleCopy() {
    const text = this.messageText()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      this.copied.set(true)
      setTimeout(() => this.copied.set(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
}
