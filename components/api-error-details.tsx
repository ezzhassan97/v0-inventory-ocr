"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ApiErrorDetailsProps {
  error: string
  apiResponse?: string
}

export function ApiErrorDetails({ error, apiResponse }: ApiErrorDetailsProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <Alert variant="destructive" className="mt-4">
      <AlertTitle>API Error</AlertTitle>
      <AlertDescription>
        <p className="mb-2">{error}</p>

        {apiResponse && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center text-xs"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide API Response
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show API Response
                </>
              )}
            </Button>

            {showDetails && (
              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-40">
                <pre>{apiResponse}</pre>
              </div>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
