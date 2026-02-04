"use client"

import { useState } from "react"
import {
  Grid3x3,
  Download,
  FileText,
  File,
  Users,
  Folder,
  Star,
  Trash2,
  ChevronRight,
  Loader2,
} from "lucide-react"
interface ContextMenuProps {
  x: number
  y: number
  fileId?: string
  isFolder?: boolean
  isStarred?: boolean
  onClose: () => void
  onDownload?: (fileId: string) => void
  onDelete?: (fileId: string) => void
  onRename?: (fileId: string) => void
  onDuplicate?: (fileId: string) => void
  onShare?: (fileId: string) => void
  onStar?: (fileId: string, isStarred: boolean) => void
}

export function ContextMenu({
  x,
  y,
  fileId,
  isFolder,
  isStarred = false,
  onClose,
  onDownload,
  onDelete,
  onRename,
  onDuplicate,
  onShare,
  onStar,
}: ContextMenuProps) {
  const [isDuplicating, setIsDuplicating] = useState(false)

  const handleDownload = async () => {
    onClose() // Close immediately
    if (fileId && !isFolder && onDownload) {
      await onDownload(fileId)
    }
  }

  const handleDelete = async () => {
    onClose() // Close immediately
    if (fileId && onDelete) {
      await onDelete(fileId)
    }
  }

  const handleRename = () => {
    onClose() // Close immediately
    if (fileId && onRename) {
      onRename(fileId)
    }
  }

  const handleDuplicate = async () => {
    if (!fileId || !onDuplicate || isDuplicating) return
    
    setIsDuplicating(true)
    onClose() // Close menu immediately
    
    try {
      await onDuplicate(fileId)
    } catch (error) {
      // Error is handled in the parent component
      console.error("Error in duplicate handler:", error)
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleShare = () => {
    onClose() // Close menu immediately
    if (fileId && onShare) {
      onShare(fileId)
    }
  }

  const handleStar = () => {
    onClose() // Close menu immediately
    if (fileId && onStar) {
      onStar(fileId, !isStarred)
    }
  }

  interface MenuItem {
    icon?: typeof Grid3x3
    label?: string
    hasArrow?: boolean
    shortcut?: string
    onClick?: () => void
    onMouseEnter?: () => void
    disabled?: boolean
    loading?: boolean
    divider?: boolean
  }

  const menuItems: MenuItem[] = [
    // { icon: Grid3x3, label: "Open with", hasArrow: true, onClick: onClose },
    { icon: Download, label: "Download", onClick: handleDownload, disabled: isFolder },
    { icon: FileText, label: "Rename", onClick: handleRename },
    {
      icon: File,
      label: "Make a copy",
      shortcut: "⌘C ⌘V",
      onClick: handleDuplicate,
      disabled: isDuplicating,
      loading: isDuplicating,
    },
    { divider: true },
    {
      icon: Users,
      label: "Share",
      onClick: handleShare,
    },
    // { icon: Folder, label: "Organize", hasArrow: true, onClick: onClose },
    // { icon: FileText, label: "File information", hasArrow: true, onClick: onClose },
    { icon: Star, label: isStarred ? "Remove from starred" : "Add to starred", onClick: handleStar },
    { divider: true },
    { icon: Trash2, label: "Move to trash", onClick: handleDelete },
  ]

  return (
    <>
      <div
        className="fixed z-50 min-w-[200px] rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
      >
        {menuItems.map((item, index) => {
          if (item.divider) {
            return <div key={index} className="my-1 border-t border-slate-200" />
          }

          const Icon = item.icon!
          const isLoading = item.loading
          
          return (
            <button
              key={index}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={item.onClick}
              disabled={item.disabled || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 shrink-0 text-slate-500 animate-spin" />
              ) : (
                <Icon className="h-4 w-4 shrink-0 text-slate-500" />
              )}
              <span className="flex-1 text-left font-medium">{item.label}</span>
              {item.hasArrow && (
                <ChevronRight className="h-4 w-4 -rotate-90 text-slate-400" />
              )}
              {item.shortcut && !isLoading && (
                <span className="text-xs text-slate-400 font-mono">{item.shortcut}</span>
              )}
            </button>
          )
        })}
      </div>
      <div className="fixed inset-0 z-40" onClick={onClose} />
    </>
  )
}
