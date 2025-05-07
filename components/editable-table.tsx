"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function EditableTable({ data, headers, onUpdate }) {
  const [tableData, setTableData] = useState([])
  const [editCell, setEditCell] = useState(null)
  const [editValue, setEditValue] = useState("")
  const [error, setError] = useState(null)

  useEffect(() => {
    try {
      // Validate data format
      if (!Array.isArray(data)) {
        console.error("Table data is not an array:", data)
        setError("Invalid table data format")
        setTableData([])
        return
      }

      // Ensure all rows are arrays
      const validData = data.map((row) => {
        if (Array.isArray(row)) return row
        console.warn("Row is not an array:", row)
        return headers.map(() => "")
      })

      setTableData(validData)
      setError(null)
    } catch (err) {
      console.error("Error setting table data:", err)
      setError("Failed to process table data")
      setTableData([])
    }
  }, [data, headers])

  const handleCellClick = (row, col) => {
    if (row < tableData.length && col < tableData[row].length) {
      setEditCell({ row, col })
      setEditValue(tableData[row][col] || "")
    }
  }

  const handleCellChange = (e) => {
    setEditValue(e.target.value)
  }

  const handleCellBlur = () => {
    if (editCell) {
      const { row, col } = editCell
      if (row < tableData.length && col < tableData[row].length) {
        const newData = [...tableData]
        newData[row][col] = editValue
        setTableData(newData)
        onUpdate(newData)
      }
      setEditCell(null)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleCellBlur()
    } else if (e.key === "Escape") {
      setEditCell(null)
    }
  }

  const handleDeleteRow = (rowIndex) => {
    const newData = tableData.filter((_, index) => index !== rowIndex)
    setTableData(newData)
    onUpdate(newData)
  }

  // If there's an error, show it
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  // If no data or headers, show a message
  if (!tableData || tableData.length === 0 || !headers || headers.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No data available. The extraction may not have found any structured data.
      </div>
    )
  }

  return (
    <div className="relative overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header, index) => (
              <TableHead key={index} className="whitespace-nowrap">
                {header}
              </TableHead>
            ))}
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {headers.map((_, colIndex) => (
                <TableCell
                  key={colIndex}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  className="cursor-pointer"
                >
                  {editCell?.row === rowIndex && editCell?.col === colIndex ? (
                    <Input
                      value={editValue}
                      onChange={handleCellChange}
                      onBlur={handleCellBlur}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      className="p-0 h-auto min-h-[24px] border-none focus-visible:ring-1"
                    />
                  ) : (
                    row[colIndex] || ""
                  )}
                </TableCell>
              ))}
              <TableCell className="w-[50px] p-2">
                <Button variant="ghost" size="icon" onClick={() => handleDeleteRow(rowIndex)} className="h-7 w-7">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
