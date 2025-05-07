import { FileUpload } from "@/components/file-upload"
import { TableOfContents } from "@/components/table-of-contents"

export default function Home() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Real Estate Inventory OCR</h1>
        <p className="text-muted-foreground">
          Extract property inventory data from PDFs or images using Google Gemini AI
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <FileUpload />
          <TableOfContents />
        </div>
        <div className="border rounded-lg p-4 h-fit">
          <h2 className="font-semibold mb-2">How it works</h2>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Upload a PDF or image containing real estate inventory data</li>
            <li>Google Gemini 1.5 Flash extracts property details using OCR</li>
            <li>Edit cells, add or remove rows as needed</li>
            <li>Export the final data as CSV, Excel, or JSON</li>
          </ol>

          <div className="mt-4 pt-4 border-t">
            <h3 className="font-semibold mb-2 text-sm">Extracted Fields</h3>
            <div className="grid grid-cols-2 gap-1">
              <div className="text-xs text-muted-foreground">• Unit Number</div>
              <div className="text-xs text-muted-foreground">• Building Number</div>
              <div className="text-xs text-muted-foreground">• Property Type</div>
              <div className="text-xs text-muted-foreground">• Floor Number</div>
              <div className="text-xs text-muted-foreground">• Unit Area</div>
              <div className="text-xs text-muted-foreground">• Bedrooms</div>
              <div className="text-xs text-muted-foreground">• Bathrooms</div>
              <div className="text-xs text-muted-foreground">• Price</div>
              <div className="text-xs text-muted-foreground">• And more...</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <h3 className="font-semibold mb-2 text-sm">Tips</h3>
            <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
              <li>For best results, use clear images with good lighting</li>
              <li>Tables should have clear borders or spacing</li>
              <li>Maximum file size: 10MB</li>
              <li>Gemini works best with well-structured property listings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
