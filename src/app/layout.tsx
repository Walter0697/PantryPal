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
  viewportFit: 'cover',
};

export const metadata = {
  title: 'PantryPal',
  description: 'Manage your kitchen inventory and shopping lists',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PantryPal',
    startupImage: [
      {
        url: '/icons/icon-192x192.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/icons/icon-512x512.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    other: [
      {
        rel: 'apple-touch-icon',
        url: '/icons/icon-192x192.png',
      },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'PantryPal',
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PantryPal" />
        <meta name="theme-color" content="#0066ff" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
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
