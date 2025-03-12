import './globals.css';
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import NavigationWrapper from "../components/NavigationWrapper";
import { AuthProvider } from "../components/AuthProvider";
import Footer from "../components/Footer";

// Import the initialization module to ensure it runs when the app starts
import '../util/server-only/init';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: 'PantryPal - Manage Your Kitchen Inventory',
  description: 'Track your kitchen inventory, create shopping lists, and never run out of essential ingredients again.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Log that the app is starting
  console.log(`[${new Date().toISOString()}] 🏁 APP: Root layout rendering - app starting...`);
  
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased flex flex-col min-h-screen`}>
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
        
        <Footer />
      </body>
    </html>
  );
}
