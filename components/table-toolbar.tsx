"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, Plus, FileDown, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function TableToolbar({ data, headers, onUpdate }) {
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleAddRow = () => {
    // Create a new empty row with the same number of columns
    const newRow = Array(headers.length).fill("")
    const newData = [...data, newRow]
    onUpdate(newData)
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
    link.setAttribute("download", `real-estate-inventory-${Date.now()}.csv`)
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
    link.setAttribute("download", `real-estate-inventory-${Date.now()}.xlsx`)
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

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={handleAddRow}>
          <Plus className="h-4 w-4 mr-2" />
          Add Row
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
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
