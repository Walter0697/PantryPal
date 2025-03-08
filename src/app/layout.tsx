import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import NavigationWrapper from "../components/NavigationWrapper";
import { AuthProvider } from "../components/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PantryPal - Kitchen Stock Management",
  description: "Track and manage your kitchen inventory with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <AuthProvider>
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 5000,
              style: {
                background: '#112240',
                color: '#e6f1ff',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #0066ff',
              },
              success: {
                style: {
                  background: '#112240',
                  borderColor: '#00cc44',
                },
                icon: '🥘',
              },
              error: {
                style: {
                  background: '#112240',
                  borderColor: '#ff4444',
                },
              },
            }}
          />
          
          {/* Navigation component handles conditional rendering */}
          <NavigationWrapper />
          
          {/* Main Content */}
          <main className="flex-grow">
            {children}
          </main>
        </AuthProvider>
        
        {/* Footer */}
        <footer className="bg-dark-blue-light border-t border-primary-700 py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <p className="text-gray-400 text-sm">
                  &copy; {new Date().getFullYear()} PantryPal. All rights reserved.
                </p>
              </div>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-secondary-400 transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-400 hover:text-secondary-400 transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="text-gray-400 hover:text-secondary-400 transition-colors">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
