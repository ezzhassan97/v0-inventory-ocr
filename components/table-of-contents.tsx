"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { EditableTable } from "@/components/editable-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TableToolbar } from "@/components/table-toolbar"
import { useToast } from "@/hooks/use-toast"
import { getExtractedTables } from "@/lib/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export function TableOfContents() {
  const [tables, setTables] = useState([])
  const [activeTable, setActiveTable] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState(0)
  const [error, setError] = useState(null)
  const [timestamp, setTimestamp] = useState(0)
  const intervalRef = useRef(null)
  const progressIntervalRef = useRef(null)
  const router = useRouter()
  const { toast } = useToast()

  // Function to fetch tables
  const fetchTables = async () => {
    try {
      setError(null)

      const data = await getExtractedTables()
      console.log("Fetched tables data:", JSON.stringify(data, null, 2))

      // Check if the timestamp has changed
      if (data.timestamp !== timestamp) {
        setTimestamp(data.timestamp || 0)

        // If timestamp changed, we have new data, so reset tables
        if (data.timestamp > timestamp) {
          setTables([])
          setActiveTable(null)
        }
      }

      // Set extraction status
      const newExtractionStatus = data.isExtracting || false

      // If extraction status changed from false to true, start progress animation
      if (!isExtracting && newExtractionStatus) {
        setExtractionProgress(0)
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
        progressIntervalRef.current = setInterval(() => {
          setExtractionProgress((prev) => {
            if (prev >= 95) {
              return prev
            }
            return prev + 5
          })
        }, 1000)
      }

      // If extraction status changed from true to false, complete progress
      if (isExtracting && !newExtractionStatus) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        setExtractionProgress(100)

        // Reset progress after a delay
        setTimeout(() => {
          setExtractionProgress(0)
        }, 2000)
      }

      setIsExtracting(newExtractionStatus)

      // If extraction status changed from true to false, we need to clear the interval
      if (isExtracting && !newExtractionStatus && intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      if (data && data.tables && Array.isArray(data.tables) && data.tables.length > 0) {
        // Validate table structure
        const validTables = data.tables.filter(
          (table) => table && Array.isArray(table.headers) && Array.isArray(table.data),
        )

        if (validTables.length > 0) {
          setTables(validTables)
          setActiveTable(validTables[0].id)
        } else {
          console.error("No valid tables found in data:", data.tables)
          setTables([])
          setActiveTable(null)
          if (!newExtractionStatus) {
            setError("No valid table data found in the extraction results")
          }
        }
      } else {
        console.log("No tables found in data:", data)
        setTables([])
        setActiveTable(null)
      }
    } catch (err) {
      console.error("Failed to fetch tables:", err)
      setError("Failed to load extracted inventory data")
      toast({
        title: "Error",
        description: "Failed to load extracted inventory data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch and setup polling if needed
  useEffect(() => {
    // Initial fetch
    setIsLoading(true)
    fetchTables()

    // Clean up interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [])

  // Set up or clear polling based on extraction status
  useEffect(() => {
    // If extracting and no interval is set, start polling
    if (isExtracting && !intervalRef.current) {
      intervalRef.current = setInterval(fetchTables, 2000)
    }
    // If not extracting and interval is set, clear it
    else if (!isExtracting && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Clean up on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isExtracting])

  const getActiveTableData = () => {
    if (!activeTable) return null
    return tables.find((table) => table.id === activeTable)
  }

  const handleTableUpdate = (tableId, newData) => {
    setTables((prevTables) => prevTables.map((table) => (table.id === tableId ? { ...table, data: newData } : table)))
  }

  if (isLoading && tables.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Extracted Real Estate Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-8 w-64 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 w-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isExtracting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Extracted Real Estate Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col justify-center items-center h-64 space-y-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="w-full max-w-md space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Extracting inventory data...</span>
                <span className="font-medium">{extractionProgress}%</span>
              </div>
              <Progress value={extractionProgress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                Analyzing document structure and extracting property details.
                <br />
                This may take a moment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Extracted Real Estate Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (tables.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Extracted Real Estate Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32 text-gray-500">
            No inventory data extracted yet. Upload a file to get started.
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentTable = getActiveTableData()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracted Real Estate Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTable || undefined} onValueChange={setActiveTable} className="w-full">
          <TabsList className="mb-4 w-full justify-start overflow-x-auto">
            {tables.map((table) => (
              <TabsTrigger key={table.id} value={table.id}>
                {table.name || `Inventory ${tables.indexOf(table) + 1}`}
              </TabsTrigger>
            ))}
          </TabsList>

          {tables.map((table) => (
            <TabsContent key={table.id} value={table.id}>
              {currentTable && currentTable.id === table.id && (
                <>
                  <TableToolbar
                    tableId={table.id}
                    onUpdate={(newData) => handleTableUpdate(table.id, newData)}
                    data={table.data}
                    headers={table.headers}
                  />
                  <div className="border rounded-md mt-4 overflow-x-auto">
                    <EditableTable
                      data={table.data}
                      headers={table.headers}
                      onUpdate={(newData) => handleTableUpdate(table.id, newData)}
                    />
                  </div>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
