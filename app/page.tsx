"use client"

import { useState } from "react"
import { FileUpload } from "@/components/file-upload"
import { EditableTable } from "@/components/editable-table"
import { TableToolbar } from "@/components/table-toolbar"
import { ApiDebugPanel } from "@/components/api-debug-panel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, AlertTriangle, ChevronDown, ChevronUp, WifiOff } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

export default function Home() {
  // Update the state to handle multiple tables
  const [extractedTables, setExtractedTables] = useState([])
  const [openTableIds, setOpenTableIds] = useState({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)
  const { toast } = useToast()

  const handleProcessingStart = () => {
    // Clear previous data and set processing state
    setExtractedTables([])
    setOpenTableIds({})
    setIsProcessing(true)
    setError(null)
    setDebugInfo(null)
  }

  // Update the handleProcessingComplete function
  const handleProcessingComplete = (result) => {
    setIsProcessing(false)

    if (result.success && result.tables && result.tables.length > 0) {
      setExtractedTables(result.tables)

      // Set the first table to be open by default
      const initialOpenState = {}
      result.tables.forEach((table) => {
        initialOpenState[table.id] = true
      })
      setOpenTableIds(initialOpenState)

      setDebugInfo(result.debug || null)

      // Check if we're using fallback mode
      const isFallback =
        result.debug?.status === "fallback" ||
        (result.tables.length === 1 &&
          result.tables[0].headers.length === 1 &&
          result.tables[0].headers[0] === "Content")

      if (isFallback) {
        toast({
          title: "Limited Extraction",
          description: "Could not extract structured table data. Showing raw text instead.",
          variant: "warning",
        })
      } else {
        toast({
          title: "Success",
          description: `${result.tables.length} table(s) extracted successfully`,
        })
      }
    } else {
      setError(result.debug?.suggestion || "No data could be extracted from the file")
      setDebugInfo(result.debug || null)

      toast({
        title: "Warning",
        description: result.debug?.suggestion || "No structured data could be extracted",
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

  // Toggle table collapse state
  const toggleTableCollapse = (tableId) => {
    setOpenTableIds((prev) => ({
      ...prev,
      [tableId]: !prev[tableId],
    }))
  }

  // Update the handleTableUpdate function
  const handleTableUpdate = (tableId, newData) => {
    setExtractedTables((prev) => prev.map((table) => (table.id === tableId ? { ...table, data: newData } : table)))
  }

  // Check if we're in fallback mode (raw text only)
  const isFallbackMode =
    extractedTables.length === 1 &&
    extractedTables[0]?.headers?.length === 1 &&
    extractedTables[0]?.headers[0] === "Content"

  // Check if we have a connectivity error
  const isConnectivityError = debugInfo?.isConnectivityError

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
            <Alert variant={isConnectivityError ? "warning" : "destructive"}>
              {isConnectivityError ? <WifiOff className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{isConnectivityError ? "Connection Error" : "Error"}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {extractedTables.length > 0 && !isProcessing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Extracted Tables</h2>
                {extractedTables.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Toggle all tables - if all are open, close all; otherwise open all
                      const allOpen = extractedTables.every((table) => openTableIds[table.id])
                      const newState = {}
                      extractedTables.forEach((table) => {
                        newState[table.id] = !allOpen
                      })
                      setOpenTableIds(newState)
                    }}
                  >
                    {extractedTables.every((table) => openTableIds[table.id]) ? "Collapse All" : "Expand All"}
                  </Button>
                )}
              </div>

              {isFallbackMode ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{extractedTables[0]?.name || "Extracted Text"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Alert variant="warning">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Limited Extraction</AlertTitle>
                      <AlertDescription>
                        Could not extract structured table data. Showing raw text instead. Try uploading a clearer image
                        or a different document format.
                      </AlertDescription>
                    </Alert>
                    <div className="border rounded-md p-4 mt-4 max-h-[400px] overflow-auto">
                      <pre className="text-sm whitespace-pre-wrap">
                        {extractedTables[0]?.data?.[0]?.[0] || "No content extracted"}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {extractedTables.map((table) => (
                    <Card key={table.id} className="overflow-hidden">
                      <div
                        className="bg-muted/40 p-4 flex items-center justify-between cursor-pointer hover:bg-muted/60"
                        onClick={() => toggleTableCollapse(table.id)}
                      >
                        <div className="flex items-center space-x-2">
                          {openTableIds[table.id] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          <h3 className="font-medium">{table.name}</h3>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {table.data.length} rows × {table.headers.length} columns
                        </div>
                      </div>

                      {openTableIds[table.id] && (
                        <div className="p-4">
                          <TableToolbar
                            data={table.data}
                            headers={table.headers}
                            onUpdate={(newData) => handleTableUpdate(table.id, newData)}
                          />
                          <div className="border rounded-md mt-4 overflow-x-auto">
                            <EditableTable
                              data={table.data}
                              headers={table.headers}
                              onUpdate={(newData) => handleTableUpdate(table.id, newData)}
                            />
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
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
