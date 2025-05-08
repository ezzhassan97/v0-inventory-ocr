import { type NextRequest, NextResponse } from "next/server"
import { extractTablesFromImage, extractTablesFromPDF } from "@/lib/ocr"

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.GOOGLE_API_KEY) {
      console.error("GOOGLE_API_KEY environment variable is not set")
      return NextResponse.json(
        {
          error: "Google API key is not configured",
          details: "The GOOGLE_API_KEY environment variable is not set in your deployment",
        },
        { status: 500 },
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log(`Received file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`)

    let result
    try {
      // Process based on file type
      if (file.type === "application/pdf") {
        console.log("Processing PDF file")
        result = await extractTablesFromPDF(file)
      } else if (file.type.startsWith("image/")) {
        console.log("Processing image file")
        result = await extractTablesFromImage(file)
      } else {
        console.error(`Unsupported file type: ${file.type}`)
        return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
      }
    } catch (error) {
      console.error("Error in OCR processing:", error)
      return NextResponse.json(
        {
          error: "Failed to process file",
          details: error.message || "Unknown error in OCR processing",
        },
        { status: 500 },
      )
    }

    console.log("OCR processing completed successfully")
    return NextResponse.json(result)
  } catch (error) {
    console.error("Unhandled error in OCR API route:", error)
    return NextResponse.json(
      {
        error: "Failed to process file",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
