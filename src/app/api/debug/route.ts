import { NextResponse } from 'next/server';
import { runAllInitializations } from '@/util/server-only/init';
import { getHomeLayout } from '@/util/server-only/initHomeLayout';

// This is a debug route to check the database connection and initialization
// You can call it with: GET /api/debug
export async function GET() {
  console.log(`[${new Date().toISOString()}] 🔍 DEBUG: Debug route called, checking initialization...`);
  
  try {
    // Ensure initialization has run
    await runAllInitializations();
    
    // Check if the home layout exists
    const homeLayout = await getHomeLayout('default');
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Debug route called successfully',
      homeLayoutExists: !!homeLayout,
      homeLayoutWidgets: homeLayout ? homeLayout.layout.length : 0,
      initialized: true
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ DEBUG: Debug route error:`, error);
    
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      initialized: false
    }, { status: 500 });
  }
} 