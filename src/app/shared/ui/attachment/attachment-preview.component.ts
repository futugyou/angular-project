import { Component, input, output } from '@angular/core'

import { AttachmentItem } from '../types'
import { NgIconsModule } from '@ng-icons/core'

@Component({
  selector: 'app-attachment-preview',
  standalone: true,
  imports: [NgIconsModule],
  template: `
    <div
      class="relative w-16 h-16 rounded border overflow-hidden group cursor-pointer"
      [title]="attachment().file.name"
    >
      @switch (attachment().type) {
        @case ('image') {
          @if (attachment().preview) {
            <img
              [src]="attachment().preview"
              [alt]="attachment().file.name"
              class="w-full h-full object-cover"
            />
          } @else {
            <div class="flex items-center justify-center w-full h-full bg-gray-200">
              <ng-icon name="lucideImage" class="h-6 w-6 text-gray-400"></ng-icon>
            </div>
          }
        }
        @case ('pdf') {
          <div class="flex flex-col items-center justify-center w-full h-full bg-red-50">
            <ng-icon name="lucideFileText" class="h-6 w-6 text-red-500 mb-1"></ng-icon>
            <span class="text-xs text-red-600">PDF</span>
          </div>
        }
        @case ('audio') {
          <div class="flex flex-col items-center justify-center w-full h-full bg-purple-50">
            <ng-icon name="lucideMusic" class="h-6 w-6 text-purple-500 mb-1"></ng-icon>
            <span class="text-xs text-purple-600">AUDIO</span>
          </div>
        }
        @default {
          <div class="flex flex-col items-center justify-center w-full h-full bg-gray-100">
            <ng-icon name="lucideFileText" class="h-6 w-6 text-gray-500 mb-1"></ng-icon>
            <span class="text-xs text-gray-600">FILE</span>
          </div>
        }
      }

      <div
        (click)="remove.emit()"
        class="absolute inset-0 bg-black/60 flex items-center justify-center transition-all duration-200 ease-in-out opacity-0 group-hover:opacity-100 backdrop-blur-sm"
      >
        <div class="scale-75 group-hover:scale-100 transition-all duration-200">
          <ng-icon name="lucideTrash2" class="h-5 w-5 text-white drop-shadow-lg"></ng-icon>
        </div>
      </div>

      <div
        class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        {{ attachment().file.name }}
      </div>
    </div>
  `,
})
export class AttachmentPreviewComponent {
  attachment = input.required<AttachmentItem>()
  remove = output<void>()
}
