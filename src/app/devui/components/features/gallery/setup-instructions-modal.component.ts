import { Component, input, model, computed, signal, inject, effect } from '@angular/core'
import { NgIconComponent } from '@ng-icons/core'

import { SampleEntity } from '../../../data/gallery/sample-entities'

import { ButtonComponent } from '../../ui/button.component'
import { ScrollArea } from '../../ui/scroll-area.component'
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert.component'
import {
  DialogCloseComponent,
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from '../../ui/dialog.component'

@Component({
  selector: 'app-code-block',
  standalone: true,
  imports: [NgIconComponent, ButtonComponent],
  template: `
    <div class="relative group">
      <pre class="bg-muted p-3 rounded-md text-sm overflow-x-auto font-mono">
        <code>{{ content() }}</code>
      </pre>
      @if (copyable()) {
        <button
          [appButton]
          variant="ghost"
          size="sm"
          class="absolute top-2 right-2 h-6 w-6 p-0"
          (click)="handleCopy()"
        >
          <ng-icon [name]="copied() ? 'lucCheck' : 'lucCopy'" class="h-3 w-3" />
        </button>
      }
    </div>
  `,
})
export class CodeBlockComponent {
  content = input.required<string>()
  copyable = input(false)

  protected copied = signal(false)

  handleCopy() {
    navigator.clipboard.writeText(this.content())
    this.copied.set(true)
    setTimeout(() => this.copied.set(false), 2000)
  }
}

@Component({
  selector: 'app-setup-step',
  standalone: true,
  imports: [CodeBlockComponent],
  template: `
    <div class="flex gap-4">
      <div class="flex-shrink-0">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold"
        >
          {{ number() }}
        </div>
      </div>
      <div class="flex-1 space-y-2 text-left">
        <h4 class="font-semibold">{{ title() }}</h4>
        @if (description()) {
          <p class="text-sm text-muted-foreground">{{ description() }}</p>
        }
        @if (code()) {
          <app-code-block [content]="code()!" [copyable]="copyable()" />
        }
        <ng-content />
      </div>
    </div>
  `,
})
export class SetupStepComponent {
  number = input.required<number>()
  title = input.required<string>()
  description = input<string>()
  code = input<string>()
  copyable = input(false)
}

@Component({
  selector: 'app-setup-instructions-modal',
  standalone: true,
  imports: [
    NgIconComponent,
    CodeBlockComponent,
    SetupStepComponent,
    DialogCloseComponent,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    ScrollArea,
    ButtonComponent,
    Alert,
    AlertTitle,
    AlertDescription,
  ],
  template: `
    <app-dialog [(open)]="open">
      <app-dialog-content class="max-w-3xl">
        <app-dialog-header class="px-6 pt-6 pb-2">
          <app-dialog-title>Setup: {{ sample().name }}</app-dialog-title>
          <app-dialog-close (close)="open.set(false)" />
          <p class="text-sm text-muted-foreground">
            Follow these steps to run this sample {{ sample().type }} locally
          </p>
        </app-dialog-header>

        <div class="px-6 pb-6">
          <app-scroll-area class="h-[500px]">
            <div class="space-y-6 pr-4 pt-4">
              <app-setup-step [number]="1" title="Download the sample file">
                <button [appButton] size="sm">
                  <a
                    [href]="sample().url"
                    [download]="sample().id + '.py'"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center"
                  >
                    <ng-icon name="lucDownload" class="h-4 w-4 mr-2" />
                    Download {{ sample().id }}.py
                  </a>
                </button>
              </app-setup-step>

              <app-setup-step
                [number]="2"
                title="Create a project folder"
                description="Create a dedicated folder for this sample and move the downloaded file there:"
                [code]="
                  'mkdir -p ~/my-agents/' +
                  sample().id +
                  '\\nmv ~/Downloads/' +
                  sample().id +
                  '.py ~/my-agents/' +
                  sample().id +
                  '/'
                "
                [copyable]="true"
              />

              @if (hasEnvVars()) {
                <app-setup-step
                  [number]="3"
                  title="Set up environment variables"
                  description="Create a .env file in the project folder with these required variables:"
                  [code]="envVarsCode()"
                  [copyable]="true"
                />
              }

              <app-setup-step
                [number]="4 + stepOffset()"
                title="Run with DevUI"
                description="Navigate to the folder and start DevUI:"
                [code]="'cd ~/my-agents/' + sample().id + '\\ndevui .'"
                [copyable]="true"
              />

              <app-alert>
                <ng-icon name="lucLightbulb" class="h-4 w-4" />
                <app-alert-title>Alternative: Run Programmatically</app-alert-title>
                <app-alert-description>
                  <p class="mb-2 mt-2">
                    You can also run the {{ sample().type }} directly in Python:
                  </p>
                  <app-code-block [copyable]="true" [content]="programmaticCode()" />
                </app-alert-description>
              </app-alert>

              <div class="flex gap-2 pt-4 border-t">
                <button [appButton] variant="outline" size="sm">
                  <a
                    [href]="sample().url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center"
                  >
                    <ng-icon name="lucExternalLink" class="h-4 w-4 mr-2" />
                    View Source
                  </a>
                </button>
                <button [appButton] variant="outline" size="sm">
                  <a
                    href="https://github.com/microsoft/agent-framework#readme"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center"
                  >
                    <ng-icon name="lucBookOpen" class="h-4 w-4 mr-2" />
                    Documentation
                  </a>
                </button>
              </div>
            </div>
          </app-scroll-area>
        </div>
      </app-dialog-content>
    </app-dialog>
  `,
})
export class SetupInstructionsModal {
  // Input Signals
  sample = input.required<SampleEntity>()

  // Model Signal
  open = model.required<boolean>()

  // Computed state
  hasEnvVars = computed(() => !!this.sample().requiredEnvVars?.length)
  stepOffset = computed(() => (this.hasEnvVars() ? 0 : -1))

  envVarsCode = computed(() => {
    return (
      this.sample()
        .requiredEnvVars?.map(
          (v) => `${v.name}=${v.example || 'your-value-here'}\n# ${v.description}`,
        )
        .join('\n\n') || ''
    )
  })

  programmaticCode = computed(() => {
    const s = this.sample()
    return `from ${s.id} import ${s.type}
import asyncio

async def main():
    response = await ${s.type}.run("Hello!")
    print(response)

asyncio.run(main())`
  })
}
