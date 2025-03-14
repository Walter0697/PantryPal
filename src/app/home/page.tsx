'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { FaPencilAlt, FaSave, FaTimesCircle, FaList, FaLayerGroup } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import { Layout } from 'react-grid-layout';
import { useAuth } from '../../components/AuthProvider';
import { getLayouts, saveLayouts, LayoutConfig } from '../../util/storage';
import { GridLayoutRef } from '../../components/GridLayout';
import toast from 'react-hot-toast';

// Validate token on page load
function validateStoredToken() {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('jwtToken');
    
    if (token) {
      try {
        // Simple validation - check if token is in correct JWT format
        const parts = token.split('.');
        if (parts.length !== 3) {
          console.error('Invalid token format detected, clearing token');
          localStorage.removeItem('jwtToken');
          return false;
        }
        
        // Parse and check expiration
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          console.error('Expired token detected, clearing token');
          localStorage.removeItem('jwtToken');
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('Error validating token, clearing token', error);
        localStorage.removeItem('jwtToken');
        return false;
      }
    }
  }
  return false;
}

// Dynamically import the GridLayout component to avoid SSR issues
const GridLayoutComponent = dynamic(() => import('../../components/GridLayout'), {
  ssr: false,
});

export default function HomePage() {
  const router = useRouter();
  const { logout, isLoggedIn } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLayouts, setCurrentLayouts] = useState<LayoutConfig>({});
  const [temporaryLayouts, setTemporaryLayouts] = useState<LayoutConfig>({});
  const [titleAnimated, setTitleAnimated] = useState(false);
  
  // Reference to the GridLayout component with proper typing
  const gridLayoutRef = useRef<GridLayoutRef>(null);

  // Trigger title animation on component mount
  useEffect(() => {
    // Small delay to ensure DOM is fully loaded
    const animationTimer = setTimeout(() => {
      setTitleAnimated(true);
    }, 100);
    
    return () => clearTimeout(animationTimer);
  }, []);

  // Validate token on component mount
  useEffect(() => {
    console.log('Home page mounted, validating token...');
    
    // This helps ensure middleware and client-side auth are in sync
    const isTokenValid = validateStoredToken();
    console.log('Token validation result:', isTokenValid);
    
    // If token is not valid and auth thinks we're logged in, force logout
    if (!isTokenValid && isLoggedIn) {
      console.log('Token validation failed but auth state is logged in, forcing logout');
      logout();
      return;
    }
    
    // If we have no valid token and haven't been redirected yet, manually redirect
    if (!isTokenValid) {
      console.log('No valid token found, redirecting to login');
      router.push('/');
      return;
    }
    
    console.log('Token is valid, user is authenticated properly');
  }, [isLoggedIn, logout, router]);

  // Extract loadData function so it can be reused
  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('Attempting to load layouts data...');
      const layouts = await getLayouts();
      console.log('Layouts loaded successfully');
      setCurrentLayouts(layouts);
      // Initialize temporary layouts with the same data
      setTemporaryLayouts(JSON.parse(JSON.stringify(layouts)));
    } catch (error: any) {
      console.error('Error loading layouts:', error);
      // If the error is auth related, you might want to redirect
      if (error?.toString().includes('unauthorized') || error?.toString().includes('auth')) {
        console.log('Auth-related error detected, redirecting to login');
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load saved layouts on component mount
  useEffect(() => {
    // Only load data if we believe we're logged in
    if (isLoggedIn) {
      console.log('User is logged in, loading layout data...');
      loadData();
    } else {
      console.log('User is not logged in, skipping data load');
    }
  }, [isLoggedIn, router]);

  const handleEditClick = () => {
    // Before entering edit mode, store the current layouts as temporary layouts
    // This gives us a snapshot to revert to if the user cancels
    console.log('Entering edit mode, storing current layout as temporary');
    setTemporaryLayouts(JSON.parse(JSON.stringify(currentLayouts)));
    setIsEditMode(true);
  };

  const handleSaveClick = async () => {
    try {
      console.log('Saving layout changes...');
      setIsLoading(true); // Set loading state before save operations
      
      // First, capture the current layouts from GridLayout BEFORE any other operations
      let layoutsToSave;
      
      if (gridLayoutRef.current && typeof gridLayoutRef.current.getCurrentLayouts === 'function') {
        // Get the current layouts directly from the GridLayout component
        layoutsToSave = gridLayoutRef.current.getCurrentLayouts();
        console.log('Captured current layouts from GridLayout:', layoutsToSave);
      } else {
        // Fallback to using our current state
        layoutsToSave = currentLayouts;
        console.log('Using currentLayouts as fallback:', layoutsToSave);
      }
      
      // Create deep copies to avoid reference issues
      const layoutsCopy = JSON.parse(JSON.stringify(layoutsToSave));
      
      // Now, try to save via GridLayout component's saveCurrentState method
      if (gridLayoutRef.current && typeof gridLayoutRef.current.saveCurrentState === 'function') {
        try {
          // This will save the current state to the database
          await gridLayoutRef.current.saveCurrentState();
          console.log('Successfully saved layouts via GridLayout component');
        } catch (error) {
          console.warn('Failed to save via GridLayout, falling back to direct save:', error);
          // Save directly to the database
          await saveLayouts(layoutsCopy);
        }
      } else {
        console.warn('GridLayout reference not available, saving directly');
        await saveLayouts(layoutsCopy);
      }
      
      // Exit edit mode before refetching data
      setIsEditMode(false);
      
      // After saving to database, refetch the data to ensure we have the most up-to-date values
      console.log('Refetching data from database to ensure latest values');
      await loadData(); // This will handle setting isLoading to false
      
      // Toast notification for user feedback
      toast.success('Layout changes saved successfully!');
    } catch (error) {
      console.error('Error saving layouts:', error);
      toast.error('Could not save changes. Please try again.');
      setIsLoading(false); // Make sure to clear loading state on error
    }
  };

  const handleCancelClick = () => {
    console.log('Cancelling edit mode, reverting to original state');
    
    // First, restore our local state from temporary layouts
    // These contain the layouts from before entering edit mode
    const originalLayouts = JSON.parse(JSON.stringify(temporaryLayouts));
    setCurrentLayouts(originalLayouts);
    
    // Next, reset the GridLayout component
    if (gridLayoutRef.current && typeof gridLayoutRef.current.resetToOriginal === 'function') {
      try {
        gridLayoutRef.current.resetToOriginal();
        console.log('Successfully reset GridLayout to original state');
      } catch (error) {
        console.warn('Could not reset GridLayout component, but parent state has been restored:', error);
      }
    } else {
      console.warn('GridLayout reference not available for reset, but parent state has been restored');
    }
    
    // Finally, exit edit mode
    setIsEditMode(false);
    
    // Notify user
    toast.success('Changes cancelled - layout restored to previous state');
  };

  const handleLayoutChange = (layouts: LayoutConfig) => {
    // Update current layouts when layout changes
    console.log('Layout changed in parent component');
    
    // Create a deep copy to avoid reference issues
    const layoutsCopy = JSON.parse(JSON.stringify(layouts));
    setCurrentLayouts(layoutsCopy);
  };

  const navigateToListView = () => {
    // Navigate to the list view for mobile
    router.push('/list');
  };

  // Prevent scrolling when in edit mode
  useEffect(() => {
    if (isEditMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isEditMode]);

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Header section with buttons and title */}
      <div className="w-full flex justify-between items-start mb-4 relative">
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 z-10 items-start">
          <button 
            onClick={navigateToListView}
            className="bg-dark-blue hover:bg-dark-blue-light text-white px-3 py-2 rounded-md shadow-sm border border-primary-700 action-button flex items-center justify-center"
            title="List View"
          >
            <FaList className="md:mr-2" />
            <span className="hidden md:inline">List View</span>
          </button>
          
          <button 
            onClick={() => router.push('/all-items')}
            className="bg-dark-blue hover:bg-dark-blue-light text-white px-3 py-2 rounded-md shadow-sm border border-primary-700 action-button flex items-center justify-center"
            title="All Items"
          >
            <FaLayerGroup className="md:mr-2" />
            <span className="hidden md:inline">All Items</span>
          </button>
        </div>
        
        {/* Center title with animation - now absolute positioned */}
        <h1 
          className={`absolute left-1/2 transform -translate-x-1/2 text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white text-center 
            transition-all duration-700 z-20 whitespace-nowrap ${
              titleAnimated 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-95'
            }`}
        >
          <span className={`inline-block transition-transform ${titleAnimated ? 'animate-pulse-once' : ''}`}>🍳</span>
          <span className="mx-1 sm:mx-2">PantryPal</span>
          <span 
            className={`inline-block transition-transform ${titleAnimated ? 'animate-pulse-once' : ''}`}
            style={{ animationDelay: '0.3s' }}
          >🥘</span>
        </h1>
        
        {/* Edit Controls - right side */}
        <div className="flex z-10 items-start">
          {!isEditMode ? (
            <button
              onClick={handleEditClick}
              className="bg-dark-blue hover:bg-dark-blue-light text-white px-3 py-2 rounded-md shadow-sm border border-primary-700 action-button flex items-center justify-center"
              title="Edit Layout"
            >
              <FaPencilAlt className="md:mr-2" />
              <span className="hidden md:inline">Edit Layout</span>
            </button>
          ) : (
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
              <button
                onClick={handleSaveClick}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md shadow-sm border border-green-800 transition-colors flex items-center justify-center"
                title="Save Layout"
              >
                <FaSave className="md:mr-1" />
                <span className="hidden md:inline">Save</span>
              </button>
              <button
                onClick={handleCancelClick}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md shadow-sm border border-red-800 transition-colors flex items-center justify-center"
                title="Cancel Editing"
              >
                <FaTimesCircle className="md:mr-1" />
                <span className="hidden md:inline">Cancel</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Mode Notice */}
      {isEditMode && (
        <div className="bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded p-3 md:p-4 mb-4 md:mb-6 w-full">
          <div className="flex items-center justify-center">
            <FaPencilAlt className="text-blue-600 dark:text-blue-400 mr-2" />
            <p className="text-blue-800 dark:text-blue-300 text-center text-sm md:text-base">
              <span className="font-semibold md:inline">Edit Mode</span>
              <span className="hidden md:inline"> - Drag boxes to rearrange your home layout.</span>
            </p>
          </div>
        </div>
      )}
      
      {/* Grid Layout Component */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64 w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="w-full mb-8">
          <GridLayoutComponent
            ref={gridLayoutRef}
            isEditMode={isEditMode}
            onLayoutChange={handleLayoutChange}
            onResetToOriginal={() => setCurrentLayouts(JSON.parse(JSON.stringify(temporaryLayouts)))}
          />
        </div>
      )}
    </div>
  );
}
