"use client"

import { useState, useEffect } from "react"
import { X, Maximize, Minimize, FileText, ImageIcon, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function FilePreview({ file, onClose }) {
  const [expanded, setExpanded] = useState(false)
  const [objectUrl, setObjectUrl] = useState("")
  const [error, setError] = useState(null)

  useEffect(() => {
    // Create object URL when component mounts
    try {
      const url = URL.createObjectURL(file)
      setObjectUrl(url)
      setError(null)
    } catch (err) {
      console.error("Error creating object URL:", err)
      setError("Could not preview file")
    }

    // Clean up object URL when component unmounts
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [file])

  const isPdf = file.type === "application/pdf"
  const isImage = file.type.startsWith("image/")

  const toggleExpand = () => {
    setExpanded(!expanded)
  }

  const openInNewTab = () => {
    if (objectUrl) {
      window.open(objectUrl, "_blank")
    }
  }

  return (
    <Card className={`relative ${expanded ? "fixed inset-4 z-50" : "w-full"}`}>
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        <Button variant="outline" size="icon" onClick={toggleExpand} className="h-8 w-8 bg-white/90">
          {expanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={onClose} className="h-8 w-8 bg-white/90">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <CardContent className={`p-4 ${expanded ? "h-full overflow-auto" : "max-h-[500px] overflow-auto"}`}>
        <div className="flex flex-col items-center">
          <div className="mb-2 flex items-center">
            {isPdf ? <FileText className="h-5 w-5 mr-2" /> : <ImageIcon className="h-5 w-5 mr-2" />}
            <span className="font-medium">{file.name}</span>
          </div>

          {error ? (
            <div className="w-full h-[400px] flex items-center justify-center bg-gray-100">
              <p className="text-red-500">{error}</p>
            </div>
          ) : (
            <div className={`w-full ${expanded ? "h-[calc(100vh-150px)]" : "h-[400px]"}`}>
              {isPdf && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                  <FileText className="h-16 w-16 text-gray-400 mb-4" />
                  <p className="mb-4 text-center">PDF preview is not available directly in the browser.</p>
                  <Button onClick={openInNewTab} className="flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open PDF in New Tab
                  </Button>
                </div>
              )}
              {isImage && (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  {objectUrl ? (
                    <img
                      src={objectUrl || "/placeholder.svg"}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain"
                      onError={() => setError("Failed to load image")}
                    />
                  ) : (
                    <p className="text-gray-500">Loading preview...</p>
                  )}
                </div>
              )}
              {!isPdf && !isImage && (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <p className="text-gray-500">Preview not available for this file type</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
