"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { EditableTable } from "@/components/editable-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TableToolbar } from "@/components/table-toolbar"
import { useToast } from "@/hooks/use-toast"
import { getExtractedTables } from "@/lib/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function TableOfContents() {
  const [tables, setTables] = useState([])
  const [activeTable, setActiveTable] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const router = useRouter()
  const { toast } = useToast()

  // Fetch tables on component mount and when router is refreshed
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const data = await getExtractedTables()
        console.log("Fetched tables data:", JSON.stringify(data, null, 2))

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
            setError("No valid table data found in the extraction results")
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

    fetchTables()
  }, [toast])

  const getActiveTableData = () => {
    if (!activeTable) return null
    return tables.find((table) => table.id === activeTable)
  }

  const handleTableUpdate = (tableId, newData) => {
    setTables((prevTables) => prevTables.map((table) => (table.id === tableId ? { ...table, data: newData } : table)))
  }

  if (isLoading) {
    return (
      <Card>
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
