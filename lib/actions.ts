"use server"

import { revalidatePath } from "next/cache"
import { extractTablesFromImage, extractTablesFromPDF } from "@/lib/ocr"

// In-memory storage for extracted tables (in a real app, use a database)
let extractedTables = []
let debugInfo = null
let isExtracting = false
let lastUploadTimestamp = 0

// Add a function to clear the extracted tables
export async function clearExtractedTables() {
  // Completely reset all data
  extractedTables = []
  debugInfo = null
  isExtracting = true
  lastUploadTimestamp = Date.now()

  // Force revalidation of all paths
  revalidatePath("/")
  return { success: true }
}

export async function uploadFile(formData) {
  const currentUploadTimestamp = Date.now()
  lastUploadTimestamp = currentUploadTimestamp

  try {
    const file = formData.get("file")

    if (!file) {
      throw new Error("No file provided")
    }

    // Set extraction flag to true
    isExtracting = true

    // Clear previous data when a new file is uploaded
    extractedTables = []
    debugInfo = null

    // Revalidate path to update UI
    revalidatePath("/")

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

      // Check if this is still the most recent upload
      if (lastUploadTimestamp !== currentUploadTimestamp) {
        console.log("Ignoring results from outdated upload")
        return {
          success: false,
          error: "A newer upload is in progress",
        }
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
    } finally {
      // Only update if this is still the most recent upload
      if (lastUploadTimestamp === currentUploadTimestamp) {
        // Set extraction flag to false
        isExtracting = false
        // Revalidate path to update UI with final state
        revalidatePath("/")
      }
    }

    return {
      success: true,
      tables: extractedTables,
      debug: debugInfo,
      timestamp: currentUploadTimestamp,
    }
  } catch (error) {
    console.error("Error processing file:", error)

    // Only update if this is still the most recent upload
    if (lastUploadTimestamp === currentUploadTimestamp) {
      // Set extraction flag to false
      isExtracting = false
      // Revalidate path to update UI with error state
      revalidatePath("/")
    }

    // Return the error with debug info if available
    return {
      success: false,
      error: error.message || "Unknown error occurred",
      debug: debugInfo,
      timestamp: currentUploadTimestamp,
    }
  }
}

export async function getExtractedTables() {
  // Return the stored tables and extraction status
  return {
    tables: extractedTables,
    debug: debugInfo,
    isExtracting,
    timestamp: lastUploadTimestamp,
  }
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

export async function processFile(formData) {
  try {
    const file = formData.get("file")

    if (!file) {
      throw new Error("No file provided")
    }

    // Process based on file type
    let result
    if (file.type === "application/pdf") {
      result = await extractTablesFromPDF(file)
    } else if (file.type.startsWith("image/")) {
      result = await extractTablesFromImage(file)
    } else {
      throw new Error("Unsupported file type")
    }

    return result
  } catch (error) {
    console.error("Error processing file:", error)
    return {
      success: false,
      error: error.message || "Failed to process file",
      debug: {
        error: error.message || "Unknown error",
        status: "error",
      },
    }
  }
}
