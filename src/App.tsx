import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dashboard } from './components/dashboard/Dashboard';
import { Header } from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Upload from './pages/Upload';
import Merchants from './pages/Merchants';
import NotFound from './pages/NotFound';
import Index from './pages/Index';

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center space-y-4">
          <div className="text-lg text-slate-300">Loading...</div>
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={!user ? <Index /> : <Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                user ? (
                  <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-slate-900 to-[#0f172a]">
                    <Header onSignOut={handleSignOut} />
                    <div className="flex">
                      <Sidebar />
                      <main className="flex-1 p-6">
                        <Dashboard />
                      </main>
                    </div>
                  </div>
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/upload"
              element={
                user ? (
                  <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-slate-900 to-[#0f172a]">
                    <Header onSignOut={handleSignOut} />
                    <div className="flex">
                      <Sidebar />
                      <main className="flex-1 p-6">
                        <Upload />
                      </main>
                    </div>
                  </div>
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/merchants"
              element={
                user ? (
                  <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-slate-900 to-[#0f172a]">
                    <Header onSignOut={handleSignOut} />
                    <div className="flex">
                      <Sidebar />
                      <main className="flex-1 p-6">
                        <Merchants />
                      </main>
                    </div>
                  </div>
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;