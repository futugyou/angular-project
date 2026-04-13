export interface AttachmentItem {
  id: string
  file: File
  preview?: string // Data URL for preview
  type: 'image' | 'pdf' | 'audio' | 'other'
}
