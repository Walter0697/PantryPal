'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { FaEdit, FaSave, FaTimesCircle, FaList } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import { Layout } from 'react-grid-layout';
import { useAuth } from '../../components/AuthProvider';
import { getLayouts, saveLayouts, LayoutConfig } from '../../util/storage';

// Dynamically import the GridLayout component to avoid SSR issues
const GridLayout = dynamic(() => import('../../components/GridLayout'), {
  ssr: false,
});

export default function HomePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLayouts, setCurrentLayouts] = useState<LayoutConfig>({});
  const [temporaryLayouts, setTemporaryLayouts] = useState<LayoutConfig>({});
  
  // Reference to the GridLayout component
  const gridLayoutRef = useRef<any>(null);

  // Load saved layouts on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const layouts = await getLayouts();
        setCurrentLayouts(layouts);
        // Initialize temporary layouts with the same data
        setTemporaryLayouts(JSON.parse(JSON.stringify(layouts)));
      } catch (error) {
        console.error('Error loading layouts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleEditClick = () => {
    // Store the current layouts as temporary layouts when entering edit mode
    setTemporaryLayouts(JSON.parse(JSON.stringify(currentLayouts)));
    setIsEditMode(true);
  };

  const handleSaveClick = async () => {
    // Save layouts to DynamoDB
    try {
      // First, save via the grid layout component to ensure all state is properly updated
      if (gridLayoutRef.current && gridLayoutRef.current.saveCurrentState) {
        await gridLayoutRef.current.saveCurrentState();
        
        // Also ensure we save the layouts we have in our state
        await saveLayouts(currentLayouts);
        
        // Update temporaryLayouts to match current layouts after successful save
        setTemporaryLayouts(JSON.parse(JSON.stringify(currentLayouts)));
        setIsEditMode(false);
      } else {
        console.error('GridLayout reference not available');
        throw new Error('GridLayout reference not available');
      }
    } catch (error) {
      console.error('Error saving layouts:', error);
      // Display error message to user
      alert('Could not save changes. Please try again.');
    }
  };

  const handleCancelClick = () => {
    // Restore from temporary layouts when cancelling edit
    setCurrentLayouts(JSON.parse(JSON.stringify(temporaryLayouts)));
    setIsEditMode(false);
    
    // Tell the GridLayout to reset
    if (gridLayoutRef.current) {
      gridLayoutRef.current.resetToOriginal();
    }
  };

  const handleLayoutChange = (layouts: LayoutConfig) => {
    // Update current layouts when layout changes
    setCurrentLayouts(layouts);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          Your Home Layout
        </h1>
        
        <div className="flex space-x-2">
          {/* List View button - shown regardless of edit mode */}
          <button 
            onClick={navigateToListView}
            className="bg-dark-blue hover:bg-dark-blue-light text-white p-2 rounded-md shadow-sm border border-primary-700 action-button"
            title="List View"
          >
            <FaList className="text-xl" />
          </button>
          
          {/* Edit Controls */}
          {!isEditMode ? (
            <button
              onClick={handleEditClick}
              className="bg-dark-blue hover:bg-dark-blue-light text-white p-2 rounded-md shadow-sm border border-primary-700 action-button"
              title="Edit Layout"
            >
              <FaEdit className="text-xl" />
            </button>
          ) : (
            <>
              <button
                onClick={handleSaveClick}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md shadow-sm border border-green-800 transition-colors flex items-center"
                title="Save Layout"
              >
                <FaSave className="mr-1" />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancelClick}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md shadow-sm border border-red-800 transition-colors flex items-center"
                title="Cancel Editing"
              >
                <FaTimesCircle className="mr-1" />
                <span>Cancel</span>
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Edit Mode Notice */}
      {isEditMode && (
        <div className="bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded p-4 mb-6">
          <p className="text-blue-800 dark:text-blue-300 text-center">
            <span className="font-semibold">Edit Mode</span> - Drag boxes to rearrange your home layout.
          </p>
        </div>
      )}
      
      {/* Grid Layout Component */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="mb-8">
          <GridLayout
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
