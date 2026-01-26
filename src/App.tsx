import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useGHLAuth } from '@/hooks/useGHLAuth';
import { Dashboard } from './components/dashboard/Dashboard';
import { Header } from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Upload from './pages/Upload';
import Merchants from './pages/Merchants';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => {
  const { user, loading, error } = useGHLAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center space-y-4">
          <div className="text-lg text-slate-300">Connecting to GoHighLevel...</div>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-2xl font-bold text-red-400">Authentication Error</div>
          <div className="text-slate-300">
            {error || 'Unable to authenticate with GoHighLevel. Please ensure this app is opened from within your GHL account.'}
          </div>
          <div className="text-sm text-slate-400 mt-4">
            This app must be accessed through the GoHighLevel marketplace or dashboard.
          </div>
        </div>
      </div>
    );
  }

  const handleSignOut = () => {
    // For GHL apps, we don't handle sign out - users close the iframe
    window.parent.postMessage({ type: 'CLOSE_APP' }, '*');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <Header user={user} onSignOut={handleSignOut} />
              <main className="flex-1 overflow-auto pt-16 p-6">
                <Routes>
                  <Route path="/" element={<Dashboard user={user} onNavigateToUpload={() => {}} onNavigateToCommissions={() => {}} />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/merchants" element={<Merchants />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;