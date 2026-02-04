"use client"

import { useState, useRef } from "react"
import { FileCard } from "./FileCard"
import { FolderMenu } from "./FolderMenu"
import { TypeFilter } from "./TypeFilter"
import { ModifiedFilter, ModifiedFilterOption } from "./ModifiedFilter"
import { ChevronDown } from "lucide-react"
import { FileTypeCategory, FILE_TYPE_OPTIONS } from "@/lib/fileTypes"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface File {
  id: string
  name: string
  type?: string | null
  isFolder: boolean
  isStarred?: boolean
}

interface BreadcrumbItem {
  id: string
  name: string
}

interface FileGridProps {
  files: File[]
  breadcrumbPath: BreadcrumbItem[]
  currentFolderId: string | null
  onFileContextMenu: (e: React.MouseEvent, fileId: string) => void
  onFileClick?: (fileId: string, isFolder: boolean) => void
  onNavigate?: (folderId: string | null) => void
  onNewFolder?: () => void
  onFileUpload?: () => void
  onFolderUpload?: () => void
  onDownload?: () => void
  onRename?: () => void
  onShare?: () => void
  onMoveToTrash?: () => void
  onStar?: (fileId: string, isStarred: boolean) => void
  typeFilter?: FileTypeCategory
  onTypeFilterChange?: (type: FileTypeCategory) => void
  modifiedFilter?: ModifiedFilterOption | null
  onModifiedFilterChange?: (filter: ModifiedFilterOption | null) => void
  onMove?: (fileId: string, targetFolderId: string | null) => void
  isLoading?: boolean
  emptyStateImage?: string
  emptyStateMessage?: string
}

export function FileGrid({
  files,
  breadcrumbPath,
  currentFolderId,
  onFileContextMenu,
  onFileClick,
  onNavigate,
  onNewFolder,
  onFileUpload,
  onFolderUpload,
  onDownload,
  onRename,
  onShare,
  onMoveToTrash,
  onStar,
  typeFilter = "all",
  onTypeFilterChange,
  modifiedFilter = null,
  onModifiedFilterChange,
  onMove,
  isLoading = false,
  emptyStateImage,
  emptyStateMessage,
}: FileGridProps) {
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null)
  const [draggedIsFolder, setDraggedIsFolder] = useState<boolean>(false)
  const [dragOverFileId, setDragOverFileId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, fileId: string, isFolder: boolean) => {
    setDraggedFileId(fileId)
    setDraggedIsFolder(isFolder)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: fileId, isFolder }))
  }

  const handleDragOver = (e: React.DragEvent, fileId: string, isFolder: boolean) => {
    // Clear any pending drag leave timeout since we're still dragging over
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current)
      dragLeaveTimeoutRef.current = null
    }
    
    // Only highlight folders (and not the dragged item itself)
    if (isFolder && fileId !== draggedFileId && draggedFileId) {
      setDragOverFileId(fileId)
    } else if (!isFolder || fileId === draggedFileId) {
      // Clear if dragging over a file or the dragged item itself
      if (dragOverFileId === fileId) {
        setDragOverFileId(null)
      }
    }
  }

  const dragLeaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleDragLeave = (e: React.DragEvent) => {
    // Clear any existing timeout
    if (dragLeaveTimeoutRef.current) {
      clearTimeout(dragLeaveTimeoutRef.current)
    }
    
    // Use a small timeout to debounce - sometimes dragleave fires when moving to child elements
    // The dragover event will fire again if we're still over the element
    dragLeaveTimeoutRef.current = setTimeout(() => {
      setDragOverFileId(null)
      dragLeaveTimeoutRef.current = null
    }, 50)
  }

  const handleDrop = async (e: React.DragEvent, fileId: string, isFolder: boolean) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isFolder || !draggedFileId || fileId === draggedFileId) {
      setDragOverFileId(null)
      setDraggedFileId(null)
      return
    }

    if (onMove) {
      await onMove(draggedFileId, fileId)
    }

    setDragOverFileId(null)
    setDraggedFileId(null)
  }

  const handleDragEnd = () => {
    setDragOverFileId(null)
    setDraggedFileId(null)
  }
  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Clear any folder highlight when dragging over root area
    setDragOverFileId(null)
    // Allow dropping on root area
    e.dataTransfer.dropEffect = "move"
  }

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!draggedFileId) return

    // Move to root (parentId = null)
    if (onMove) {
      await onMove(draggedFileId, null)
    }

    setDragOverFileId(null)
    setDraggedFileId(null)
  }

  const handleRootDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the root area
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !(e.currentTarget as HTMLElement).contains(relatedTarget)) {
      // Don't clear dragOverFileId here - let individual cards handle it
    }
  }

  return (
    <div
      className="flex-1 overflow-y-auto bg-slate-50 p-6"
      onDragEnd={handleDragEnd}
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
    >
      {/* Breadcrumb Navigation */}
      {breadcrumbPath.length > 0 && (
        <div className="mb-4">
          <Breadcrumb>
            <BreadcrumbList className="text-slate-500 text-sm">
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => onNavigate?.(null)}
                  className="cursor-pointer hover:text-slate-900 transition-colors text-blue-600"
                >
                  My Drive
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbPath.map((item, index) => {
                const isLast = index === breadcrumbPath.length - 1
                return (
                  <div key={item.id} className="flex items-center">
                    <BreadcrumbSeparator className="text-slate-400">
                      <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage className="text-slate-900 font-medium">{item.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          onClick={() => onNavigate?.(item.id)}
                          className="cursor-pointer hover:text-slate-900 transition-colors text-blue-600"
                        >
                          {item.name}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}

      {/* Header with Filters */}
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            {breadcrumbPath.length > 0 ? breadcrumbPath[breadcrumbPath.length - 1].name : "My Drive"}
          </h1>
          <FolderMenu
            isRoot={currentFolderId === null}
            onNewFolder={onNewFolder || (() => {})}
            onFileUpload={onFileUpload || (() => {})}
            onFolderUpload={onFolderUpload || (() => {})}
            onDownload={onDownload || (() => {})}
            onRename={onRename || (() => {})}
            onShare={onShare || (() => {})}
            onMoveToTrash={onMoveToTrash || (() => {})}
          />
        </div>
        <div className="flex items-center gap-2">
          {onTypeFilterChange && (
            <TypeFilter value={typeFilter} onChange={onTypeFilterChange} />
          )}
          {onModifiedFilterChange && (
            <ModifiedFilter value={modifiedFilter} onChange={onModifiedFilterChange} />
          )}
        </div>
      </div>

      {/* Files Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 -mt-40">
          {emptyStateImage && (
            <img 
              src={emptyStateImage} 
              alt="Empty state" 
              className="w-[640px] h-[640px] object-contain"
            />
          )}
        </div>
      ) : (
        <>
          {/* Folders Section */}
          {files.filter((f) => f.isFolder).length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Folders</h2>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, 260px)", gap: "16px" }}>
                {files
                  .filter((f) => f.isFolder)
                  .map((folder) => (
                    <FileCard
                      key={folder.id}
                      id={folder.id}
                      name={folder.name}
                      type={folder.type || undefined}
                      isFolder={true}
                      onContextMenu={onFileContextMenu}
                      onClick={() => onFileClick?.(folder.id, true)}
                      isDragging={draggedFileId === folder.id}
                      isDragOver={dragOverFileId === folder.id}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onMove={onMove}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {files.filter((f) => !f.isFolder).length > 0 && (
            <div className="mb-6">
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
                      onContextMenu={onFileContextMenu}
                      onClick={() => onFileClick?.(file.id, false)}
                      isDragging={draggedFileId === file.id}
                      isDragOver={false}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onMove={onMove}
                    />
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
