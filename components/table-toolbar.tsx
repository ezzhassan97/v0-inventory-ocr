"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, Plus, Save, FileDown, FileText } from "lucide-react"
import { saveTableData } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"

interface TableToolbarProps {
  tableId: string
  data: string[][]
  headers: string[]
  onUpdate: (newData: string[][]) => void
}

export function TableToolbar({ tableId, data, headers, onUpdate }: TableToolbarProps) {
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleAddRow = () => {
    // Create a new empty row with the same number of columns
    const newRow = Array(headers.length).fill("")
    const newData = [...data, newRow]
    onUpdate(newData)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await saveTableData(tableId, data)
      toast({
        title: "Success",
        description: "Table data saved successfully",
      })
    } catch (error) {
      console.error("Failed to save table data:", error)
      toast({
        title: "Error",
        description: "Failed to save table data",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const exportToCSV = () => {
    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...data.map((row) => row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n")

    // Create a blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `table-${tableId}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up
    URL.revokeObjectURL(url)

    toast({
      title: "Downloaded",
      description: "CSV file downloaded successfully",
    })
  }

  const exportToExcel = () => {
    // Create Excel-compatible CSV
    const excelContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...data.map((row) => row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(",")),
      ].join("\n")

    // Create a blob and download
    const blob = new Blob([excelContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `table-${tableId}.xlsx`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up
    URL.revokeObjectURL(url)

    toast({
      title: "Downloaded",
      description: "Excel file downloaded successfully",
    })
  }

  const exportToJSON = () => {
    // Create JSON with headers and data
    const jsonData = {
      headers,
      data,
    }

    const jsonContent = JSON.stringify(jsonData, null, 2)

    // Create a blob and download
    const blob = new Blob([jsonContent], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `table-${tableId}.json`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up
    URL.revokeObjectURL(url)

    toast({
      title: "Downloaded",
      description: "JSON file downloaded successfully",
    })
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={handleAddRow}>
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
        <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={exportToCSV}>
            <FileDown className="h-4 w-4 mr-2" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToExcel}>
            <FileText className="h-4 w-4 mr-2" />
            Export as Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToJSON}>
            <FileText className="h-4 w-4 mr-2" />
            Export as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
