"use client"

import { useState, useEffect, useRef } from "react"
import { X, Link2, Globe, UserPlus, Settings, HelpCircle, Check, ChevronDown, Loader2 } from "lucide-react"

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
  fileId: string
  fileName: string
  isFolder: boolean
  onToast?: (message: string, type: "success" | "error" | "loading") => void
}

interface ShareInfo {
  accessLevel: "restricted" | "anyone"
  permission: "viewer" | "commenter" | "editor"
  shareLink: string | null
  people: Array<{
    id: string
    email: string
    name: string
    permission: "viewer" | "commenter" | "editor"
    isOwner: boolean
  }>
}

export function ShareDialog({ isOpen, onClose, fileId, fileName, isFolder, onToast }: ShareDialogProps) {
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdatingAccess, setIsUpdatingAccess] = useState(false)
  const [isUpdatingPermission, setIsUpdatingPermission] = useState(false)
  const [emailInput, setEmailInput] = useState("")
  const [isAddingPeople, setIsAddingPeople] = useState(false)
  const [showAccessDropdown, setShowAccessDropdown] = useState(false)
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const accessDropdownRef = useRef<HTMLDivElement>(null)
  const permissionDropdownRef = useRef<HTMLDivElement>(null)

  const showToast = (message: string, type: "success" | "error" | "loading") => {
    if (onToast) {
      onToast(message, type)
    } else {
      // Fallback to console if no toast handler provided
      console.log(`[${type.toUpperCase()}] ${message}`)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchShareInfo()
    }
  }, [isOpen, fileId])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accessDropdownRef.current &&
        !accessDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAccessDropdown(false)
      }
      if (
        permissionDropdownRef.current &&
        !permissionDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPermissionDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchShareInfo = async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true)
    }
    try {
      const res = await fetch(`/api/files/${fileId}/share`)
      if (res.ok) {
        const data = await res.json()
        setShareInfo(data)
      } else {
        const error = await res.json()
        setErrorMessage(error.error || "Failed to load share information")
      }
    } catch (error) {
      console.error("Error fetching share info:", error)
      setErrorMessage("Failed to load share information")
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }

  const handleCopyLink = async () => {
    if (!shareInfo?.shareLink) {
      // Generate link if it doesn't exist
      await handleUpdateAccess("anyone", shareInfo?.permission || "viewer")
      return
    }

    try {
      await navigator.clipboard.writeText(shareInfo.shareLink)
      showToast("Link copied to clipboard!", "success")
    } catch (error) {
      console.error("Failed to copy link:", error)
      showToast("Failed to copy link", "error")
    }
  }

  const handleUpdateAccess = async (accessLevel: "restricted" | "anyone", permission: "viewer" | "commenter" | "editor") => {
    setIsUpdatingAccess(true)
    setErrorMessage(null)
    
    try {
      const res = await fetch(`/api/files/${fileId}/share`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessLevel,
          permission,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Don't show loading spinner when refreshing after update
        await fetchShareInfo(false)
        
        if (accessLevel === "anyone" && data.shareLink) {
          // Copy link after generating
          try {
            await navigator.clipboard.writeText(data.shareLink)
            showToast("Link generated and copied to clipboard!", "success")
          } catch (copyError) {
            showToast("Link generated successfully", "success")
          }
        } else if (accessLevel === "restricted") {
          showToast("Access changed to restricted", "success")
        }
      } else {
        const error = await res.json()
        const errorMsg = error.error || "Failed to update access settings"
        setErrorMessage(errorMsg)
        showToast(errorMsg, "error")
      }
    } catch (error) {
      console.error("Error updating access:", error)
      const errorMsg = "Failed to update access settings"
      setErrorMessage(errorMsg)
      showToast(errorMsg, "error")
    } finally {
      setIsUpdatingAccess(false)
    }
  }

  const handleAddPeople = async () => {
    if (!emailInput.trim()) return

    const emails = emailInput
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes("@")) // Basic email validation

    if (emails.length === 0) {
      setErrorMessage("Please enter valid email addresses")
      return
    }

    setIsAddingPeople(true)
    setErrorMessage(null)
    try {
      const res = await fetch(`/api/files/${fileId}/share/people`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails,
          permission: shareInfo?.permission || "viewer",
        }),
      })

      if (res.ok) {
        setEmailInput("")
        await fetchShareInfo()
        showToast("People added successfully", "success")
      } else {
        const error = await res.json()
        const errorMsg = error.error || "Failed to add people"
        setErrorMessage(errorMsg)
        showToast(errorMsg, "error")
      }
    } catch (error) {
      console.error("Error adding people:", error)
      const errorMsg = "Failed to add people"
      setErrorMessage(errorMsg)
      showToast(errorMsg, "error")
    } finally {
      setIsAddingPeople(false)
    }
  }

  const handleUpdatePersonPermission = async (shareId: string, permission: "viewer" | "commenter" | "editor") => {
    setIsUpdatingPermission(true)
    try {
      const res = await fetch(`/api/files/${fileId}/share/people/${shareId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permission }),
      })

      if (res.ok) {
        await fetchShareInfo()
        showToast("Permission updated", "success")
      } else {
        const error = await res.json()
        showToast(error.error || "Failed to update permission", "error")
      }
    } catch (error) {
      console.error("Error updating permission:", error)
      showToast("Failed to update permission", "error")
    } finally {
      setIsUpdatingPermission(false)
    }
  }

  const handleRemovePerson = async (shareId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}/share/people/${shareId}`, {
        method: "DELETE",
      })

      if (res.ok) {
        await fetchShareInfo()
        showToast("Person removed", "success")
      } else {
        const error = await res.json()
        showToast(error.error || "Failed to remove person", "error")
      }
    } catch (error) {
      console.error("Error removing person:", error)
      showToast("Failed to remove person", "error")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-full max-w-lg rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#dadce0] px-6 py-4">
          <h2 className="text-xl font-normal text-[#202124]">
            Share '{fileName}'
          </h2>
          <div className="flex items-center gap-2">
            <button className="rounded-full p-1.5 transition-colors hover:bg-[#f1f3f4]">
              <HelpCircle className="h-5 w-5 text-[#5f6368]" />
            </button>
            <button className="rounded-full p-1.5 transition-colors hover:bg-[#f1f3f4]">
              <Settings className="h-5 w-5 text-[#5f6368]" />
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 transition-colors hover:bg-[#f1f3f4]"
            >
              <X className="h-5 w-5 text-[#5f6368]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[600px] overflow-y-auto overflow-x-visible px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#1a73e8]" />
            </div>
          ) : shareInfo ? (
            <>
              {/* Error Message */}
              {errorMessage && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-600">{errorMessage}</p>
                </div>
              )}

              {/* Add People Input */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add people, groups, spaces, and calendar events"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value)
                      setErrorMessage(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isAddingPeople) {
                        handleAddPeople()
                      }
                    }}
                    disabled={isAddingPeople || isUpdatingAccess}
                    className="flex-1 rounded border-2 border-[#1a73e8] bg-white px-4 py-2.5 text-sm text-[#202124] placeholder-[#80868b] focus:outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={handleAddPeople}
                    disabled={!emailInput.trim() || isAddingPeople || isUpdatingAccess}
                    className="rounded-lg bg-[#1a73e8] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1557b0] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAddingPeople ? "Adding..." : "Add"}
                  </button>
                </div>
              </div>

              {/* People with Access */}
              {shareInfo.people.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-medium text-[#202124]">People with access</h3>
                  <div className="space-y-2">
                    {shareInfo.people.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center justify-between rounded-lg border border-[#dadce0] bg-[#f8f9fa] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a73e8] text-white text-sm font-medium">
                            {person.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#202124]">
                              {person.name} {person.isOwner && "(you)"}
                            </div>
                            <div className="text-xs text-[#5f6368]">{person.email}</div>
                          </div>
                        </div>
                        {person.isOwner ? (
                          <span className="text-sm text-[#5f6368]">Owner</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              value={person.permission}
                              onChange={(e) =>
                                handleUpdatePersonPermission(
                                  person.id,
                                  e.target.value as "viewer" | "commenter" | "editor"
                                )
                              }
                              className="rounded border border-[#dadce0] bg-white px-3 py-1.5 text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="commenter">Commenter</option>
                              <option value="editor">Editor</option>
                            </select>
                            <button
                              onClick={() => handleRemovePerson(person.id)}
                              className="rounded px-2 py-1 text-sm text-[#5f6368] hover:bg-[#f1f3f4]"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General Access */}
              <div className="relative rounded-lg border border-[#dadce0] bg-[#f8f9fa] p-4">
                <h3 className="mb-3 text-sm font-medium text-[#202124]">General access</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {shareInfo.accessLevel === "anyone" ? (
                      <Globe className="h-5 w-5 text-green-600" />
                    ) : (
                      <UserPlus className="h-5 w-5 text-[#5f6368]" />
                    )}
                    <div className="relative">
                      <div className="relative z-[60]" ref={accessDropdownRef}>
                        <button
                          onClick={() => setShowAccessDropdown(!showAccessDropdown)}
                          disabled={isUpdatingAccess}
                          className="flex items-center gap-2 rounded border border-[#dadce0] bg-white px-3 py-2 text-sm text-[#202124] hover:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isUpdatingAccess ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-[#1a73e8]" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <>
                              <span>
                                {shareInfo.accessLevel === "anyone"
                                  ? "Anyone with the link"
                                  : "Restricted"}
                              </span>
                              <ChevronDown className="h-4 w-4 text-[#5f6368]" />
                            </>
                          )}
                        </button>
                        {showAccessDropdown && (
                          <div className="absolute left-0 top-full z-[70] mt-1 w-48 rounded border border-[#dadce0] bg-white shadow-xl">
                            <button
                              onClick={() => {
                                handleUpdateAccess("restricted", shareInfo.permission)
                                setShowAccessDropdown(false)
                              }}
                              disabled={isUpdatingAccess}
                              className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-[#202124] hover:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-50 ${
                                shareInfo.accessLevel === "restricted" ? "bg-[#e8f0fe]" : ""
                              }`}
                            >
                              {shareInfo.accessLevel === "restricted" && (
                                <Check className="h-4 w-4 text-[#1a73e8]" />
                              )}
                              <span>Restricted</span>
                            </button>
                            <button
                              onClick={() => {
                                handleUpdateAccess("anyone", shareInfo.permission)
                                setShowAccessDropdown(false)
                              }}
                              disabled={isUpdatingAccess}
                              className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-[#202124] hover:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-50 ${
                                shareInfo.accessLevel === "anyone" ? "bg-[#e8f0fe]" : ""
                              }`}
                            >
                              {shareInfo.accessLevel === "anyone" && (
                                <Check className="h-4 w-4 text-[#1a73e8]" />
                              )}
                              <span>Anyone with the link</span>
                            </button>
                          </div>
                        )}
                      </div>
                      {shareInfo.accessLevel === "anyone" && (
                        <p className="mt-1 text-xs text-[#5f6368]">
                          Anyone on the internet with the link can view
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="relative z-[60]" ref={permissionDropdownRef}>
                    <button
                      onClick={() => setShowPermissionDropdown(!showPermissionDropdown)}
                      disabled={isUpdatingPermission || isUpdatingAccess}
                      className="flex items-center gap-2 rounded border border-[#dadce0] bg-white px-3 py-2 text-sm text-[#202124] hover:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdatingPermission ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-[#1a73e8]" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <span className="capitalize">{shareInfo.permission}</span>
                          <ChevronDown className="h-4 w-4 text-[#5f6368]" />
                        </>
                      )}
                    </button>
                    {showPermissionDropdown && (
                      <div className="absolute right-0 top-full z-[70] mt-1 w-32 rounded border border-[#dadce0] bg-white shadow-xl">
                        <div className="px-3 py-2 text-xs font-medium text-[#5f6368]">ROLE</div>
                        {(["viewer", "commenter", "editor"] as const).map((permission) => (
                          <button
                            key={permission}
                            onClick={() => {
                              handleUpdateAccess(shareInfo.accessLevel, permission)
                              setShowPermissionDropdown(false)
                            }}
                            disabled={isUpdatingPermission || isUpdatingAccess}
                            className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-[#202124] hover:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-50 ${
                              shareInfo.permission === permission ? "bg-[#e8f0fe]" : ""
                            }`}
                          >
                            {shareInfo.permission === permission && (
                              <Check className="h-4 w-4 text-[#1a73e8]" />
                            )}
                            <span className="capitalize">{permission}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#dadce0] px-6 py-4">
          <button
            onClick={handleCopyLink}
            disabled={isUpdatingAccess}
            className="flex items-center gap-2 rounded-lg border border-[#1a73e8] bg-white px-4 py-2 text-sm font-medium text-[#1a73e8] transition-colors hover:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" />
            Copy link
          </button>
          <button
            onClick={onClose}
            disabled={isUpdatingAccess || isUpdatingPermission}
            className="rounded-lg bg-[#1a73e8] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1557b0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

