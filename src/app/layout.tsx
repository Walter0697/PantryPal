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
  maximumScale: 5,
  themeColor: '#0066ff',
  viewportFit: 'cover',
};

export const metadata = {
  title: 'PantryPal',
  description: 'Manage your kitchen inventory and shopping lists',
  applicationName: 'PantryPal',
  appleWebApp: {
    capable: true,
    title: 'PantryPal',
    statusBarStyle: 'default'
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
      { url: '/apple-icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'manifest',
        url: '/manifest.json',
      },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'PantryPal',
    'format-detection': 'telephone=no',
    'msapplication-TileColor': '#0066ff',
    'msapplication-tap-highlight': 'no',
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
        {/* Standard favicon - Next.js will automatically include most of these from metadata */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Apple-specific tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="PantryPal" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
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
