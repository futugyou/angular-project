import { JSONSchemaProperty } from '../types'

export function isChatMessageSchema(schema: JSONSchemaProperty | undefined): boolean {
  if (!schema) return false

  // Must be an object type
  if (schema.type !== 'object') return false

  // Must have properties
  if (!schema.properties) return false

  const props = schema.properties

  // Message has "text" property (the main content)
  const hasText = 'text' in props && props['text']?.type === 'string'

  // Message has "role" property (user, assistant, system)
  const hasRole = 'role' in props && props['role']?.type === 'string'

  // If it has both text and role, it's likely a Message
  if (hasText && hasRole) {
    return true
  }

  // Also check for simpler chat-like schemas (just text field)
  // This covers cases where the schema might be simplified
  const propKeys = Object.keys(props)
  if (propKeys.length === 1 && hasText) {
    return true
  }

  return false
}
