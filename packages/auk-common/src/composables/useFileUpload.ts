export type UploadType = "org-logo"

export interface UploadResult {
  success: boolean
  url?: string
  message?: string
  statusCode?: number
}

export interface UploadError {
  message: string
  statusCode?: number
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

/**
 * Validates an image file before upload
 * @param file The file to validate
 * @returns null if valid, error message string if invalid
 */
export function validateImageFile(file: File): string | null {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return "file_upload.error_size_limit"
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "file_upload.error_invalid_format"
  }

  return null
}

/**
 * Creates a preview URL for an image file
 * @param file The file to preview
 * @returns Preview URL (remember to revoke with URL.revokeObjectURL when done)
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file)
}
