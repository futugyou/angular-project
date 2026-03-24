import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  input,
  output,
  ElementRef,
  viewChild,
} from '@angular/core'
import { NgIconComponent } from '@ng-icons/core'
import { CdkScrollable } from '@angular/cdk/scrolling'
import {
  SAMPLE_ENTITIES,
  type SampleEntity,
  getDifficultyColor,
} from '../../../data/gallery/sample-entities'

import { BadgeComponent } from '../../ui/badge.component'
import {
  CardDirective,
  CardContentDirective,
  CardDescriptionDirective,
  CardFooterDirective,
  CardHeaderDirective,
  CardTitleDirective,
} from '../../../directives/card.directives'
import { ButtonDirective } from '../../../directives/button.directive'
import { SetupInstructionsModal } from './setup-instructions-modal.component'
import { cn } from '../../../lib/utils'

@Component({
  selector: 'app-sample-entity-card',
  standalone: true,
  imports: [
    NgIconComponent,
    BadgeComponent,
    ButtonDirective,
    CardDirective,
    CardContentDirective,
    CardDescriptionDirective,
    CardFooterDirective,
    CardHeaderDirective,
    CardTitleDirective,
    SetupInstructionsModal,
  ],
  template: `
    <div
      ui-card
      class="hover:shadow-md transition-shadow duration-200 h-full flex flex-col overflow-hidden w-full"
    >
      <div ui-card-header class="pb-3 min-w-0">
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <ng-icon [name]="typeIcon()" class="h-5 w-5" />
            <app-badge variant="secondary" class="text-xs">
              {{ sample().type }}
            </app-badge>
          </div>
          <app-badge variant="outline" [class]="cn('text-xs border', difficultyColor())">
            {{ sample().difficulty }}
          </app-badge>
        </div>

        <div ui-card-title class="text-lg leading-tight">{{ sample().name }}</div>
        <div ui-card-description class="text-sm line-clamp-3">
          {{ sample().description }}
        </div>
      </div>

      <div ui-card-content class="pt-0 flex-1 min-w-0 overflow-hidden">
        <div class="space-y-3 min-w-0">
          <div class="flex flex-wrap gap-1">
            @for (tag of sample().tags.slice(0, 3); track tag) {
              <app-badge variant="outline" class="text-xs">
                {{ tag }}
              </app-badge>
            }
            @if (sample().tags.length > 3) {
              <app-badge variant="outline" class="text-xs">
                +{{ sample().tags.length - 3 }}
              </app-badge>
            }
          </div>

          @if (sample().requiredEnvVars && sample().requiredEnvVars!.length > 0) {
            <details class="group min-w-0 max-w-full overflow-hidden">
              <summary
                class="cursor-pointer list-none p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors flex items-center justify-between gap-2"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <ng-icon
                    name="lucideKey"
                    class="h-3.5 w-3.5 text-amber-600 dark:text-amber-500 shrink-0"
                  />
                  <span class="text-xs font-medium text-amber-900 dark:text-amber-100 truncate">
                    Requires {{ sample().requiredEnvVars!.length }} env var{{
                      sample().requiredEnvVars!.length > 1 ? 's' : ''
                    }}
                  </span>
                </div>
                <ng-icon
                  name="lucideChevronDown"
                  class="h-3 w-3 text-amber-600 dark:text-amber-500 shrink-0 group-open:rotate-180 transition-transform"
                />
              </summary>
              <div
                class="mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md space-y-2 min-w-0 max-w-full overflow-hidden"
              >
                @for (envVar of sample().requiredEnvVars; track envVar.name) {
                  <div class="text-xs min-w-0 max-w-full overflow-hidden">
                    <div
                      class="font-mono font-medium text-amber-900 dark:text-amber-100 wrap-break-word"
                    >
                      {{ envVar.name }}
                    </div>
                    <div class="text-amber-700 dark:text-amber-300 mt-0.5 wrap-break-word">
                      {{ envVar.description }}
                    </div>
                    @if (envVar.example) {
                      <div class="font-mono text-amber-600 dark:text-amber-400 mt-0.5 break-all">
                        {{ envVar.example }}
                      </div>
                    }
                  </div>
                }
              </div>
            </details>
          }

          <div class="space-y-2">
            <div class="text-xs font-medium text-muted-foreground">Key Features:</div>
            <ul class="text-xs space-y-1">
              @for (feature of sample().features.slice(0, 3); track feature) {
                <li class="flex items-center gap-1">
                  <div class="w-1 h-1 rounded-full bg-current opacity-50"></div>
                  <span>{{ feature }}</span>
                </li>
              }
            </ul>
          </div>
        </div>
      </div>

      <div ui-card-footer class="pt-3 flex-col gap-3">
        <div class="w-full flex items-center justify-between text-xs text-muted-foreground">
          <div class="flex items-center gap-1">
            <ng-icon name="lucideUser" class="h-3 w-3" />
            <span>{{ sample().author }}</span>
          </div>
        </div>

        <div class="w-full flex gap-2">
          <a
            [appButton]
            class="flex-1"
            size="sm"
            [href]="sample().url"
            [download]="sample().id + '.py'"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ng-icon name="lucideDownload" class="h-4 w-4 mr-2" />
            Download
          </a>
          <button
            [appButton]
            variant="outline"
            class="flex-1"
            size="sm"
            (click)="showInstructions.set(true)"
          >
            <ng-icon name="lucideBookOpen" class="h-4 w-4 mr-2" />
            Setup Guide
          </button>
        </div>
      </div>
    </div>

    <app-setup-instructions-modal
      [sample]="sample()"
      [open]="showInstructions()"
      (openChange)="showInstructions.set($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleEntityCardComponent {
  sample = input.required<SampleEntity>()
  showInstructions = signal(false)
  cn = cn

  typeIcon = computed(() => (this.sample().type === 'workflow' ? 'lucideWorkflow' : 'lucideBot'))
  difficultyColor = computed(() => getDifficultyColor(this.sample().difficulty))
}

@Component({
  selector: 'app-sample-entity-grid',
  standalone: true,
  imports: [SampleEntityCardComponent],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      @for (sample of samples(); track sample.id) {
        <div class="min-w-0">
          <app-sample-entity-card [sample]="sample" />
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleEntityGridComponent {
  samples = input.required<SampleEntity[]>()
}

@Component({
  selector: 'app-gallery-view',
  standalone: true,
  imports: [SampleEntityGridComponent, NgIconComponent, ButtonDirective, CdkScrollable],
  template: `
    @if (variant() === 'inline') {
      <div class="flex-1 overflow-auto" cdkScrollable>
        <div class="max-w-7xl mx-auto px-6 py-8">
          <div class="mb-8 p-4 bg-muted/50 border border-border rounded-lg">
            <div class="flex items-start gap-3">
              <ng-icon name="lucideTriangleAlert" class="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div class="flex-1">
                <h3 class="font-semibold mb-1">No agents or workflows configured yet!</h3>
                <p class="text-sm text-muted-foreground mb-2">
                  You can configure agents or workflows by running
                  <code class="px-1.5 py-0.5 bg-background rounded text-xs">devui</code>
                  in a directory.
                </p>
                <p class="text-sm text-muted-foreground">
                  Browse the sample agents and workflows below. Download them, review the code, and
                  run them locally.
                </p>
              </div>
            </div>
          </div>

          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-4">Sample Gallery</h3>
            <app-sample-entity-grid [samples]="SAMPLE_ENTITIES" />
          </div>

          <div class="text-center mt-12 pt-8 border-t">
            <p class="text-sm text-muted-foreground">
              Want to create your own? Check out the
              <a
                href="https://github.com/microsoft/agent-framework"
                target="_blank"
                class="text-primary hover:underline"
                >documentation</a
              >
            </p>
          </div>
        </div>
      </div>
    } @else if (variant() === 'route') {
      <div class="h-full overflow-auto" cdkScrollable>
        <div class="max-w-7xl mx-auto px-6 py-8">
          <div class="mb-8">
            @if (hasExistingEntities()) {
              <div class="mb-4">
                <button [appButton] ariant="ghost" (click)="onClose.emit()" class="gap-2">
                  <ng-icon name="lucideArrowLeft" class="h-4 w-4" />
                  Back
                </button>
              </div>
            }
            <div class="text-center">
              <h2 class="text-2xl font-semibold mb-2">Sample Gallery</h2>
              <p class="text-muted-foreground max-w-2xl mx-auto">
                Browse sample agents and workflows to learn the Agent Framework. Download these
                curated examples and run them locally.
              </p>
            </div>
          </div>

          <app-sample-entity-grid [samples]="SAMPLE_ENTITIES" />

          <div class="text-center mt-12 pt-8 border-t">
            <p class="text-sm text-muted-foreground">
              Want to create your own? Check out the
              <a
                href="https://github.com/microsoft/agent-framework"
                target="_blank"
                class="text-primary hover:underline"
                >documentation</a
              >
            </p>
          </div>
        </div>
      </div>
    } @else {
      <app-sample-entity-grid [samples]="SAMPLE_ENTITIES" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalleryViewComponent {
  variant = input<'inline' | 'route' | 'modal'>('inline')
  hasExistingEntities = input<boolean>(false)
  onClose = output<void>()

  protected readonly SAMPLE_ENTITIES = SAMPLE_ENTITIES
}
