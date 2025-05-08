import { NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

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
      const ai = new GoogleGenAI({ apiKey })

      // Make a simple API call to verify connectivity
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ text: "Test" }],
      })

      const text = result.text || ""

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
