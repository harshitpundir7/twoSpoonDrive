"use client"

import { useEffect, useState } from "react"
import { CheckCircle, XCircle, Loader2, X } from "lucide-react"

export type ToastType = "success" | "error" | "loading"

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
  duration?: number
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (type !== "loading") {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300) // Wait for fade out animation
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [type, duration, onClose])

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "loading":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return null
    }
  }

  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200"
      case "error":
        return "bg-red-50 border-red-200"
      case "loading":
        return "bg-blue-50 border-blue-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${getBgColor()}`}
    >
      {getIcon()}
      <span className="text-sm font-medium text-gray-900">{message}</span>
      {type !== "loading" && (
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="ml-2 rounded p-1 hover:bg-gray-200 transition-colors"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      )}
    </div>
  )
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  )
}

