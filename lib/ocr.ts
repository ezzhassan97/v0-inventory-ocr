"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

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

    // Create prompt for real estate inventory extraction
    const prompt = `
      Analyze this real estate inventory document and extract the property details into a structured format.
      
      Extract these fields for each property:
      - unit_number
      - building_number
      - property_type (Apartment, Villa, etc.)
      - floor_number
      - unit_area
      - bedrooms
      - bathrooms
      - price
      
      Format your response as a clean JSON object with this exact structure:
      {
        "name": "Real Estate Inventory",
        "headers": ["Unit Number", "Building", "Type", "Floor", "Area", "Bedrooms", "Bathrooms", "Price"],
        "data": [
          ["A101", "Building 5", "Apartment", "1", "120 sqm", "2", "2", "1.5M"],
          ["B202", "Building 3", "Villa", "2", "200 sqm", "3", "3", "3.2M"]
        ]
      }
      
      IMPORTANT INSTRUCTIONS:
      1. Return ONLY the JSON object, nothing else
      2. Do not include markdown formatting or code blocks
      3. Use empty strings for missing values
      4. Make sure the headers array matches the data columns
      5. Include all properties found in the document
    `

    // Store request info
    const requestInfo = `Request to Gemini 1.5 Flash:
Model: gemini-1.5-flash
File: ${file.name} (${file.type}, ${file.size} bytes)
Prompt: ${prompt.substring(0, 200)}...`

    // Generate content with the image
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.type,
          data: base64Data,
        },
      },
    ])

    const response = await result.response
    const responseText = response.text()

    // Try to parse the response as JSON
    try {
      // Clean up the response text to ensure it's valid JSON
      let cleanedText = responseText.trim()

      // Remove any markdown code block markers
      cleanedText = cleanedText.replace(/```json\s*/g, "").replace(/```\s*$/g, "")

      // Try to find a JSON object in the text
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/g)
      if (jsonMatch) {
        cleanedText = jsonMatch[0]
      }

      // Parse the JSON
      const parsedData = JSON.parse(cleanedText)

      // Validate the parsed data
      if (
        parsedData &&
        parsedData.headers &&
        Array.isArray(parsedData.headers) &&
        parsedData.data &&
        Array.isArray(parsedData.data)
      ) {
        // Create a properly formatted table object
        return {
          success: true,
          tables: [
            {
              id: `table-${Date.now()}`,
              name: parsedData.name || "Real Estate Inventory",
              headers: parsedData.headers,
              data: parsedData.data,
            },
          ],
          debug: {
            request: requestInfo,
            response: responseText,
            status: "success",
          },
        }
      }
    } catch (error) {
      console.error("Error parsing JSON response:", error)

      // Return the raw text if JSON parsing fails
      return {
        success: true,
        tables: [
          {
            id: `table-${Date.now()}`,
            name: "Extracted Text",
            headers: ["Content"],
            data: [[responseText]],
          },
        ],
        debug: {
          request: requestInfo,
          response: responseText,
          error: error.message,
          status: "partial",
        },
      }
    }
  } catch (error) {
    console.error("Error extracting tables from image:", error)

    return {
      success: false,
      tables: [],
      debug: {
        error: error.message || "Unknown error",
        status: "error",
      },
    }
  }
}

// Function to extract tables from a PDF
export async function extractTablesFromPDF(file) {
  // For simplicity, we'll treat PDFs the same as images
  return extractTablesFromImage(file)
}
