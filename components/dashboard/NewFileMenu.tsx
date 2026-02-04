"use client"

import { FolderPlus, Upload, FolderUp, ChevronRight, Plus } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface NewFileMenuProps {
  onNewFolder: () => void
  onFileUpload: () => void
  onFolderUpload: () => void
}

export function NewFileMenu({ onNewFolder, onFileUpload, onFolderUpload }: NewFileMenuProps) {
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

  const menuItems = [
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-all hover:shadow-md hover:bg-slate-50"
      >
        <Plus className="h-4 w-4 text-slate-900" strokeWidth={2.5} />
        <span>New</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-[#dadce0] bg-white shadow-lg">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={index}
                onClick={item.onClick}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#202124] transition-colors hover:bg-[#f1f3f4] first:rounded-t-lg last:rounded-b-lg"
              >
                <Icon className="h-5 w-5 text-[#5f6368] flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                <span className="text-xs text-[#80868b] font-mono">{item.shortcut}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

