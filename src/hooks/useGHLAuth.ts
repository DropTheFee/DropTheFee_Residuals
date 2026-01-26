import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';

interface GHLUser {
  locationId: string;
  companyId: string;
  userId: string;
  email: string;
  name: string;
  role: string;
}

export function useGHLAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeGHLAuth();
  }, []);

  const initializeGHLAuth = async () => {
    try {
      // Get GHL context from URL params or postMessage from parent iframe
      const ghlUser = await getGHLUserFromContext();
      
      if (!ghlUser) {
        setError('No GHL authentication context found');
        setLoading(false);
        return;
      }

      // Map GHL user to our User type and sync with Supabase
      await syncUserWithSupabase(ghlUser);
      
    } catch (err) {
      console.error('GHL Auth initialization error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setLoading(false);
    }
  };

  const getGHLUserFromContext = async (): Promise<GHLUser | null> => {
    // Method 1: Check URL parameters (for OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // Exchange code for access token and get user info
      return await exchangeCodeForUser(code);
    }

    // Method 2: Check for postMessage from parent iframe
    return new Promise((resolve) => {
      const handleMessage = (event: MessageEvent) => {
        // Verify origin is from GHL
        if (event.origin.includes('gohighlevel.com') || event.origin.includes('highlevel.app')) {
          if (event.data.type === 'GHL_AUTH') {
            resolve(event.data.user);
          }
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Request auth context from parent
      window.parent.postMessage({ type: 'REQUEST_GHL_AUTH' }, '*');

      // Timeout after 5 seconds
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        resolve(null);
      }, 5000);
    });
  };

  const exchangeCodeForUser = async (code: string): Promise<GHLUser | null> => {
    try {
      // Call GHL OAuth token endpoint
      const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: import.meta.env.VITE_GHL_CLIENT_ID || '',
          client_secret: import.meta.env.VITE_GHL_CLIENT_SECRET || '',
          grant_type: 'authorization_code',
          code,
          redirect_uri: import.meta.env.VITE_GHL_REDIRECT_URI || window.location.origin,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await response.json();
      
      // Get user info from GHL
      const userResponse = await fetch('https://services.leadconnectorhq.com/oauth/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user info');
      }

      const userData = await userResponse.json();
      
      return {
        locationId: userData.locationId || userData.companyId,
        companyId: userData.companyId,
        userId: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role || 'sales_rep',
      };
    } catch (err) {
      console.error('Error exchanging code:', err);
      return null;
    }
  };

  const syncUserWithSupabase = async (ghlUser: GHLUser) => {
    try {
      // Map GHL locationId to agency_id for multi-tenancy
      const agencyId = ghlUser.locationId;

      // Check if user exists in Supabase
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('ghl_user_id', ghlUser.userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let userData: User;

      if (existingUser) {
        // Update existing user
        const { data: updated, error: updateError } = await supabase
          .from('users')
          .update({
            email: ghlUser.email,
            full_name: ghlUser.name,
            agency_id: agencyId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) throw updateError;
        userData = updated;
      } else {
        // Create new user
        const role = mapGHLRoleToAppRole(ghlUser.role);
        
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            ghl_user_id: ghlUser.userId,
            email: ghlUser.email,
            full_name: ghlUser.name,
            role,
            agency_id: agencyId,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        userData = newUser;
      }

      setUser(userData);
      setLoading(false);
    } catch (err) {
      console.error('Error syncing user with Supabase:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync user');
      setLoading(false);
    }
  };

  const mapGHLRoleToAppRole = (ghlRole: string): User['role'] => {
    const roleMap: Record<string, User['role']> = {
      'admin': 'admin',
      'user': 'sales_rep',
      'account admin': 'superadmin',
    };

    return roleMap[ghlRole.toLowerCase()] || 'sales_rep';
  };

  return {
    user,
    loading,
    error,
  };
}