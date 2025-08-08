/**
 * Code updater utility for handling incremental code changes
 * Supports various operations like replace, insert, delete, append, prepend
 */

export interface CodeOperation {
  operation: 'replace' | 'insert' | 'delete' | 'append' | 'prepend'
  target: string
  old_content?: string
  new_content: string
  line_start?: number
  line_end?: number
}

export interface IncrementalCodeUpdate {
  update_type: 'incremental' | 'full_replace' | 'streaming'
  operations: CodeOperation[]
  explanation: string
  estimated_impact: 'low' | 'medium' | 'high'
}

export interface CodeUpdateResult {
  success: boolean
  updatedCode: string
  changes: CodeChange[]
  error?: string
}

export interface CodeChange {
  operation: string
  lineStart: number
  lineEnd: number
  oldContent: string
  newContent: string
  description: string
}

/**
 * Apply incremental updates to existing code
 */
export function applyIncrementalUpdates(
  originalCode: string,
  incrementalUpdate: IncrementalCodeUpdate
): CodeUpdateResult {
  try {
    let updatedCode = originalCode
    const changes: CodeChange[] = []
    const lines = originalCode.split('\n')

    // Sort operations by line number (descending) to avoid line number shifts
    const sortedOperations = [...incrementalUpdate.operations].sort((a, b) => {
      const aLine = a.line_start || Infinity
      const bLine = b.line_start || Infinity
      return bLine - aLine
    })

    for (const operation of sortedOperations) {
      const result = applySingleOperation(updatedCode, operation)
      if (result.success) {
        updatedCode = result.updatedCode
        changes.push(...result.changes)
      } else {
        console.warn(`Failed to apply operation ${operation.operation}:`, result.error)
        // Continue with other operations even if one fails
      }
    }

    return {
      success: true,
      updatedCode,
      changes
    }
  } catch (error) {
    return {
      success: false,
      updatedCode: originalCode,
      changes: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Apply a single code operation
 */
function applySingleOperation(code: string, operation: CodeOperation): CodeUpdateResult {
  const lines = code.split('\n')
  const changes: CodeChange[] = []

  try {
    switch (operation.operation) {
      case 'replace': {
        if (operation.line_start !== undefined && operation.line_end !== undefined) {
          // Replace by line numbers
          const startIdx = operation.line_start - 1
          const endIdx = operation.line_end - 1
          
          if (startIdx >= 0 && endIdx < lines.length && startIdx <= endIdx) {
            const oldContent = lines.slice(startIdx, endIdx + 1).join('\n')
            const newLines = operation.new_content.split('\n')
            
            lines.splice(startIdx, endIdx - startIdx + 1, ...newLines)
            
            changes.push({
              operation: 'replace',
              lineStart: operation.line_start,
              lineEnd: operation.line_end,
              oldContent,
              newContent: operation.new_content,
              description: `Replaced lines ${operation.line_start}-${operation.line_end}`
            })
          }
        } else if (operation.old_content && operation.new_content) {
          // Replace by content matching
          const updatedCode = code.replace(operation.old_content, operation.new_content)
          if (updatedCode !== code) {
            const lineNumber = findLineNumber(code, operation.old_content)
            changes.push({
              operation: 'replace',
              lineStart: lineNumber,
              lineEnd: lineNumber,
              oldContent: operation.old_content,
              newContent: operation.new_content,
              description: `Replaced content at line ${lineNumber}`
            })
            return {
              success: true,
              updatedCode,
              changes
            }
          }
        }
        break
      }

      case 'insert': {
        if (operation.line_start !== undefined) {
          const insertIdx = operation.line_start - 1
          if (insertIdx >= 0 && insertIdx <= lines.length) {
            const newLines = operation.new_content.split('\n')
            lines.splice(insertIdx, 0, ...newLines)
            
            changes.push({
              operation: 'insert',
              lineStart: operation.line_start,
              lineEnd: operation.line_start + newLines.length - 1,
              oldContent: '',
              newContent: operation.new_content,
              description: `Inserted content at line ${operation.line_start}`
            })
          }
        }
        break
      }

      case 'delete': {
        if (operation.line_start !== undefined && operation.line_end !== undefined) {
          const startIdx = operation.line_start - 1
          const endIdx = operation.line_end - 1
          
          if (startIdx >= 0 && endIdx < lines.length && startIdx <= endIdx) {
            const deletedContent = lines.slice(startIdx, endIdx + 1).join('\n')
            lines.splice(startIdx, endIdx - startIdx + 1)
            
            changes.push({
              operation: 'delete',
              lineStart: operation.line_start,
              lineEnd: operation.line_end,
              oldContent: deletedContent,
              newContent: '',
              description: `Deleted lines ${operation.line_start}-${operation.line_end}`
            })
          }
        } else if (operation.old_content) {
          // Delete by content matching
          const updatedCode = code.replace(operation.old_content, '')
          if (updatedCode !== code) {
            const lineNumber = findLineNumber(code, operation.old_content)
            changes.push({
              operation: 'delete',
              lineStart: lineNumber,
              lineEnd: lineNumber,
              oldContent: operation.old_content,
              newContent: '',
              description: `Deleted content at line ${lineNumber}`
            })
            return {
              success: true,
              updatedCode,
              changes
            }
          }
        }
        break
      }

      case 'append': {
        lines.push(...operation.new_content.split('\n'))
        changes.push({
          operation: 'append',
          lineStart: lines.length - operation.new_content.split('\n').length + 1,
          lineEnd: lines.length,
          oldContent: '',
          newContent: operation.new_content,
          description: 'Appended content to end of file'
        })
        break
      }

      case 'prepend': {
        const newLines = operation.new_content.split('\n')
        lines.unshift(...newLines)
        changes.push({
          operation: 'prepend',
          lineStart: 1,
          lineEnd: newLines.length,
          oldContent: '',
          newContent: operation.new_content,
          description: 'Prepended content to beginning of file'
        })
        break
      }

      default:
        return {
          success: false,
          updatedCode: code,
          changes: [],
          error: `Unsupported operation: ${operation.operation}`
        }
    }

    return {
      success: true,
      updatedCode: lines.join('\n'),
      changes
    }
  } catch (error) {
    return {
      success: false,
      updatedCode: code,
      changes: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Find line number of content in code
 */
function findLineNumber(code: string, content: string): number {
  const lines = code.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(content.trim())) {
      return i + 1
    }
  }
  return 1
}

/**
 * Generate a human-readable description of changes
 */
export function generateChangeDescription(changes: CodeChange[]): string {
  if (changes.length === 0) return 'No changes made'
  
  if (changes.length === 1) {
    return changes[0].description
  }
  
  const operationCounts = changes.reduce((acc, change) => {
    acc[change.operation] = (acc[change.operation] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const descriptions = Object.entries(operationCounts).map(([operation, count]) => {
    return `${count} ${operation}${count > 1 ? 's' : ''}`
  })
  
  return `Made ${descriptions.join(', ')}`
}

/**
 * Check if code has conflicts that need resolution
 */
export function detectConflicts(originalCode: string, operations: CodeOperation[]): string[] {
  const conflicts: string[] = []
  
  // Check for overlapping line operations
  const lineOperations = operations.filter(op => op.line_start !== undefined)
  for (let i = 0; i < lineOperations.length; i++) {
    for (let j = i + 1; j < lineOperations.length; j++) {
      const op1 = lineOperations[i]
      const op2 = lineOperations[j]
      
      if (op1.line_start && op2.line_start && 
          op1.line_end && op2.line_end) {
        if (op1.line_start <= op2.line_end && op2.line_start <= op1.line_end) {
          conflicts.push(`Overlapping operations at lines ${op1.line_start}-${op1.line_end} and ${op2.line_start}-${op2.line_end}`)
        }
      }
    }
  }
  
  // Check for missing content in replace operations
  const replaceOperations = operations.filter(op => op.operation === 'replace' && op.old_content)
  for (const op of replaceOperations) {
    if (op.old_content && !originalCode.includes(op.old_content)) {
      conflicts.push(`Cannot find content to replace: "${op.old_content.substring(0, 50)}..."`)
    }
  }
  
  return conflicts
}

/**
 * Preview changes without applying them
 */
export function previewChanges(originalCode: string, operations: CodeOperation[]): {
  preview: string
  changes: CodeChange[]
  conflicts: string[]
} {
  const conflicts = detectConflicts(originalCode, operations)
  
  if (conflicts.length > 0) {
    return {
      preview: originalCode,
      changes: [],
      conflicts
    }
  }
  
  const result = applyIncrementalUpdates(originalCode, {
    update_type: 'incremental',
    operations,
    explanation: 'Preview',
    estimated_impact: 'low'
  })
  
  return {
    preview: result.updatedCode,
    changes: result.changes,
    conflicts: []
  }
}