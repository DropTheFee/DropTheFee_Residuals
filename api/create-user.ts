import { createClient } from '@supabase/supabase-js';

type VercelRequest = any;
type VercelResponse = any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      email,
      full_name,
      role,
      sales_rep_id,
      trainer_id,
      agency_id,
      agency_name,
      contract_type,
      override_target_user_id,
    } = req.body;

    if (!email || !full_name || !role || !agency_id || !agency_name || !contract_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError || !authUser.user) {
      console.error('Auth user creation error:', authError);
      return res.status(400).json({ error: authError?.message || 'Failed to create auth user' });
    }

    const { error: userError } = await supabase.from('users').insert({
      id: authUser.user.id,
      email,
      role: 'sales_rep',
      sales_rep_id: sales_rep_id || null,
      trainer_id: trainer_id || null,
      agency_id,
      agency_name,
    });

    if (userError) {
      console.error('Users table insert error:', userError);
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return res.status(400).json({ error: userError.message || 'Failed to create user record' });
    }

    const { error: contractError } = await supabase.from('rep_contracts').insert({
      user_id: authUser.user.id,
      contract_type,
      override_target_user_id: override_target_user_id || null,
      effective_date: new Date().toISOString().split('T')[0],
      agency_id,
    });

    if (contractError) {
      console.error('Rep contracts insert error:', contractError);
      return res.status(400).json({ error: contractError.message || 'Failed to create contract record' });
    }

    return res.status(200).json({
      id: authUser.user.id,
      email: authUser.user.email,
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
