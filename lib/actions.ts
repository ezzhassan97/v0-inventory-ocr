"use server"

import { revalidatePath } from "next/cache"
import { extractTablesFromImage, extractTablesFromPDF } from "@/lib/ocr"

// In-memory storage for extracted tables (in a real app, use a database)
let extractedTables = []
let debugInfo = null

export async function uploadFile(formData) {
  try {
    const file = formData.get("file")

    if (!file) {
      throw new Error("No file provided")
    }

    // Clear previous data when a new file is uploaded
    extractedTables = []
    debugInfo = null

    let result

    try {
      // Process based on file type
      if (file.type === "application/pdf") {
        result = await extractTablesFromPDF(file)
      } else if (file.type.startsWith("image/")) {
        result = await extractTablesFromImage(file)
      } else {
        throw new Error("Unsupported file type")
      }

      // Store debug info
      debugInfo = result.debug || null

      // Check if we have tables
      if (!result.tables || result.tables.length === 0) {
        throw new Error("No tables found in the document")
      }

      // Validate table structure
      const validTables = result.tables.filter(
        (table) => table && Array.isArray(table.headers) && Array.isArray(table.data),
      )

      if (validTables.length === 0) {
        throw new Error("Invalid table structure in extraction results")
      }

      // Store the extracted tables
      extractedTables = validTables

      console.log("Stored tables:", JSON.stringify(extractedTables, null, 2))
    } catch (error) {
      console.error("Error in OCR processing:", error)
      throw error
    }

    // Force revalidation to refresh the UI
    revalidatePath("/")

    return {
      success: true,
      tables: extractedTables,
      debug: debugInfo,
    }
  } catch (error) {
    console.error("Error processing file:", error)

    // Return the error with debug info if available
    return {
      success: false,
      error: error.message || "Unknown error occurred",
      debug: debugInfo,
    }
  }
}

export async function getExtractedTables() {
  // Return the stored tables
  return { tables: extractedTables, debug: debugInfo }
}

export async function getDebugInfo() {
  return debugInfo
}

export async function saveTableData(tableId, data) {
  try {
    // Update the table data
    extractedTables = extractedTables.map((table) => (table.id === tableId ? { ...table, data } : table))

    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Error saving table data:", error)
    throw error
  }
}
