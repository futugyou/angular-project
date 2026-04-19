import { Component, signal } from '@angular/core'
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { CommonModule } from '@angular/common'
import { ScrollAreaComponent } from '@shared/ui/scroll-area'

@Component({
  selector: 'app-testing',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ScrollAreaComponent],
  template: `
    <div class="testing-container">
      <aside class="sidebar">
        <h2 class="sidebar-title">Components</h2>
        <app-scroll-area class="scroll-container">
          <nav class="nav-list">
            @for (item of components(); track item.path) {
              <a [routerLink]="[item.path]" routerLinkActive="active-link" class="nav-item">
                {{ item.name }}
              </a>
            }
          </nav>
        </app-scroll-area>
      </aside>

      <main class="content-area">
        <div class="flex flex-col gap-4 p-4 bg-surface shadow-sm rounded-xl border border-gray-100">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .testing-container {
        display: flex;
        height: 100%;
        background: #f5f5f5;
      }
      .sidebar {
        width: 240px;
        border-right: 1px solid #ddd;
        background: #fff;
        padding: 1rem;
        display: flex;
        flex-direction: column;
      }
      .sidebar-title {
        font-size: 1.2rem;
        margin-bottom: 1rem;
        color: #333;
      }
      .scroll-container {
        flex: 1 1 0%;
        min-height: 0;
        display: block;
      }
      .nav-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .nav-item {
        padding: 0.75rem 1rem;
        border-radius: 4px;
        text-decoration: none;
        color: #666;
        transition: all 0.2s;
      }
      .nav-item:hover {
        background: #f0f0f0;
      }
      .active-link {
        background: #e6f7ff;
        color: #1890ff;
        font-weight: 500;
      }
      .content-area {
        flex: 1;
        padding: 2rem;
        overflow-y: auto;
      }
    `,
  ],
})
export class TestingComponent {
  components = signal([
    { name: 'Button', path: 'button' },
    { name: 'Select', path: 'select' },
    { name: 'Badge', path: 'badge' },
    { name: 'Dropdown', path: 'dropdown' },
    { name: 'Input', path: 'input' },
    { name: 'Textarea', path: 'textarea' },
    { name: 'Alert', path: 'alert' },
    { name: 'Attachment', path: 'attachment' },
    { name: 'Card', path: 'card' },
    { name: 'Chat', path: 'chat' },
    { name: 'Checkbox', path: 'checkbox' },
    { name: 'Code', path: 'code' },
    { name: 'Dialog', path: 'dialog' },
    { name: 'Upload', path: 'upload' },
    { name: 'Loading', path: 'loading' },
    { name: 'Markdown', path: 'markdown' },
    { name: 'Scroll', path: 'scroll' },
    { name: 'Switch', path: 'switch' },
    { name: 'Tab', path: 'tab' },
    { name: 'Tooltip', path: 'tooltip' },
    { name: 'Toast', path: 'toast' },
    { name: 'Node', path: 'node' },
  ])
}
