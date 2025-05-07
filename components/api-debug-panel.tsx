"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, AlertCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ApiDebugPanel({ apiRequest, apiResponse, error, status = "loading" }) {
  const [expanded, setExpanded] = useState(false)

  const getStatusColor = () => {
    switch (status) {
      case "error":
        return "text-red-500"
      case "success":
        return "text-green-500"
      default:
        return "text-blue-500"
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "error":
        return <AlertCircle className={`h-5 w-5 ${getStatusColor()}`} />
      case "success":
        return <Info className={`h-5 w-5 ${getStatusColor()}`} />
      default:
        return <Info className={`h-5 w-5 ${getStatusColor()}`} />
    }
  }

  if (!apiRequest && !apiResponse && !error) {
    return null
  }

  return (
    <Card className="mt-4">
      <CardHeader className="py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {getStatusIcon()}
            <CardTitle className="text-sm ml-2">API Debug Information</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="h-8 w-8 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <Tabs defaultValue="response">
            <TabsList className="mb-2">
              <TabsTrigger value="response">Response</TabsTrigger>
              <TabsTrigger value="request">Request</TabsTrigger>
              {error && <TabsTrigger value="error">Error</TabsTrigger>}
            </TabsList>
            <TabsContent value="response" className="mt-0">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-[300px]">
                <pre className="text-xs whitespace-pre-wrap">{apiResponse || "No response data available"}</pre>
              </div>
            </TabsContent>
            <TabsContent value="request" className="mt-0">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-[300px]">
                <pre className="text-xs whitespace-pre-wrap">{apiRequest || "No request data available"}</pre>
              </div>
            </TabsContent>
            {error && (
              <TabsContent value="error" className="mt-0">
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md overflow-auto max-h-[300px]">
                  <pre className="text-xs whitespace-pre-wrap text-red-600 dark:text-red-400">{error}</pre>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      )}
    </Card>
  )
}
