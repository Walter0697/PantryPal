import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Define the path to the favicon in the public directory
    const faviconPath = path.join(process.cwd(), "public", "favicon.ico");
    
    // Check if the favicon exists
    if (!fs.existsSync(faviconPath)) {
      return new NextResponse("Favicon not found", { status: 404 });
    }
    
    // Read the favicon file
    const faviconBuffer = fs.readFileSync(faviconPath);
    
    // Return the favicon with proper content type
    return new NextResponse(faviconBuffer, {
      headers: {
        "Content-Type": "image/x-icon",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error serving favicon:", error);
    return new NextResponse("Error serving favicon", { status: 500 });
  }
} 