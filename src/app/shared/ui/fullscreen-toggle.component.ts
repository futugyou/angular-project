import { Component } from '@angular/core'
import { LayoutService } from '../services/layout.service'
import { NgIconComponent } from '@ng-icons/core'
import { CdkDrag } from '@angular/cdk/drag-drop'

@Component({
  selector: 'app-fullscreen-toggle',
  standalone: true,
  imports: [NgIconComponent, CdkDrag],
  template: `
    <div
      cdkDrag
      cdkDragBoundary="body"
      class="fixed bottom-10 right-10 z-50 cursor-grab active:cursor-grabbing group"
    >
      <button
        (click)="toggleLayout()"
        class="bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:bg-blue-700 transition-all duration-300 transform group-hover:scale-110 active:scale-95"
        title="{{ layoutService.isFullScreen() ? 'Exit fullscreen' : 'Enter fullscreen' }}"
      >
        @if (!layoutService.isFullScreen()) {
          <ng-icon name="lucideMaximize" class="text-2xl"></ng-icon>
        } @else {
          <ng-icon name="lucideMinimize" class="text-2xl"></ng-icon>
        }
      </button>

      <div
        class="absolute -top-3 -left-3 bg-white text-gray-500 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path
            d="M3 2h1v1H3zM3 4h1v1H3zM3 6h1v1H3zM5 2h1v1H5zM5 4h1v1H5zM5 6h1v1H5z"
            fill="currentColor"
          ></path>
        </svg>
      </div>
    </div>
  `,
  styles: [
    `
      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
      .cdk-drag-placeholder {
        opacity: 0.2;
      }
    `,
  ],
})
export class FullscreenToggleComponent {
  constructor(public layoutService: LayoutService) {}

  toggleLayout() {
    this.layoutService.toggleFullScreen()
  }
}
