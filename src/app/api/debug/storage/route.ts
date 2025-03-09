import { NextResponse } from 'next/server';
import { migrateToNewStorageFormat } from '@/util/server-only/storageStorage';

/**
 * API route to migrate storage data from the old format to the new format
 * Call with: GET /api/debug/storage
 */
export async function GET() {
  console.log(`[${new Date().toISOString()}] 🔍 DEBUG: Storage migration route called`);
  
  try {
    // Run the migration
    await migrateToNewStorageFormat();
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Storage data migration completed successfully'
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ DEBUG: Storage migration error:`, error);
    
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    }, { status: 500 });
  }
} 