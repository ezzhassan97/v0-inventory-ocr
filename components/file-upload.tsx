"use client"

import { useState } from "react"
import { Upload, FileText, ImageIcon, Loader2, AlertCircle, Eye, WifiOff, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FilePreview } from "@/components/file-preview"
import { processFile } from "@/lib/actions"

export function FileUpload({ onProcessingStart, onProcessingComplete, onError }) {
  const [file, setFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [errorType, setErrorType] = useState("general") // "general", "connectivity", "api", "config"
  const [showPreview, setShowPreview] = useState(false)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    setError(null)
    setErrorType("general")

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

  const handleExtract = async () => {
    if (!file) return

    try {
      // Reset states
      setIsProcessing(true)
      setProgress(0)
      setError(null)
      setErrorType("general")

      // Notify parent component
      onProcessingStart()

      // Start progress animation
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 5
        })
      }, 500)

      // Process the file
      const formData = new FormData()
      formData.append("file", file)

      try {
        // Try server action first
        let result = await processFile(formData)

        // If server action fails, try API route
        if (!result || result.error) {
          console.log("Server action failed, trying API route")
          const response = await fetch("/api/ocr", {
            method: "POST",
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }))
            throw new Error(errorData.error || `Server error: ${response.status}`)
          }

          result = await response.json()
        }

        // Complete progress animation
        clearInterval(progressInterval)
        setProgress(100)

        // Handle result
        if (result.success) {
          onProcessingComplete(result)
        } else {
          // Determine error type
          let errorType = "general"
          const errorMsg = result.error || "Failed to process file"

          if (result.debug?.isConnectivityError) {
            errorType = "connectivity"
          } else if (errorMsg.includes("API key") || errorMsg.includes("permission") || errorMsg.includes("access")) {
            errorType = "config"
          } else if (errorMsg.includes("Google AI") || errorMsg.includes("Gemini")) {
            errorType = "api"
          }

          setErrorType(errorType)
          setError(errorMsg)
          onError(errorMsg)
        }
      } catch (err) {
        clearInterval(progressInterval)
        throw err
      }
    } catch (err) {
      console.error("Error processing file:", err)
      setProgress(0)

      // Determine error type
      let errorType = "general"
      const errorMsg = err.message || "An unexpected error occurred"

      if (
        errorMsg.includes("Failed to fetch") ||
        errorMsg.includes("network") ||
        errorMsg.includes("ECONNREFUSED") ||
        errorMsg.includes("timeout")
      ) {
        errorType = "connectivity"
      } else if (
        errorMsg.includes("API key") ||
        errorMsg.includes("configuration") ||
        errorMsg.includes("environment")
      ) {
        errorType = "config"
      } else if (errorMsg.includes("Google AI") || errorMsg.includes("Gemini") || errorMsg.includes("quota")) {
        errorType = "api"
      }

      setErrorType(errorType)
      setError(errorMsg)
      onError(errorMsg)
    } finally {
      // Keep progress at 100% for a moment to show completion if successful
      if (progress > 0) {
        setTimeout(() => {
          setIsProcessing(false)
          setProgress(0)
        }, 2000)
      } else {
        setIsProcessing(false)
      }
    }
  }

  const getErrorIcon = () => {
    switch (errorType) {
      case "connectivity":
        return <WifiOff className="h-4 w-4" />
      case "config":
        return <ShieldAlert className="h-4 w-4" />
      case "api":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getErrorTitle = () => {
    switch (errorType) {
      case "connectivity":
        return "Connection Error"
      case "config":
        return "Configuration Error"
      case "api":
        return "API Error"
      default:
        return "Error"
    }
  }

  const getErrorVariant = () => {
    switch (errorType) {
      case "connectivity":
        return "warning"
      case "config":
        return "destructive"
      case "api":
        return "destructive"
      default:
        return "destructive"
    }
  }

  return (
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
                    <Button variant="ghost" size="sm" onClick={() => setShowPreview(true)} className="ml-2 p-0 h-8 w-8">
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
                disabled={isProcessing}
              />
            </label>
          </div>

          {error && (
            <Alert variant={getErrorVariant()}>
              {getErrorIcon()}
              <AlertTitle>{getErrorTitle()}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              {errorType === "config" && (
                <div className="mt-2 text-xs">
                  <p>Make sure the GOOGLE_API_KEY environment variable is set correctly in your deployment settings.</p>
                </div>
              )}
            </Alert>
          )}

          {progress > 0 && (
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Processing with Gemini 2.0 Flash...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-center">
                {progress < 100 ? (
                  <div className="flex items-center text-xs text-gray-500">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Extracting data...
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-green-500">Extraction complete!</div>
                )}
              </div>
            </div>
          )}

          <Button onClick={handleExtract} disabled={!file || isProcessing} className="w-full">
            {isProcessing ? (
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

      {/* File Preview */}
      {file && showPreview && <FilePreview file={file} onClose={() => setShowPreview(false)} />}
    </Card>
  )
}
