"use client"

import { FolderPlus, Upload, FolderUp, Download, Edit, Share2, Trash2, ChevronDown } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface FolderMenuProps {
  isRoot: boolean
  onNewFolder: () => void
  onFileUpload: () => void
  onFolderUpload: () => void
  onDownload: () => void
  onRename: () => void
  onShare: () => void
  onMoveToTrash: () => void
}

export function FolderMenu({
  isRoot,
  onNewFolder,
  onFileUpload,
  onFolderUpload,
  onDownload,
  onRename,
  onShare,
  onMoveToTrash,
}: FolderMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const baseMenuItems = [
    {
      icon: FolderPlus,
      label: "New folder",
      shortcut: "Alt+C then F",
      onClick: () => {
        setIsOpen(false)
        onNewFolder()
      },
    },
    {
      icon: Upload,
      label: "File upload",
      shortcut: "Alt+C then U",
      onClick: () => {
        setIsOpen(false)
        onFileUpload()
      },
    },
    // {
    //   icon: FolderUp,
    //   label: "Folder upload",
    //   shortcut: "Alt+C then I",
    //   onClick: () => {
    //     setIsOpen(false)
    //     onFolderUpload()
    //   },
    // },
  ]

  const folderSpecificItems = [
    {
      icon: Download,
      label: "Download",
      shortcut: "",
      onClick: () => {
        setIsOpen(false)
        onDownload()
      },
    },
    {
      icon: Edit,
      label: "Rename",
      shortcut: "",
      onClick: () => {
        setIsOpen(false)
        onRename()
      },
    },
    {
      icon: Share2,
      label: "Share",
      shortcut: "",
      onClick: () => {
        setIsOpen(false)
        onShare()
      },
    },
    {
      icon: Trash2,
      label: "Move to trash",
      shortcut: "",
      onClick: () => {
        setIsOpen(false)
        onMoveToTrash()
      },
    },
  ]

  const menuItems = isRoot ? baseMenuItems : [...baseMenuItems, ...folderSpecificItems]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full p-1 transition-colors hover:bg-slate-100"
      >
        <ChevronDown className="h-5 w-5 text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white shadow-lg">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={index}
                onClick={item.onClick}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-900 transition-colors hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg"
              >
                <Icon className="h-5 w-5 text-slate-500 flex-shrink-0" />
                <span className="flex-1 text-left font-medium">{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs text-slate-400 font-mono">{item.shortcut}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

