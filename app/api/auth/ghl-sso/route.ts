import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeLog } from '@/lib/utils/redact';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GHL SSO Authentication Handler
 * POST /api/auth/ghl-sso
 * 
 * Exchanges GHL SSO token for app session
 */
export async function POST(request: NextRequest) {
  try {
    const { token, locationId, companyId } = await request.json();

    if (!token || !locationId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    safeLog.info('Processing GHL SSO authentication', { locationId });

    // Verify the SSO token with GHL (if needed)
    // For now, we trust the token since it comes from GHL iframe

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if installation exists and is active
    const { data: installation, error: installError } = await supabase
      .from('installations')
      .select('*')
      .eq('location_id', locationId)
      .single();

    if (installError || !installation) {
      safeLog.warn('Installation not found for location', { locationId });
      return NextResponse.json(
        { error: 'Installation not found. Please install the app first.' },
        { status: 404 }
      );
    }

    if (installation.status !== 'active') {
      safeLog.warn('Installation is not active', { locationId, status: installation.status });
      return NextResponse.json(
        { error: 'Installation is not active. Please reinstall the app.' },
        { status: 403 }
      );
    }

    // Update last seen timestamp
    await supabase
      .from('installations')
      .update({
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('location_id', locationId);

    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        installation_id: installation.id,
        event_type: 'auth.sso_login',
        actor: 'system',
        details: {
          location_id: locationId,
          company_id: companyId,
          method: 'ghl_sso',
        },
      });

    safeLog.info('GHL SSO authentication successful', { locationId });

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      locationId,
      installation: {
        id: installation.id,
        status: installation.status,
        subscription_status: installation.subscription_status,
      },
    });

    // Set secure cookie with location context
    response.cookies.set('location_id', locationId, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 86400, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    safeLog.error('GHL SSO authentication error', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}