import { Component, computed, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { FileUploadComponent } from '@shared/ui/file-upload.component'

@Component({
  selector: 'app-upload-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, FileUploadComponent],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Fileupload Component Test</h1>
    <div class="p-8 max-w-2xl mx-auto space-y-6">
      <div class="border-b pb-4">
        <p class="text-slate-500">Currently selected: {{ fileCount() }} files</p>
      </div>

      <div
        class="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200"
      >
        <app-file-upload
          [multiple]="true"
          [maxSize]="10 * 1024 * 1024"
          (onFilesSelected)="onUpload($event)"
        />
        <div>
          <p class="text-sm font-medium">Click the icon to upload</p>
          <p class="text-xs text-slate-400">Supports multiple selections, maximum 10MB</p>
        </div>
      </div>

      @if (fileList().length > 0) {
        <div class="space-y-3">
          <div class="flex justify-between items-end">
            <h3 class="font-semibold text-slate-700">File details</h3>
            <span class="text-xs font-mono text-slate-500 text-right">
              Total size: {{ totalSizeText() }}
            </span>
          </div>

          <ul class="divide-y border rounded-md">
            @for (file of fileList(); track file.name + file.size) {
              <li class="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div class="flex flex-col">
                  <span class="text-sm text-slate-700 truncate max-w-50 font-medium">
                    {{ file.name }}
                  </span>
                  <span class="text-[10px] uppercase text-slate-400 tracking-wider">
                    {{ file.type || 'unknown type' }}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-xs text-slate-500">{{ (file.size / 1024).toFixed(1) }} KB</span>
                  <button (click)="removeFile(file)" class="text-slate-300 hover:text-red-500">
                    <span class="material-icons text-sm">close</span>
                  </button>
                </div>
              </li>
            }
          </ul>

          <button
            (click)="fileList.set([])"
            class="w-full py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
          >
            Clear all files
          </button>
        </div>
      } @else {
        <div class="py-12 text-center border-2 border-dotted rounded-lg text-slate-400">
          No files selected yet
        </div>
      }
    </div>
  `,
})
export class UploadTestComponent {
  fileList = signal<File[]>([])
  fileCount = computed(() => this.fileList().length)
  totalSizeText = computed(() => {
    const totalBytes = this.fileList().reduce((acc, file) => acc + file.size, 0)
    if (totalBytes === 0) return '0 B'
    const mb = totalBytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  })

  onUpload(newFiles: File[]) {
    this.fileList.update((current) => [...current, ...newFiles])
  }

  removeFile(fileToRemove: File) {
    this.fileList.update((current) => current.filter((f) => f !== fileToRemove))
  }
}
