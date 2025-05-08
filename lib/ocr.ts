"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Google AI with retry logic
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

// Helper function to retry API calls
async function retryFetch(fn, maxRetries = 3, delay = 1000) {
  let lastError

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error)
      lastError = error

      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay))
        // Increase delay for next attempt (exponential backoff)
        delay *= 2
      }
    }
  }

  throw lastError
}

export async function extractTablesFromImage(file) {
  try {
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString("base64")

    // Log file info for debugging
    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`)

    // Get Gemini model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    })

    // Create prompt for real estate inventory extraction with text-based output
    const prompt = `You are an expert at accurately extracting tables from PDFs or images without missing any details. Analyze the provided real estate inventory document (PDF or image) and carefully extract ALL tables exactly as presented, preserving all table titles (or names, if available), fields, headers, and rows precisely as they appear in the original document.

If the document contains multiple tables, extract each separately and clearly.

IMPORTANT: Instead of JSON, respond with a simple text format as follows:

TABLE: [Table Name 1]
HEADERS: Header1 | Header2 | Header3 | ... | HeaderN
ROW: Value1 | Value2 | Value3 | ... | ValueN
ROW: Value1 | Value2 | Value3 | ... | ValueN
... (more rows)

TABLE: [Table Name 2]
HEADERS: Header1 | Header2 | Header3 | ... | HeaderN
ROW: Value1 | Value2 | Value3 | ... | ValueN
ROW: Value1 | Value2 | Value3 | ... | ValueN
... (more rows)

CRITICAL INSTRUCTIONS TO FOLLOW STRICTLY:
1. Include EVERY table found in the original document separately.
2. If a table has no explicit name, use "Unnamed Table 1", "Unnamed Table 2", etc., in sequence.
3. Do NOT omit any columns or rows—every header and cell data from each table must be included exactly.
4. Use an empty value (||) for any missing or unclear data.
5. Maintain the exact header titles and exact column order from each original table.
6. Ensure the extracted data precisely matches the original content without additions, interpretations, or assumptions.
7. Use the pipe character (|) as a delimiter between values.
8. Start each table with "TABLE:" followed by the table name.
9. Start the headers row with "HEADERS:" followed by the headers separated by pipes.
10. Start each data row with "ROW:" followed by the values separated by pipes.
11. Make sure to extract ALL tables from the document, even if there are many of them.`

    // Store request info
    const requestInfo = `Request to Gemini 1.5 Flash:
Model: gemini-1.5-flash
File: ${file.name} (${file.type}, ${file.size} bytes)
Prompt: ${prompt.substring(0, 200)}...`

    // Generate content with the image using retry logic
    const result = await retryFetch(
      async () => {
        return await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
        ])
      },
      3,
      2000,
    )

    const response = await result.response
    const responseText = response.text()

    console.log("Raw response from Gemini (first 500 chars):", responseText.substring(0, 500) + "...")

    // Extract tables from the text-based format
    const tables = extractTablesFromTextFormat(responseText)

    if (tables.length > 0) {
      return {
        success: true,
        tables: tables,
        debug: {
          request: requestInfo,
          response: responseText,
          status: "success",
        },
      }
    }

    // Fallback: Try to extract tables from any text format
    const fallbackTables = extractTablesFromAnyText(responseText)

    if (fallbackTables.length > 0) {
      return {
        success: true,
        tables: fallbackTables,
        debug: {
          request: requestInfo,
          response: responseText,
          status: "partial",
          error: "Used fallback extraction method",
        },
      }
    }

    // Last resort: Return the raw text
    return {
      success: true,
      tables: [
        {
          id: `table-${Date.now()}`,
          name: "Extracted Text",
          headers: ["Content"],
          data: [[responseText.substring(0, 1000) + (responseText.length > 1000 ? "..." : "")]],
        },
      ],
      debug: {
        request: requestInfo,
        response: responseText,
        error: "Failed to extract structured data",
        status: "fallback",
      },
    }
  } catch (error) {
    console.error("Error extracting tables from image:", error)

    // Check for specific API connectivity errors
    const errorMessage = error.message || "Unknown error"
    const isConnectivityError =
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("network") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("timeout")

    return {
      success: false,
      tables: [],
      debug: {
        error: errorMessage,
        status: "error",
        isConnectivityError: isConnectivityError,
        suggestion: isConnectivityError
          ? "There seems to be an issue connecting to the Google API. Please check your internet connection and try again later."
          : "An error occurred during extraction. Please try again with a different file.",
      },
    }
  }
}

// Function to extract tables from the text-based format
function extractTablesFromTextFormat(text) {
  const tables = []
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  let currentTable = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for table start
    if (line.startsWith("TABLE:")) {
      // Save previous table if it exists
      if (currentTable && currentTable.headers.length > 0) {
        tables.push(currentTable)
      }

      // Start new table
      const tableName = line.substring("TABLE:".length).trim()
      currentTable = {
        id: `table-${Date.now()}-${tables.length}`,
        name: tableName || `Unnamed Table ${tables.length + 1}`,
        headers: [],
        data: [],
      }
      continue
    }

    // Check for headers
    if (currentTable && line.startsWith("HEADERS:")) {
      const headerLine = line.substring("HEADERS:".length).trim()
      currentTable.headers = headerLine.split("|").map((h) => h.trim())
      continue
    }

    // Check for data rows
    if (currentTable && line.startsWith("ROW:")) {
      const rowLine = line.substring("ROW:".length).trim()
      const rowData = rowLine.split("|").map((cell) => cell.trim())

      // Ensure row has the same number of columns as headers
      if (currentTable.headers.length > 0) {
        // If row has fewer columns than headers, pad with empty strings
        if (rowData.length < currentTable.headers.length) {
          rowData.push(...Array(currentTable.headers.length - rowData.length).fill(""))
        }
        // If row has more columns than headers, truncate
        else if (rowData.length > currentTable.headers.length) {
          rowData.length = currentTable.headers.length
        }
      }

      currentTable.data.push(rowData)
    }
  }

  // Add the last table if it exists
  if (currentTable && currentTable.headers.length > 0) {
    tables.push(currentTable)
  }

  return tables
}

// Function to extract tables from any text format
function extractTablesFromAnyText(text) {
  const tables = []

  // Try to find table-like structures in the text
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  let tableStart = -1
  let tableEnd = -1
  let tableName = null
  let inTable = false
  let tableCount = 0

  // First pass: identify potential tables
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Look for table name indicators
    if (
      line.match(/table|inventory|properties|listings/i) &&
      !line.includes(":") &&
      !line.includes(",") &&
      !line.includes("[") &&
      !inTable
    ) {
      // If we were in a table, save it
      if (tableStart !== -1 && tableEnd !== -1) {
        const extractedTable = extractTableFromLines(lines.slice(tableStart, tableEnd + 1), tableName)
        if (extractedTable) {
          tables.push(extractedTable)
        }
      }

      // Start new table
      tableStart = i
      tableName = line
      inTable = true
      tableCount++
      continue
    }

    // Look for end of table indicators
    if (
      inTable &&
      (i === lines.length - 1 ||
        (lines[i + 1] &&
          lines[i + 1].match(/table|inventory|properties|listings/i) &&
          !lines[i + 1].includes(":") &&
          !lines[i + 1].includes(",") &&
          !lines[i + 1].includes("[")))
    ) {
      tableEnd = i
      inTable = false

      // Extract the table
      const extractedTable = extractTableFromLines(lines.slice(tableStart, tableEnd + 1), tableName)
      if (extractedTable) {
        tables.push(extractedTable)
      }

      continue
    }
  }

  // If we were still in a table at the end, save it
  if (inTable && tableStart !== -1) {
    const extractedTable = extractTableFromLines(lines.slice(tableStart), tableName)
    if (extractedTable) {
      tables.push(extractedTable)
    }
  }

  // If no tables were found, try to extract from the whole text
  if (tables.length === 0) {
    const extractedTable = extractTableFromLines(lines, "Extracted Table")
    if (extractedTable) {
      tables.push(extractedTable)
    }
  }

  return tables
}

// Helper function to extract a table from a set of lines
function extractTableFromLines(lines, tableName) {
  // Skip empty lines at the beginning
  let startIndex = 0
  while (startIndex < lines.length && lines[startIndex].trim() === "") {
    startIndex++
  }

  if (startIndex >= lines.length) {
    return null
  }

  // Look for potential headers
  let headerIndex = -1
  for (let i = startIndex; i < Math.min(startIndex + 10, lines.length); i++) {
    const line = lines[i]
    if (
      (line.includes(",") || line.includes("\t") || line.includes("|")) &&
      !line.includes("{") &&
      !line.includes("}") &&
      !line.includes("[") &&
      !line.includes("]")
    ) {
      headerIndex = i
      break
    }
  }

  if (headerIndex === -1) {
    return null
  }

  // Determine the delimiter
  const headerLine = lines[headerIndex]
  let delimiter = ","
  if (headerLine.includes("|")) {
    delimiter = "|"
  } else if (headerLine.includes("\t")) {
    delimiter = "\t"
  }

  // Extract headers
  const headers = headerLine.split(delimiter).map((h) => h.trim())

  // Extract data rows
  const data = []
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines or lines that look like table names
    if (
      line === "" ||
      (line.match(/table|inventory|properties|listings/i) &&
        !line.includes(":") &&
        !line.includes(",") &&
        !line.includes("["))
    ) {
      continue
    }

    // Skip lines that don't have the delimiter
    if (!line.includes(delimiter)) {
      continue
    }

    const rowData = line.split(delimiter).map((cell) => cell.trim())

    // Ensure row has the same number of columns as headers
    if (headers.length > 0) {
      // If row has fewer columns than headers, pad with empty strings
      if (rowData.length < headers.length) {
        rowData.push(...Array(headers.length - rowData.length).fill(""))
      }
      // If row has more columns than headers, truncate
      else if (rowData.length > headers.length) {
        rowData.length = headers.length
      }
    }

    data.push(rowData)
  }

  // Only return if we have headers and data
  if (headers.length > 0 && data.length > 0) {
    return {
      id: `table-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: tableName || "Extracted Table",
      headers,
      data,
    }
  }

  return null
}

// Function to extract tables from a PDF
export async function extractTablesFromPDF(file) {
  // For simplicity, we'll treat PDFs the same as images
  return extractTablesFromImage(file)
}
