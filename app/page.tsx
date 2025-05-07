"use client"

import { useState } from "react"
import { FileUpload } from "@/components/file-upload"
import { EditableTable } from "@/components/editable-table"
import { TableToolbar } from "@/components/table-toolbar"
import { ApiDebugPanel } from "@/components/api-debug-panel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

export default function Home() {
  const [extractedData, setExtractedData] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)
  const { toast } = useToast()

  const handleProcessingStart = () => {
    // Clear previous data and set processing state
    setExtractedData(null)
    setIsProcessing(true)
    setError(null)
    setDebugInfo(null)
  }

  const handleProcessingComplete = (result) => {
    setIsProcessing(false)

    if (result.success && result.tables && result.tables.length > 0) {
      setExtractedData(result.tables[0])
      setDebugInfo(result.debug || null)

      toast({
        title: "Success",
        description: "Real estate inventory extracted successfully",
      })
    } else {
      setError("No data could be extracted from the file")
      setDebugInfo(result.debug || null)

      toast({
        title: "Warning",
        description: "No structured data could be extracted",
        variant: "destructive",
      })
    }
  }

  const handleError = (errorMessage) => {
    setIsProcessing(false)
    setError(errorMessage)

    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    })
  }

  const handleTableUpdate = (newData) => {
    if (extractedData) {
      setExtractedData({
        ...extractedData,
        data: newData,
      })
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Real Estate Inventory OCR</h1>
        <p className="text-muted-foreground">
          Extract property inventory data from PDFs or images using Google Gemini AI
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <FileUpload
            onProcessingStart={handleProcessingStart}
            onProcessingComplete={handleProcessingComplete}
            onError={handleError}
          />

          {isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle>Extracting Inventory Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-center text-muted-foreground">
                    Analyzing document and extracting property details...
                    <br />
                    This may take a moment.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {error && !isProcessing && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {extractedData && !isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle>{extractedData.name || "Extracted Real Estate Inventory"}</CardTitle>
              </CardHeader>
              <CardContent>
                <TableToolbar data={extractedData.data} headers={extractedData.headers} onUpdate={handleTableUpdate} />
                <div className="border rounded-md mt-4 overflow-x-auto">
                  <EditableTable
                    data={extractedData.data}
                    headers={extractedData.headers}
                    onUpdate={handleTableUpdate}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {debugInfo && (
            <ApiDebugPanel
              apiRequest={debugInfo.request}
              apiResponse={debugInfo.response}
              error={debugInfo.error}
              status={debugInfo.status}
            />
          )}
        </div>

        <div className="border rounded-lg p-4 h-fit">
          <h2 className="font-semibold mb-2">How it works</h2>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Upload a PDF or image containing real estate inventory data</li>
            <li>Google Gemini 1.5 Flash extracts property details using OCR</li>
            <li>Edit cells, add or remove rows as needed</li>
            <li>Export the final data as CSV, Excel, or JSON</li>
          </ol>

          <div className="mt-4 pt-4 border-t">
            <h3 className="font-semibold mb-2 text-sm">Extracted Fields</h3>
            <div className="grid grid-cols-2 gap-1">
              <div className="text-xs text-muted-foreground">• Unit Number</div>
              <div className="text-xs text-muted-foreground">• Building Number</div>
              <div className="text-xs text-muted-foreground">• Property Type</div>
              <div className="text-xs text-muted-foreground">• Floor Number</div>
              <div className="text-xs text-muted-foreground">• Unit Area</div>
              <div className="text-xs text-muted-foreground">• Bedrooms</div>
              <div className="text-xs text-muted-foreground">• Bathrooms</div>
              <div className="text-xs text-muted-foreground">• Price</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <h3 className="font-semibold mb-2 text-sm">Tips</h3>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>For best results, use clear images with good lighting</li>
              <li>Tables should have clear borders or spacing</li>
              <li>Maximum file size: 10MB</li>
              <li>Gemini works best with well-structured property listings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
