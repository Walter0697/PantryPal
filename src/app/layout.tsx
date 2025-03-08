import './globals.css';
import { Inter } from 'next/font/google';

// Import the initialization module to ensure it runs when the app starts
import '../util/server-only/init';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
