import { AttachmentItem } from '@shared/ui/attachment'

export const MOCK_ATTACHMENTS: AttachmentItem[] = [
  {
    id: '1',
    type: 'image',
    file: new File([''], 'beach-vacation.jpg', { type: 'image/jpeg' }),
    preview: 'https://picsum.photos/200/200?random=1',
  },
  {
    id: '2',
    type: 'pdf',
    file: new File([''], 'project-specification.pdf', { type: 'application/pdf' }),
  },
  {
    id: '3',
    type: 'audio',
    file: new File([''], 'podcast-episode-01.mp3', { type: 'audio/mpeg' }),
  },
  {
    id: '4',
    type: 'image',
    file: new File([''], 'broken-image.png', { type: 'image/png' }),
    preview: '',
  },
  {
    id: '5',
    type: 'other',
    file: new File([''], 'config.yaml', { type: 'text/yaml' }),
  },
]
