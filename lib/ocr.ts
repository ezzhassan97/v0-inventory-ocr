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

    // Create prompt for real estate inventory extraction with simplified JSON structure
    const prompt = `You are an expert at accurately extracting tables from PDFs or images without missing any details. Analyze the provided real estate inventory document (PDF or image) and carefully extract ALL tables exactly as presented, preserving all table titles (or names, if available), fields, headers, and rows precisely as they appear in the original document.

If the document contains multiple tables, extract each separately and clearly.

Your response must be exclusively a JSON object with this exact structure:

{
  "tables": [
    {
      "name": "Table Name 1",
      "headers": ["Header 1", "Header 2", "...", "Header N"],
      "data": [
        ["Row1-Col1", "Row1-Col2", "...", "Row1-ColN"],
        ["Row2-Col1", "Row2-Col2", "...", "Row2-ColN"],
        ["...", "...", "...", "..."],
        ["RowN-Col1", "RowN-Col2", "...", "RowN-ColN"]
      ]
    },
    {
      "name": "Table Name 2",
      "headers": ["Header 1", "Header 2", "...", "Header N"],
      "data": [
        ["Row1-Col1", "Row1-Col2", "...", "Row1-ColN"],
        ["Row2-Col1", "Row2-Col2", "...", "Row2-ColN"],
        ["...", "...", "...", "..."],
        ["RowN-Col1", "RowN-Col2", "...", "RowN-ColN"]
      ]
    }
  ]
}

CRITICAL INSTRUCTIONS TO FOLLOW STRICTLY:
1. Include EVERY table found in the original document separately in the "tables" array.
2. If a table has no explicit name, use "Unnamed Table 1", "Unnamed Table 2", etc., in sequence.
3. Do NOT omit any columns or rows—every header and cell data from each table must be included exactly.
4. Use an empty string ("") for any missing or unclear data.
5. Maintain the exact header titles and exact column order from each original table.
6. Ensure the extracted data precisely matches the original content without additions, interpretations, or assumptions.
7. Provide ONLY the JSON response without additional text, commentary, markdown, or explanations.
8. Ensure your JSON is valid and properly formatted with double quotes for all keys and string values.
9. Do not use special characters or escape sequences that would break JSON parsing.
10. Make sure to extract ALL tables from the document, even if there are many of them.`

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

    // First, try to extract a valid JSON object from the response
    let extractedData = null

    // Function to attempt JSON extraction with different methods
    const attemptJsonExtraction = () => {
      // Method 1: Direct JSON parsing after cleaning
      try {
        // Clean up the response text
        let cleanedText = responseText.trim()

        // Remove any markdown code block markers
        cleanedText = cleanedText.replace(/```json\s*/g, "").replace(/```\s*$/g, "")

        // Try to find a JSON object in the text
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/g)
        if (jsonMatch) {
          cleanedText = jsonMatch[0]
        }

        console.log("Method 1 - Cleaned JSON (first 100 chars):", cleanedText.substring(0, 100) + "...")

        // Remove control characters that can break JSON parsing
        cleanedText = cleanedText.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")

        const parsed = JSON.parse(cleanedText)
        if (parsed && parsed.tables && Array.isArray(parsed.tables)) {
          return parsed
        }
      } catch (error) {
        console.error("Method 1 failed:", error.message)
      }

      // Method 2: Try to extract just the tables array
      try {
        const tablesRegex = /"tables"\s*:\s*(\[[\s\S]*?\])/g
        const tablesMatch = tablesRegex.exec(responseText)

        if (tablesMatch && tablesMatch[1]) {
          let tablesJson = tablesMatch[1]
          console.log("Method 2 - Tables JSON (first 100 chars):", tablesJson.substring(0, 100) + "...")

          // Remove control characters that can break JSON parsing
          tablesJson = tablesJson.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")

          const tables = JSON.parse(tablesJson)
          if (Array.isArray(tables)) {
            return { tables }
          }
        }
      } catch (error) {
        console.error("Method 2 failed:", error.message)
      }

      // Method 3: Try to extract individual tables
      try {
        // More flexible regex to match table objects
        const tableRegex =
          /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"headers"\s*:\s*(\[[^\]]+\])\s*,\s*"data"\s*:\s*(\[[\s\S]*?\])\s*\}/g
        const tables = []
        let match

        while ((match = tableRegex.exec(responseText)) !== null) {
          try {
            const name = match[1]
            let headersJson = match[2]
            let dataJson = match[3]

            // Remove control characters that can break JSON parsing
            headersJson = headersJson.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
            dataJson = dataJson.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")

            const headers = JSON.parse(headersJson)
            const data = JSON.parse(dataJson)

            if (Array.isArray(headers) && Array.isArray(data)) {
              tables.push({ name, headers, data })
            }
          } catch (e) {
            console.error("Failed to parse individual table:", e)
          }
        }

        if (tables.length > 0) {
          return { tables }
        }
      } catch (error) {
        console.error("Method 3 failed:", error.message)
      }

      // Method 4: Try to extract arrays that might be headers and data
      try {
        const arrayRegex = /\[((?:"[^"]*"(?:,\s*)?)+)\]/g
        const arrays = []
        let match

        while ((match = arrayRegex.exec(responseText)) !== null) {
          try {
            let arrayText = `[${match[1]}]`
            // Remove control characters that can break JSON parsing
            arrayText = arrayText.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
            const array = JSON.parse(arrayText)
            if (Array.isArray(array) && array.length > 0) {
              arrays.push(array)
            }
          } catch (e) {
            // Skip arrays that can't be parsed
          }
        }

        if (arrays.length >= 2) {
          // Assume first array is headers, rest are data rows
          const headers = arrays[0]
          const data = arrays.slice(1)

          return {
            tables: [
              {
                name: "Extracted Table",
                headers,
                data,
              },
            ],
          }
        }
      } catch (error) {
        console.error("Method 4 failed:", error.message)
      }

      // Method 5: Manual table extraction from text
      try {
        const tables = extractTablesManually(responseText)
        if (tables && tables.length > 0) {
          return { tables }
        }
      } catch (error) {
        console.error("Method 5 failed:", error.message)
      }

      // If all methods fail, return null
      return null
    }

    // Function to manually extract tables from text
    function extractTablesManually(text) {
      const tables = []

      // Split the text into lines and remove empty lines
      const lines = text.split("\n").filter((line) => line.trim().length > 0)

      // Look for patterns that might indicate table structures
      let currentTableName = null
      let currentHeaders = []
      let currentData = []
      let tableCount = 0
      let inTable = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        // Skip markdown or JSON syntax lines
        if (line.startsWith("```") || line === "{" || line === "}" || line.includes('"tables":')) {
          continue
        }

        // Look for potential table names
        if (line.match(/table|inventory|properties|listings/i) && !line.includes(":") && !line.includes(",")) {
          // If we were already processing a table, save it
          if (inTable && currentHeaders.length > 0) {
            tables.push({
              name: currentTableName || `Unnamed Table ${tableCount}`,
              headers: currentHeaders,
              data: currentData,
            })

            // Reset for new table
            currentHeaders = []
            currentData = []
          }

          tableCount++
          currentTableName = line
          inTable = true
          continue
        }

        // If we're in a table and find a line with multiple values separated by commas or tabs
        if (inTable && (line.includes(",") || line.includes("\t"))) {
          const values = line.includes(",")
            ? line.split(",").map((v) => v.trim())
            : line.split("\t").map((v) => v.trim())

          // If headers are empty, this is likely the header row
          if (currentHeaders.length === 0) {
            currentHeaders = values
          } else {
            // Otherwise it's a data row
            currentData.push(values)
          }
        }
      }

      // Add the last table if it exists
      if (inTable && currentHeaders.length > 0) {
        tables.push({
          name: currentTableName || `Unnamed Table ${tableCount}`,
          headers: currentHeaders,
          data: currentData,
        })
      }

      return tables
    }

    // Try to extract JSON data
    extractedData = attemptJsonExtraction()

    // If we successfully extracted data
    if (
      extractedData &&
      extractedData.tables &&
      Array.isArray(extractedData.tables) &&
      extractedData.tables.length > 0
    ) {
      // Process each table
      const processedTables = extractedData.tables
        .map((table, index) => {
          if (table && Array.isArray(table.headers) && Array.isArray(table.data)) {
            // Ensure all data rows have the same number of columns as headers
            const normalizedData = table.data.map((row) => {
              // If row is not an array, create an empty array
              if (!Array.isArray(row)) {
                return Array(table.headers.length).fill("")
              }

              // If row has fewer columns than headers, pad with empty strings
              if (row.length < table.headers.length) {
                return [...row, ...Array(table.headers.length - row.length).fill("")]
              }

              // If row has more columns than headers, truncate
              if (row.length > table.headers.length) {
                return row.slice(0, table.headers.length)
              }

              return row
            })

            return {
              id: `table-${Date.now()}-${index}`,
              name: table.name || `Unnamed Table ${index + 1}`,
              headers: table.headers,
              data: normalizedData,
            }
          }
          return null
        })
        .filter((table) => table !== null)

      if (processedTables.length > 0) {
        return {
          success: true,
          tables: processedTables,
          debug: {
            request: requestInfo,
            response: responseText,
            status: "success",
          },
        }
      }
    }

    // If we couldn't extract structured data, try to create a simple table from the text
    console.log("Falling back to simple text extraction")

    // Try to identify potential table content in the text
    const lines = responseText.split("\n").filter((line) => line.trim().length > 0)

    // Look for lines that might be headers (containing multiple words separated by commas or tabs)
    const potentialHeaderLines = lines.filter(
      (line) =>
        (line.includes(",") || line.includes("\t")) &&
        !line.includes("{") &&
        !line.includes("}") &&
        !line.includes("```"),
    )

    if (potentialHeaderLines.length > 0) {
      // Try to extract a simple table structure
      try {
        // Use the first potential header line
        const headerLine = potentialHeaderLines[0]

        // Split by common delimiters
        let headers
        if (headerLine.includes(",")) {
          headers = headerLine.split(",").map((h) => h.trim())
        } else if (headerLine.includes("\t")) {
          headers = headerLine.split("\t").map((h) => h.trim())
        } else {
          headers = [headerLine]
        }

        // Find the index of this line in the original text
        const headerIndex = lines.indexOf(headerLine)

        // Get subsequent lines that might be data rows
        const dataLines = lines
          .slice(headerIndex + 1)
          .filter((line) => !line.includes("{") && !line.includes("}") && !line.includes("```"))
          .slice(0, 20) // Limit to 20 rows to avoid processing too much

        // Convert data lines to rows
        const data = dataLines.map((line) => {
          if (line.includes(",")) {
            return line.split(",").map((cell) => cell.trim())
          } else if (line.includes("\t")) {
            return line.split("\t").map((cell) => cell.trim())
          } else {
            return [line]
          }
        })

        return {
          success: true,
          tables: [
            {
              id: `table-${Date.now()}`,
              name: "Extracted Table",
              headers,
              data,
            },
          ],
          debug: {
            request: requestInfo,
            response: responseText,
            error: "Used text-based extraction as fallback",
            status: "partial",
          },
        }
      } catch (error) {
        console.error("Text-based extraction failed:", error)
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

// Function to extract tables from a PDF
export async function extractTablesFromPDF(file) {
  // For simplicity, we'll treat PDFs the same as images
  return extractTablesFromImage(file)
}
