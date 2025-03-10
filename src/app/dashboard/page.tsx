import { Suspense } from 'react';
import { getHomeLayout } from '@/util/server-only/initHomeLayout';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function HomeLayoutContent() {
  console.log(`[${new Date().toISOString()}] 🏠 DASHBOARD: Dashboard page component rendering...`);
  
  console.log(`[${new Date().toISOString()}] 🔍 DASHBOARD: Fetching home layout for dashboard...`);
  
  // This will use the layout that was initialized on server start
  const homeLayout = await getHomeLayout('default');
  
  if (!homeLayout) {
    console.log(`[${new Date().toISOString()}] ⚠️ DASHBOARD: No home layout found!`);
    return (
      <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded">
        <h2 className="text-xl font-bold">Error loading home layout</h2>
        <p>Could not load the default home layout. Please check your DynamoDB configuration.</p>
      </div>
    );
  }
  
  console.log(`[${new Date().toISOString()}] ✅ DASHBOARD: Home layout loaded successfully. Rendering ${homeLayout.layout.length} widgets.`);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{homeLayout.name}</h1>
      
      <div className="grid grid-cols-12 gap-4">
        {homeLayout.layout.map((item) => (
          <div 
            key={item.i}
            className="bg-white shadow rounded-lg p-4 border border-gray-200"
            style={{
              gridColumn: `span ${item.w} / span ${item.w}`,
              gridRow: `span ${item.h} / span ${item.h}`,
            }}
          >
            <h2 className="text-lg font-semibold mb-2">{item.content.title}</h2>
            <p className="text-gray-500">Widget type: {item.content.type}</p>
            {/* Here you would render the actual widget content based on type */}
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Last updated: {new Date(homeLayout.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  console.log(`[${new Date().toISOString()}] 🚀 DASHBOARD: Dashboard page loading...`);
  
  return (
    <Suspense fallback={<div className="p-6">Loading dashboard layout...</div>}>
      <HomeLayoutContent />
    </Suspense>
  );
} 