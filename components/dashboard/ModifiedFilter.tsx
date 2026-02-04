"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

export type ModifiedFilterOption =
  | "all"
  | "today"
  | "last7days"
  | "last30days"
  | "thisyear"
  | "lastyear"
  | "custom"

interface ModifiedFilterProps {
  value: ModifiedFilterOption | null
  onChange: (value: ModifiedFilterOption | null) => void
}

export function ModifiedFilter({ value, onChange }: ModifiedFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingValue, setPendingValue] = useState<ModifiedFilterOption | null>(value)
  const menuRef = useRef<HTMLDivElement>(null)

  const currentYear = new Date().getFullYear()
  const lastYear = currentYear - 1

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setPendingValue(value) // Reset to current value if clicking outside
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, value])

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingValue(value) // Reset pending value when opening
    }
  }, [isOpen, value])

  const getDisplayLabel = () => {
    if (!value || value === "all") return "Modified"
    switch (value) {
      case "today":
        return "Today"
      case "last7days":
        return "Last 7 days"
      case "last30days":
        return "Last 30 days"
      case "thisyear":
        return `This year (${currentYear})`
      case "lastyear":
        return `Last year (${lastYear})`
      default:
        return "Modified"
    }
  }

  const handleApply = () => {
    onChange(pendingValue)
    setIsOpen(false)
  }

  const handleCancel = () => {
    setPendingValue(value) // Reset to current value
    setIsOpen(false)
  }

  const handleClearAll = () => {
    setPendingValue("all")
    onChange("all")
    setIsOpen(false)
  }

  const options = [
    { value: "today" as ModifiedFilterOption, label: "Today" },
    { value: "last7days" as ModifiedFilterOption, label: "Last 7 days" },
    { value: "last30days" as ModifiedFilterOption, label: "Last 30 days" },
    { value: "thisyear" as ModifiedFilterOption, label: `This year (${currentYear})` },
    { value: "lastyear" as ModifiedFilterOption, label: `Last year (${lastYear})` },
    { value: "custom" as ModifiedFilterOption, label: "Custom date range", hasArrow: true },
  ]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-9 items-center gap-2 rounded-md border px-3 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          isOpen
            ? "border-blue-500 bg-white text-blue-700"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
        }`}
      >
        <span>{getDisplayLabel()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform text-slate-500 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg">
          {/* Header */}
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Modified</span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* Options */}
          <div className="py-1">
            {options.map((option) => {
              const isSelected = pendingValue === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    if (option.value === "custom") {
                      // For now, just select it (custom date range dialog can be added later)
                      setPendingValue(option.value)
                    } else {
                      setPendingValue(option.value)
                    }
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm text-slate-900 transition-colors hover:bg-slate-50 ${
                    isSelected ? "bg-blue-50 text-blue-700" : ""
                  }`}
                >
                  <span className="flex-1 text-left font-medium">{option.label}</span>
                  {option.hasArrow && (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-4 py-2">
            <div className="flex items-center justify-between">
              <button
                onClick={handleClearAll}
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                Clear all
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  className="rounded px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  className="rounded px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

