import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { DIALOG_COMPONENTS } from '@shared/ui/dialog'

@Component({
  selector: 'app-dialog-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, ...DIALOG_COMPONENTS],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Dialog Component Test</h1>
    <button (click)="showDialogModal.set(true)">open</button>

    <app-dialog [(open)]="showDialogModal" [isModal]="false">
      <app-dialog-header>
        <app-dialog-title>title</app-dialog-title>
        <app-dialog-description>description</app-dialog-description>
        <app-dialog-close (close)="showDialogModal.set(false)" />
      </app-dialog-header>

      <app-dialog-content>
        <div class="text-sm text-muted-foreground">
          <div class="container">
            <h1>Title</h1>
            <p>
              This is a test scenario for automatic line wrapping of long text, ensuring that even
              if the code is very long, it will not break the layout, but will gracefully wrap
              within the container.
            </p>
          </div>
        </div>
      </app-dialog-content>

      <app-dialog-footer>
        <button appButton variant="outline" (click)="showDialogModal.set(false)">cancel</button>
        <button appButton (click)="showDialogModal.set(false)">save</button>
      </app-dialog-footer>
    </app-dialog>
  `,
})
export class DialogTestComponent {
  // dialog
  showDialogModal = signal(false)
}
