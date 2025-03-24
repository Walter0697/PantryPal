/**
 * This module provides access to the application version.
 * The version is directly embedded during build time.
 */

// Read version from an environment variable that can be set at build time or use package.json version
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.1.5';

/**
 * Returns the current application version
 * @returns string version number (e.g., "3.1.1")
 */
export function getAppVersion(): string {
  return APP_VERSION;
} 