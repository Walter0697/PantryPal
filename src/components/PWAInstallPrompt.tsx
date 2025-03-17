'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if on iOS
    const isIOSDevice = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    setIsIOS(isIOSDevice());

    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the default prompt
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    });

    // Listen for the appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      setDeferredPrompt(null);
      setIsInstallable(false);
      toast.success('App successfully installed!');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', (e) => e.preventDefault());
      window.removeEventListener('appinstalled', () => console.log('PWA was installed'));
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
      toast.success('Thanks for installing our app!');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the saved prompt as it can't be used again
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Only show the install button if the app is installable
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-primary-700 text-white p-4 rounded-lg shadow-lg flex flex-col items-center max-w-sm">
      <p className="mb-2 text-center">
        {isIOS
          ? 'Install this app on your iPhone: tap the Share button and then "Add to Home Screen"'
          : 'Install this app on your device for offline use'}
      </p>
      {!isIOS && (
        <button
          onClick={handleInstallClick}
          className="bg-white text-primary-700 px-4 py-2 rounded-md font-medium hover:bg-opacity-90 transition-colors"
        >
          Install App
        </button>
      )}
      <button
        onClick={() => document.getElementById('pwa-install-prompt')?.remove()}
        className="text-sm mt-2 text-white/80 hover:text-white"
      >
        Close
      </button>
    </div>
  );
} 