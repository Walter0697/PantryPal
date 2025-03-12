import { getAppVersion } from "../util/version";

export default function Footer() {
  return (
    <footer className="bg-dark-blue-light border-t border-primary-700 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-gray-700 text-sm flex items-center gap-2">
              &copy; {new Date().getFullYear()} PantryPal. All rights reserved.
              <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md font-mono text-xs">v{getAppVersion()}</span>
            </p>
          </div>
          <div className="flex space-x-4">
            <span className="text-gray-700">
              This entire website was crafted by an AI that dreams of electric sheep 🤖
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
} 