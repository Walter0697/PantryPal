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

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0066ff',
};

export const metadata = {
  title: 'PantryPal',
  description: 'Manage your kitchen inventory and shopping lists',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PantryPal',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon-57x57.png', sizes: '57x57', type: 'image/png' },
      { url: '/apple-icon-60x60.png', sizes: '60x60', type: 'image/png' },
      { url: '/apple-icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/apple-icon-76x76.png', sizes: '76x76', type: 'image/png' },
      { url: '/apple-icon-114x114.png', sizes: '114x114', type: 'image/png' },
      { url: '/apple-icon-120x120.png', sizes: '120x120', type: 'image/png' },
      { url: '/apple-icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/apple-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/apple-icon-180x180.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    other: [
      { rel: 'manifest', url: '/manifest.json' },
      { rel: 'msapplication-config', url: '/browserconfig.xml' },
    ],
  },
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
