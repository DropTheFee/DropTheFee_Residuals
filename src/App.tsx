import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dashboard } from './components/dashboard/Dashboard';
import { Header } from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Upload from './pages/Upload';
import Merchants from './pages/Merchants';
import Processors from './pages/Processors';
import NotFound from './pages/NotFound';
import Index from './pages/Index';
import ResetPassword from './pages/ResetPassword';
import AddAgent from './pages/AddAgent';
import Commissions from './pages/Commissions';
import SuRJ from './pages/SuRJ';
import { User } from '@/types';
import { ViewAsProvider } from '@/contexts/ViewAsContext';

const queryClient = new QueryClient();

const App = () => {
  const [authUser, setAuthUser] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUserId: string) => {
    try {
      console.log('Fetching user profile for id:', authUserId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (error) {
        console.error('Error from Supabase:', error);
        return;
      }

      console.log('User profile data:', data);

      if (!data) {
        console.warn('No user profile found for auth_id:', authUserId);
        console.log('Profile will be created in the background');
      }

      setUser(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

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

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!authUser) {
      return <Navigate to="/" replace />;
    }

    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="text-center space-y-4">
            <div className="text-lg text-slate-300">Loading your profile...</div>
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-slate-900 to-[#0f172a]">
        <Header user={user} onSignOut={handleSignOut} />
        <div className="flex pt-16">
          <Sidebar user={user} />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    );
  };

  const DashboardLayout = () => {
    const navigate = useNavigate();

    return (
      <Dashboard
        user={user!}
        onNavigateToUpload={() => navigate('/upload')}
        onNavigateToCommissions={() => navigate('/merchants')}
      />
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ViewAsProvider>
          <Toaster position="top-right" />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={!authUser ? <Index /> : <Navigate to="/dashboard" replace />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
              <Route path="/merchants" element={<ProtectedRoute><Merchants /></ProtectedRoute>} />
              <Route path="/processors" element={<ProtectedRoute><Processors /></ProtectedRoute>} />
              <Route path="/surj" element={<ProtectedRoute><SuRJ /></ProtectedRoute>} />
              <Route path="/add-agent" element={<ProtectedRoute><AddAgent /></ProtectedRoute>} />
              <Route path="/commissions" element={<ProtectedRoute><Commissions /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ViewAsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;