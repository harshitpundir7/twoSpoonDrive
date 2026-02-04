"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"

interface RenameDialogProps {
  isOpen: boolean
  onClose: () => void
  currentName: string
  isFolder: boolean
  onRename: (newName: string) => Promise<void>
}

export function RenameDialog({
  isOpen,
  onClose,
  currentName,
  isFolder,
  onRename,
}: RenameDialogProps) {
  const [newName, setNewName] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Extract name without extension for files
      const nameWithoutExt = isFolder
        ? currentName
        : currentName.substring(0, currentName.lastIndexOf(".")) || currentName
      setNewName(nameWithoutExt)
      setIsRenaming(false)
      // Focus input after dialog opens
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen, currentName, isFolder])

  const handleRename = async () => {
    if (!newName.trim()) {
      return
    }

    // For files, preserve the extension
    let finalName = newName.trim()
    if (!isFolder && currentName.includes(".")) {
      const extension = currentName.substring(currentName.lastIndexOf("."))
      finalName = newName.trim() + extension
    }

    // If name hasn't changed, just close
    if (finalName === currentName) {
      onClose()
      return
    }

    setIsRenaming(true)
    try {
      await onRename(finalName)
      onClose()
    } catch (error) {
      console.error("Error renaming:", error)
      // Error handling - don't close dialog on error
    } finally {
      setIsRenaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename()
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              Rename {isFolder ? "folder" : "file"}
            </h2>
            <button
              onClick={onClose}
              disabled={isRenaming}
              className="rounded-full p-1 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <div className="mb-6">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isFolder ? "Folder name" : "File name"}
              className="w-full rounded-lg border-2 border-blue-500 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
              disabled={isRenaming}
            />
            {!isFolder && currentName.includes(".") && (
              <p className="mt-2 text-xs text-slate-500">
                Extension will be preserved: {currentName.substring(currentName.lastIndexOf("."))}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={isRenaming}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRename}
              disabled={!newName.trim() || isRenaming}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRenaming ? "Renaming..." : "Rename"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

