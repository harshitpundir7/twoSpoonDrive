"use client"

import { useState, useEffect } from "react"
import { FileCard } from "@/components/dashboard/FileCard"
import { TrashContextMenu } from "@/components/dashboard/TrashContextMenu"

interface File {
  id: string
  name: string
  type?: string | null
  isFolder: boolean
  deletedAt: string
}

export default function TrashPage() {
  const [selectedFile, setSelectedFile] = useState<{ id: string; isFolder: boolean } | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)

  const fetchFiles = async () => {
    try {
      setIsLoadingFiles(true)
      const res = await fetch("/api/files/trash")
      if (!res.ok) {
        throw new Error("Failed to fetch trash")
      }
      const data = await res.json()
      setFiles(data.files || [])
    } catch (error) {
      console.error("Error fetching trash:", error)
    } finally {
      setIsLoadingFiles(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const handleFileContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault()
    const file = files.find((f) => f.id === fileId)
    if (file) {
      setSelectedFile({ id: file.id, isFolder: file.isFolder })
      setContextMenuPos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleCloseContextMenu = () => {
    setContextMenuPos(null)
    setSelectedFile(null)
  }

  const handleRestore = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}/restore`, {
        method: "POST",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to restore file")
      }

      // Refresh trash list
      fetchFiles()
      // Dispatch storage update event to refresh sidebar
      window.dispatchEvent(new CustomEvent("storage:update"))
    } catch (error) {
      console.error("Error restoring file:", error)
      alert(error instanceof Error ? error.message : "Failed to restore file")
    }
  }

  const handleDeleteForever = async (fileId: string) => {
    if (!confirm("Are you sure you want to permanently delete this item? This action cannot be undone.")) {
      return
    }

    try {
      const res = await fetch(`/api/files/${fileId}/permanent`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete file permanently")
      }

      // Refresh trash list
      fetchFiles()
      // Dispatch storage update event to refresh sidebar
      window.dispatchEvent(new CustomEvent("storage:update"))
    } catch (error) {
      console.error("Error deleting file permanently:", error)
      alert(error instanceof Error ? error.message : "Failed to delete file permanently")
    }
  }

  const handleFileClick = (fileId: string, isFolder: boolean) => {
    // In trash, clicking doesn't navigate - files/folders are deleted
    // Could show a message or do nothing
  }

  return (
    <>
      {isLoadingFiles ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 mx-auto" />
            <p className="text-sm text-slate-600">Loading trash...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900 mb-4">Trash</h1>
            <p className="text-sm text-slate-600">
              Items in trash are deleted after 30 days. Empty trash to free up space.
            </p>
          </div>

          {/* Files Grid */}
          {files.length > 0 ? (
            <>
              <div className="grid mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, 260px)", gap: "16px" }}>
                {files
                  .filter((f) => f.isFolder)
                  .map((folder) => (
                    <FileCard
                      key={folder.id}
                      id={folder.id}
                      name={folder.name}
                      type={folder.type || undefined}
                      isFolder={true}
                      onContextMenu={(e) => handleFileContextMenu(e, folder.id)}
                      onClick={() => handleFileClick(folder.id, true)}
                    />
                  ))}
              </div>
              {files.filter((f) => f.isFolder).length > 0 && (
                <h2 className="mb-3 text-sm font-semibold text-slate-700">Files</h2>
              )}
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, 260px)", gap: "16px" }}>
                {files
                  .filter((f) => !f.isFolder)
                  .map((file) => (
                    <FileCard
                      key={file.id}
                      id={file.id}
                      name={file.name}
                      type={file.type || undefined}
                      isFolder={false}
                      onContextMenu={(e) => handleFileContextMenu(e, file.id)}
                      onClick={() => handleFileClick(file.id, false)}
                    />
                  ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 -mt-40">
              <img 
                src="/trash.png" 
                alt="Empty trash" 
                className="w-[640px] h-[640px] object-contain"
              />
            </div>
          )}
        </div>
      )}
      {contextMenuPos && selectedFile && (
        <TrashContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          fileId={selectedFile.id}
          isFolder={selectedFile.isFolder}
          onClose={handleCloseContextMenu}
          onRestore={handleRestore}
          onDeleteForever={handleDeleteForever}
        />
      )}
    </>
  )
}

