import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if the Google API key is configured
    const apiKey = process.env.GOOGLE_API_KEY

    return NextResponse.json({
      configured: !!apiKey,
      message: apiKey ? "API key is configured" : "API key is not configured",
    })
  } catch (error) {
    console.error("Error checking API configuration:", error)
    return NextResponse.json(
      {
        configured: false,
        message: "Error checking API configuration",
      },
      { status: 500 },
    )
  }
}
