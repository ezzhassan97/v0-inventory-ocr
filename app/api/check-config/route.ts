import { NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function GET() {
  console.log("Config check API route called")

  try {
    // Check if the Google API key is configured
    const apiKey = process.env.GOOGLE_API_KEY

    if (!apiKey) {
      console.log("API key is not configured")
      return NextResponse.json({
        configured: false,
        message: "API key is not configured",
        details: "The GOOGLE_API_KEY environment variable is not set",
      })
    }

    // Try to initialize the Google AI client to verify the API key
    try {
      console.log("Testing API key validity")
      const genAI = new GoogleGenerativeAI(apiKey)

      // Try to get a model to verify the API key works
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

      // Make a simple API call to verify connectivity
      const result = await model.generateContent("Test")
      const text = result.response.text()

      console.log("API key is valid and working")
      return NextResponse.json({
        configured: true,
        message: "API key is configured and working",
        valid: true,
      })
    } catch (error) {
      console.error("API key validation failed:", error)
      return NextResponse.json({
        configured: true,
        message: "API key is configured but may not be valid",
        valid: false,
        error: error.message || "Unknown error validating API key",
      })
    }
  } catch (error) {
    console.error("Error checking API configuration:", error)
    return NextResponse.json(
      {
        configured: false,
        message: "Error checking API configuration",
        error: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
