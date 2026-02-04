// File type categories for filtering
export type FileTypeCategory =
  | "folders"
  | "documents"
  | "spreadsheets"
  | "presentations"
  | "videos"
  | "photos"
  | "pdfs"
  | "archives"
  | "audio"
  | "all"

// Map MIME types to file type categories
export function getFileTypeCategory(mimeType: string | null | undefined): FileTypeCategory {
  if (!mimeType) return "all"

  const type = mimeType.toLowerCase()

  // Documents
  if (
    type.includes("text/") ||
    type.includes("application/msword") ||
    type.includes("application/vnd.openxmlformats-officedocument.wordprocessingml") ||
    type.includes("application/vnd.oasis.opendocument.text") ||
    type.includes("application/rtf")
  ) {
    return "documents"
  }

  // Spreadsheets
  if (
    type.includes("application/vnd.ms-excel") ||
    type.includes("application/vnd.openxmlformats-officedocument.spreadsheetml") ||
    type.includes("application/vnd.oasis.opendocument.spreadsheet") ||
    type.includes("text/csv")
  ) {
    return "spreadsheets"
  }

  // Presentations
  if (
    type.includes("application/vnd.ms-powerpoint") ||
    type.includes("application/vnd.openxmlformats-officedocument.presentationml") ||
    type.includes("application/vnd.oasis.opendocument.presentation")
  ) {
    return "presentations"
  }

  // Videos
  if (type.startsWith("video/")) {
    return "videos"
  }

  // Photos & Images
  if (type.startsWith("image/")) {
    return "photos"
  }

  // PDFs
  if (type === "application/pdf") {
    return "pdfs"
  }

  // Archives
  if (
    type.includes("application/zip") ||
    type.includes("application/x-rar-compressed") ||
    type.includes("application/x-tar") ||
    type.includes("application/gzip") ||
    type.includes("application/x-7z-compressed")
  ) {
    return "archives"
  }

  // Audio
  if (type.startsWith("audio/")) {
    return "audio"
  }

  return "all"
}

// File type filter options
export const FILE_TYPE_OPTIONS = [
  { value: "all", label: "All types", icon: null },
  { value: "folders", label: "Folders", icon: "📁" },
  { value: "documents", label: "Documents", icon: "📄" },
  { value: "spreadsheets", label: "Spreadsheets", icon: "📊" },
  { value: "presentations", label: "Presentations", icon: "📽️" },
  { value: "videos", label: "Videos", icon: "🎬" },
  { value: "photos", label: "Photos & images", icon: "🖼️" },
  { value: "pdfs", label: "PDFs", icon: "📕" },
  { value: "archives", label: "Archives (zip)", icon: "📦" },
  { value: "audio", label: "Audio", icon: "🎵" },
] as const

