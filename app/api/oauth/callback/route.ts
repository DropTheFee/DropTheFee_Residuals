import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, storeTokens } from '@/lib/ghl/oauth-flow';
import { createClient } from '@supabase/supabase-js';
import { safeLog } from '@/lib/utils/redact';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * OAuth callback handler (API route version)
 * GET /api/oauth/callback?code=xxx&state=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      safeLog.warn('OAuth error received', { error });
      return NextResponse.redirect(
        new URL(`/install?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      safeLog.warn('Missing OAuth parameters', { hasCode: !!code, hasState: !!state });
      return NextResponse.redirect(
        new URL('/install?error=missing_parameters', request.url)
      );
    }

    safeLog.info('Processing OAuth callback', { state });

    // Exchange code for tokens
    const tokens = await exchangeCode(code);

    if (!tokens.locationId) {
      safeLog.error('No locationId in token response');
      return NextResponse.redirect(
        new URL('/install?error=invalid_response', request.url)
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create or update installation
    const { data: existingInstallation } = await supabase
      .from('installations')
      .select('id')
      .eq('location_id', tokens.locationId)
      .single();

    if (existingInstallation) {
      // Update existing installation
      await supabase
        .from('installations')
        .update({
          status: 'active',
          uninstalled_at: null,
          last_seen_at: new Date().toISOString(),
          scopes: tokens.scope.split(' '),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingInstallation.id);
      
      safeLog.info('Updated existing installation', { locationId: tokens.locationId });
    } else {
      // Create new installation
      await supabase
        .from('installations')
        .insert({
          location_id: tokens.locationId,
          company_id: tokens.companyId || '',
          user_id: tokens.userId,
          status: 'active',
          scopes: tokens.scope.split(' '),
          subscription_status: 'trial',
          feature_flags: {
            webhooks_enabled: false,
            real_time_sync: false,
          },
        });
      
      safeLog.info('Created new installation', { locationId: tokens.locationId });
    }

    // Store encrypted tokens
    await storeTokens(
      tokens.locationId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in
    );

    // Log audit event
    await supabase
      .from('audit_logs')
      .insert({
        installation_id: existingInstallation?.id,
        event_type: 'oauth.installed',
        actor: tokens.userId || 'system',
        details: {
          location_id: tokens.locationId,
          company_id: tokens.companyId,
          scopes: tokens.scope.split(' '),
        },
      });

    safeLog.info('OAuth flow completed successfully', { locationId: tokens.locationId });

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    safeLog.error('OAuth callback error', error);
    return NextResponse.redirect(
      new URL('/install?error=oauth_failed', request.url)
    );
  }
}