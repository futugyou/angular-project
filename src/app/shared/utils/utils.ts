import { JSONSchemaProperty } from '@src/app/features/devui/types'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateText(
  text: string,
  maxLength: number = 50,
  ellipsis: string = '...',
): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + ellipsis
}
