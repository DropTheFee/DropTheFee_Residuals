import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, Eye, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface HeaderProps {
  user?: User;
  onSignOut: () => void;
}

export function Header({ user, onSignOut }: HeaderProps) {
  const { isViewingAsRep, viewAsRepName, setViewAsRep, exitViewAs } = useViewAs();
  const [reps, setReps] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRepId, setSelectedRepId] = useState<string>('');

  useEffect(() => {
    if (user?.role === 'superadmin') {
      loadReps();
    }
  }, [user]);

  const loadReps = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('agency_id', user?.agency_id)
        .in('role', ['sales_rep', 'junior_sales_rep'])
        .order('full_name', { ascending: true });

      if (error) throw error;

      setReps(data?.map(r => ({ id: r.id, name: r.full_name || 'Unnamed Rep' })) || []);
    } catch (error) {
      console.error('Error loading reps:', error);
    }
  };

  const handleViewAsChange = (repId: string) => {
    setSelectedRepId(repId);
    const rep = reps.find(r => r.id === repId);
    if (rep) {
      setViewAsRep(repId, rep.name);
    }
  };

  const handleExitViewAs = () => {
    exitViewAs();
    setSelectedRepId('');
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      SuperAdmin: 'Super Admin',
      admin: 'Admin',
      sales_rep: 'Sales Rep',
      junior_sales_rep: 'Junior Rep',
    };
    return badges[role as keyof typeof badges] || role;
  };

  return (
    <>
      {isViewingAsRep && (
        <div className="fixed top-0 left-0 right-0 bg-amber-600 text-white py-2 px-6 z-[60] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="font-medium">Viewing as {viewAsRepName}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExitViewAs}
            className="text-white hover:bg-amber-700"
          >
            <X className="h-4 w-4 mr-2" />
            Exit View
          </Button>
        </div>
      )}
      <header className={`fixed ${isViewingAsRep ? 'top-10' : 'top-0'} left-0 right-0 h-16 bg-[#16213e] border-b border-slate-700 z-50`}>
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="https://mgx-backend-cdn.metadl.com/generate/images/770325/2026-01-26/7cffe5ff-62e8-41d1-92d2-8e125cff7f5f.png"
              alt="DropTheFee"
              className="h-8"
            />
            <div>
              <h1 className="text-xl font-bold text-slate-50">DropTheFee</h1>
              <p className="text-xs text-slate-400">Residual Management</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user?.role === 'superadmin' && !isViewingAsRep && reps.length > 0 && (
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-400" />
                <Select value={selectedRepId} onValueChange={handleViewAsChange}>
                  <SelectTrigger className="w-[200px] bg-slate-900 border-slate-600 text-white text-sm">
                    <SelectValue placeholder="View as rep..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reps.map((rep) => (
                      <SelectItem key={rep.id} value={rep.id}>
                        {rep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-[#1a1a2e]">
                  <UserIcon className="h-5 w-5" />
                  <div className="text-left">
                    <div className="text-sm font-medium">{user?.full_name || user?.email || 'User'}</div>
                    <div className="text-xs text-slate-400">{user ? getRoleBadge(user.role) : 'Loading...'}</div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#16213e] border-slate-700">
                <DropdownMenuLabel className="text-slate-200">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem className="text-slate-300 focus:bg-[#1a1a2e] focus:text-white">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  onClick={onSignOut}
                  className="text-red-400 focus:bg-[#1a1a2e] focus:text-red-400"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
}