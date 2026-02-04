"use client"

import { useState, useRef } from "react"
import { Upload, X } from "lucide-react"

interface FileUploadProps {
  parentId: string | null
  onUploadComplete: () => void
  onClose: () => void
}

export function FileUpload({ parentId, onUploadComplete, onClose }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }


  const uploadFileViaProxy = async (file: File, fileIndex: number) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append("file", file)
      if (parentId) {
        formData.append("parentId", parentId)
      }

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100)
          setUploadProgress((prev) => ({ ...prev, [fileIndex]: percentComplete }))
        }
      })

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          resolve()
        } else {
          // Try to parse JSON error response
          let errorMessage = `Upload failed: Status ${xhr.status}`
          try {
            const errorData = JSON.parse(xhr.responseText)
            if (errorData.error) {
              errorMessage = errorData.error
            }
          } catch {
            // If not JSON, use response text or status text
            errorMessage = xhr.responseText || xhr.statusText || errorMessage
          }
          reject(new Error(errorMessage))
        }
      })

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"))
      })

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload was aborted"))
      })

      try {
        xhr.open("POST", "/api/files/upload-proxy")
        xhr.send(formData)
      } catch (error) {
        reject(new Error(`Failed to start upload: ${error instanceof Error ? error.message : "Unknown error"}`))
      }
    })
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    const errors: string[] = []

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index]
        try {
          // Use proxy upload (avoids CORS issues)
          console.log(`Uploading ${file.name} via proxy...`)
          await uploadFileViaProxy(file, index)
          console.log(`Successfully uploaded ${file.name}`)
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error)
          const errorMessage = error instanceof Error ? error.message : "Upload failed"
          console.error("Full error details:", error)
          errors.push(`${file.name}: ${errorMessage}`)
        }
      }

      if (errors.length > 0) {
        alert(`Some files failed to upload:\n${errors.join("\n")}`)
      } else {
        // Dispatch storage update event to refresh sidebar
        window.dispatchEvent(new CustomEvent("storage:update"))
        onUploadComplete()
        onClose()
      }
    } finally {
      setUploading(false)
      setFiles([])
      setUploadProgress({})
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-normal text-[#202124]">Upload Files</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-full p-1 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5 text-[#5f6368]" />
          </button>
        </div>

        <div className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full rounded border-2 border-dashed border-[#dadce0] bg-[#f8f9fa] px-4 py-8 text-sm text-[#5f6368] transition-colors hover:border-[#4285f4] hover:bg-[#f1f3f4] disabled:opacity-50"
          >
            <Upload className="mx-auto mb-2 h-8 w-8" />
            <div>Click to select files or drag and drop</div>
          </button>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded border border-[#dadce0] bg-white p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium text-[#202124]">
                      {file.name}
                    </div>
                    <div className="text-xs text-[#80868b]">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                      {uploadProgress[index] !== undefined && (
                        <span className="ml-2">
                          - {uploadProgress[index]}%
                        </span>
                      )}
                    </div>
                  </div>
                  {!uploading && (
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-2 rounded-full p-1 hover:bg-gray-100"
                    >
                      <X className="h-4 w-4 text-[#5f6368]" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded px-4 py-2 text-sm font-medium text-[#1a73e8] transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="rounded bg-[#1a73e8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1557b0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  )
}

