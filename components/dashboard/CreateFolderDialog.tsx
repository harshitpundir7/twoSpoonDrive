"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"

interface CreateFolderDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string) => Promise<void>
}

export function CreateFolderDialog({ isOpen, onClose, onCreate }: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setFolderName("")
      setIsCreating(false)
      // Focus input after dialog opens
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen])

  const handleCreate = async () => {
    if (!folderName.trim()) {
      return
    }

    setIsCreating(true)
    try {
      await onCreate(folderName.trim())
      onClose()
    } catch (error) {
      console.error("Error creating folder:", error)
      // Error handling can be added here
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreate()
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div
          className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-normal text-[#202124]">New folder</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1 transition-colors hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-[#5f6368]" />
            </button>
          </div>

          <div className="mb-6">
            <input
              ref={inputRef}
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Folder name"
              className="w-full rounded border-2 border-[#4285f4] bg-white px-4 py-3 text-sm text-[#202124] placeholder-[#80868b] focus:outline-none focus:ring-2 focus:ring-[#4285f4]"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded px-4 py-2 text-sm font-medium text-[#1a73e8] transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!folderName.trim() || isCreating}
              className="rounded bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1557b0] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

