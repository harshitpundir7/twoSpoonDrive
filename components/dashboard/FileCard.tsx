"use client"

import { FileText, File, MoreVertical, Folder, Table, Presentation, Video, Image, Archive, Music } from "lucide-react"
import { useState } from "react"
import { getFileTypeCategory } from "@/lib/fileTypes"

interface FileCardProps {
  id: string
  name: string
  type?: string
  isFolder?: boolean
  onContextMenu?: (e: React.MouseEvent, fileId: string) => void
  onClick?: () => void
  onMove?: (fileId: string, targetFolderId: string | null) => void
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: (e: React.DragEvent, fileId: string, isFolder: boolean) => void
  onDragOver?: (e: React.DragEvent, fileId: string, isFolder: boolean) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, fileId: string, isFolder: boolean) => void
}

export function FileCard({
  id,
  name,
  type,
  isFolder,
  onContextMenu,
  onClick,
  onMove,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: FileCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [wasDragged, setWasDragged] = useState(false)

  const handleFileClick = async () => {
    // Prevent click if item was just dragged
    if (wasDragged) {
      setWasDragged(false)
      return
    }

    if (isFolder) {
      onClick?.()
    } else {
      // For files, download through secure proxy endpoint
      try {
        const res = await fetch(`/api/files/${id}/download`)
        if (!res.ok) {
          throw new Error("Failed to download file")
        }

        // Get filename from Content-Disposition header or use a default
        const contentDisposition = res.headers.get("Content-Disposition")
        let fileName = "download"
        if (contentDisposition) {
          // Try standard format first: filename="name"
          const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i)
          if (quotedMatch && quotedMatch[1]) {
            fileName = quotedMatch[1].trim()
          } else {
            // Fallback to unquoted format: filename=name
            const unquotedMatch = contentDisposition.match(/filename=([^;]+)/i)
            if (unquotedMatch && unquotedMatch[1]) {
              fileName = unquotedMatch[1].trim()
            }
          }
        }

        // Create blob from response
        const blob = await res.blob()
        const blobUrl = window.URL.createObjectURL(blob)

        // Trigger download
        const link = document.createElement("a")
        link.href = blobUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up blob URL
        window.URL.revokeObjectURL(blobUrl)
      } catch (error) {
        console.error("Error downloading file:", error)
        alert("Failed to download file")
      }
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    setWasDragged(false)
    if (onDragStart) {
      onDragStart(e, id, isFolder || false)
    } else {
      // Default drag behavior
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("text/plain", JSON.stringify({ id, isFolder }))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Only allow dropping on folders
    if (!isFolder) {
      e.dataTransfer.dropEffect = "none"
      return
    }

    // Allow drop on folders (validation happens in onDragOver callback)
    e.dataTransfer.dropEffect = "move"
    if (onDragOver) {
      onDragOver(e, id, isFolder || false)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Always call onDragLeave - let FileGrid handle the logic
    if (onDragLeave) {
      onDragLeave(e)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Only allow dropping on folders
    if (!isFolder) {
      return
    }

    const draggedData = e.dataTransfer.getData("text/plain")
    if (!draggedData) return

    try {
      const dragged = JSON.parse(draggedData)

      // Prevent dropping folder into itself
      if (dragged.id === id) {
        return
      }

      if (onDrop) {
        onDrop(e, id, isFolder || false)
      } else if (onMove) {
        onMove(dragged.id, id)
      }
    } catch (error) {
      console.error("Error parsing drag data:", error)
    }
  }

  const handleDragEnd = () => {
    setWasDragged(true)
    // Reset after a short delay to allow click event to check
    setTimeout(() => setWasDragged(false), 100)
  }

  const getFileExtension = (filename: string): string => {
    const parts = filename.split(".")
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ""
  }

  const getFileTypeIcon = () => {
    if (isFolder) {
      return {
        icon: Folder,
        bgColor: "bg-blue-50",
        iconColor: "text-blue-600",
        fill: true,
      }
    }

    const extension = getFileExtension(name)
    const mimeType = type || ""
    const category = getFileTypeCategory(mimeType)

    // PDF files
    if (extension === "pdf" || mimeType === "application/pdf" || category === "pdfs") {
      return {
        icon: File,
        bgColor: "bg-red-100",
        iconColor: "text-red-600",
        label: "PDF",
        fill: false,
      }
    }

    // Documents (doc, docx, txt, rtf, odt)
    if (
      category === "documents" ||
      ["doc", "docx", "txt", "rtf", "odt"].includes(extension)
    ) {
      return {
        icon: FileText,
        bgColor: "bg-blue-100",
        iconColor: "text-blue-600",
        label: extension.toUpperCase() || "DOC",
        fill: false,
      }
    }

    // Spreadsheets (xls, xlsx, csv, ods)
    if (
      category === "spreadsheets" ||
      ["xls", "xlsx", "csv", "ods"].includes(extension)
    ) {
      return {
        icon: Table,
        bgColor: "bg-green-100",
        iconColor: "text-green-600",
        label: extension.toUpperCase() || "XLS",
        fill: false,
      }
    }

    // Presentations (ppt, pptx, odp)
    if (
      category === "presentations" ||
      ["ppt", "pptx", "odp"].includes(extension)
    ) {
      return {
        icon: Presentation,
        bgColor: "bg-orange-100",
        iconColor: "text-orange-600",
        label: extension.toUpperCase() || "PPT",
        fill: false,
      }
    }

    // Videos
    if (category === "videos" || ["mp4", "avi", "mov", "wmv", "flv", "mkv", "webm"].includes(extension)) {
      return {
        icon: Video,
        bgColor: "bg-purple-100",
        iconColor: "text-purple-600",
        label: extension.toUpperCase() || "VID",
        fill: false,
      }
    }

    // Photos/Images
    if (
      category === "photos" ||
      ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp", "ico"].includes(extension)
    ) {
      return {
        icon: Image,
        bgColor: "bg-pink-100",
        iconColor: "text-pink-600",
        label: extension.toUpperCase() || "IMG",
        fill: false,
      }
    }

    // Audio files
    if (
      category === "audio" ||
      ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"].includes(extension)
    ) {
      return {
        icon: Music,
        bgColor: "bg-indigo-100",
        iconColor: "text-indigo-600",
        label: extension.toUpperCase() || "AUD",
        fill: false,
      }
    }

    // Archives
    if (
      category === "archives" ||
      ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension)
    ) {
      return {
        icon: Archive,
        bgColor: "bg-amber-100",
        iconColor: "text-amber-600",
        label: extension.toUpperCase() || "ZIP",
        fill: false,
      }
    }

    // Default file
    return {
      icon: File,
      bgColor: "bg-slate-100",
      iconColor: "text-slate-600",
      label: extension.toUpperCase() || "FILE",
      fill: false,
    }
  }

  const getIcon = () => {
    const fileType = getFileTypeIcon()
    const IconComponent = fileType.icon

    if (isFolder) {
      return (
        <IconComponent
          className={`h-[30px] w-[30px] ${fileType.iconColor}`}
          fill="currentColor"
        />
      )
    }

    // Show label for PDF and other document types
    if (fileType.label && ["PDF", "DOC", "DOCX", "XLS", "XLSX", "PPT", "PPTX"].includes(fileType.label)) {
      return (
        <div className={`flex h-[30px] w-[30px] items-center justify-center rounded-md ${fileType.bgColor} border border-white/50 shadow-sm`}>
          <span className={`text-[9px] font-bold ${fileType.iconColor}`}>{fileType.label}</span>
        </div>
      )
    }

    // Show icon with colored background for other file types
    return (
      <div className={`flex h-[30px] w-[30px] items-center justify-center rounded-md ${fileType.bgColor} border border-white/50 shadow-sm`}>
        <IconComponent className={`h-5 w-5 ${fileType.iconColor}`} />
      </div>
    )
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className={`group relative cursor-pointer rounded-lg border transition-all ${
        isDragging
          ? "opacity-50 border-blue-500"
          : isDragOver
          ? "border-blue-500 border-2 bg-blue-50 shadow-lg ring-2 ring-blue-500 ring-opacity-50"
          : "border-slate-200 bg-white hover:border-blue-500 hover:shadow-md"
      }`}
      style={{ width: "260px", height: "110px", borderRadius: "8px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={(e) => onContextMenu?.(e, id)}
      onClick={handleFileClick}
    >
      <div className="flex h-full flex-col" style={{ padding: "12px" }}>
        {/* Icon Area */}
        <div className="relative mb-3 flex h-[60px] w-full items-center justify-center rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/50">
          {getIcon()}
          <button
            className={`absolute right-1.5 top-1.5 rounded-full p-1 transition-all ${
              isHovered ? "opacity-100" : "opacity-0"
            } hover:bg-white/80 backdrop-blur-sm shadow-sm`}
            onClick={(e) => {
              e.stopPropagation()
              onContextMenu?.(e, id)
            }}
          >
            <MoreVertical className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        {/* File Name */}
        <div className="flex-1 flex items-end">
          <div className="truncate text-left text-[13px] font-medium leading-[1.3] text-slate-900">
            {name}
          </div>
        </div>
      </div>
    </div>
  )
}
