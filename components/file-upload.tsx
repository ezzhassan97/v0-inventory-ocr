"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, ImageIcon, Loader2, AlertCircle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FilePreview } from "@/components/file-preview"
import { ApiDebugPanel } from "@/components/api-debug-panel"
import { uploadFile } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"

export function FileUpload() {
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [debugInfo, setDebugInfo] = useState({})
  const router = useRouter()
  const { toast } = useToast()

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    setError(null)
    setDebugInfo({})

    if (!selectedFile) return

    // Check file type
    const fileType = selectedFile.type
    if (
      !fileType.includes("pdf") &&
      !fileType.includes("image/jpeg") &&
      !fileType.includes("image/png") &&
      !fileType.includes("image/jpg")
    ) {
      setError("Please upload a PDF or image file (JPEG, PNG)")
      return
    }

    // Check file size (limit to 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit")
      return
    }

    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setIsUploading(true)
      setError(null)
      setDebugInfo({ status: "loading" })

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 5
        })
      }, 500)

      const formData = new FormData()
      formData.append("file", file)

      const result = await uploadFile(formData)

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (result.success) {
        toast({
          title: "Success",
          description: "Real estate inventory extracted successfully",
        })

        // Set debug info if available
        if (result.debug) {
          setDebugInfo({
            request: result.debug.request,
            response: result.debug.response,
            error: result.debug.error,
            status: result.debug.status,
          })
        }

        // Force a hard refresh to ensure the UI updates with new data
        router.refresh()
      } else {
        setError(result.error || "Failed to process file")

        // Set debug info if available
        if (result.debug) {
          setDebugInfo({
            request: result.debug.request,
            response: result.debug.response,
            error: result.debug.error,
            status: "error",
          })
        }

        toast({
          title: "Error",
          description: result.error || "Failed to extract inventory data",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to process file. Please try again.")

      toast({
        title: "Error",
        description: "Failed to extract inventory data from the file",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Reset progress after a delay
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }

  const handlePreviewClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setShowPreview(true)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">PDF, PNG, JPG or JPEG (max 10MB)</p>
                  {file && (
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                      {file.type.includes("pdf") ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                      <span>{file.name}</span>
                      <Button variant="ghost" size="sm" onClick={handlePreviewClick} className="ml-2 p-0 h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {uploadProgress > 0 && (
              <div className="w-full">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {uploadProgress < 100 ? "Processing with Gemini 1.5 Flash..." : "Complete!"}
                </p>
              </div>
            )}

            <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full">
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting Inventory Data...
                </>
              ) : (
                <>Extract Real Estate Inventory</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File Preview */}
      {file && showPreview && <FilePreview file={file} onClose={() => setShowPreview(false)} />}

      {/* API Debug Panel */}
      {(debugInfo.request || debugInfo.response || debugInfo.error) && (
        <ApiDebugPanel
          apiRequest={debugInfo.request}
          apiResponse={debugInfo.response}
          error={debugInfo.error}
          status={debugInfo.status}
        />
      )}
    </div>
  )
}
