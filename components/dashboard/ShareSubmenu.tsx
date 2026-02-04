"use client"

import { useState, useRef, useEffect } from "react"
import { Users, Link2 } from "lucide-react"

interface ShareSubmenuProps {
  x: number
  y: number
  onClose: () => void
  onCopyLink: () => void
  onShareConfig: () => void
}

export function ShareSubmenu({ x, y, onClose, onCopyLink, onShareConfig }: ShareSubmenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  const menuItems = [
    {
      icon: Users,
      label: "Share",
      shortcut: "Ctrl+Alt+A",
      onClick: onShareConfig,
    },
    {
      icon: Link2,
      label: "Copy link",
      onClick: onCopyLink,
    },
  ]

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] min-w-[200px] rounded-lg border border-[#dadce0] bg-white py-1 shadow-xl"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item, index) => {
        const Icon = item.icon
        return (
          <button
            key={index}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[#202124] transition-colors hover:bg-[#f1f3f4]"
            onClick={() => {
              item.onClick()
              onClose()
            }}
          >
            <Icon className="h-4 w-4 flex-shrink-0 text-[#5f6368]" />
            <span className="flex-1 text-left font-normal">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-[#80868b] font-mono">{item.shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

