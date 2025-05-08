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

    let tables

    // Process based on file type
    if (file.type === "application/pdf") {
      tables = await extractTablesFromPDF(file)
    } else if (file.type.startsWith("image/")) {
      tables = await extractTablesFromImage(file)
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    return NextResponse.json({ tables })
  } catch (error) {
    console.error("Error processing file:", error)
    return NextResponse.json(
      {
        error: "Failed to process file",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
