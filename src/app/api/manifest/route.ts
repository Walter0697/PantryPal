import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Define the path to the manifest in the public directory
    const manifestPath = path.join(process.cwd(), "public", "manifest.json");
    
    // Check if the manifest exists
    if (!fs.existsSync(manifestPath)) {
      return new NextResponse("Manifest not found", { status: 404 });
    }
    
    // Read the manifest file
    const manifestContent = fs.readFileSync(manifestPath, "utf-8");
    
    // Return the manifest with proper content type
    return new NextResponse(manifestContent, {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error serving manifest:", error);
    return new NextResponse("Error serving manifest", { status: 500 });
  }
} 