/**
 * Root Page - GHL Custom Menu Link Entry Point
 * 
 * This page detects if loaded in GHL iframe and handles SSO authentication
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authenticating' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Check if we're in an iframe (GHL Custom Menu Link)
    const isInIframe = window.self !== window.top;
    
    if (!isInIframe) {
      // Not in iframe, redirect to install page
      router.push('/install');
      return;
    }

    // We're in GHL iframe, handle SSO authentication
    setStatus('authenticating');
    
    // Listen for SSO token from GHL parent window
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin is from GHL
      if (!event.origin.includes('gohighlevel.com') && !event.origin.includes('leadconnectorhq.com')) {
        console.warn('Received message from unknown origin:', event.origin);
        return;
      }

      const { type, token, locationId, companyId } = event.data;

      if (type === 'GHL_SSO_TOKEN' && token) {
        try {
          // Exchange SSO token for session
          const response = await fetch('/api/auth/ghl-sso', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token,
              locationId,
              companyId,
            }),
          });

          if (!response.ok) {
            throw new Error('SSO authentication failed');
          }

          const data = await response.json();
          
          // Store location context
          if (locationId) {
            document.cookie = `location_id=${locationId}; path=/; max-age=86400; SameSite=None; Secure`;
          }

          // Redirect to dashboard
          router.push('/dashboard');
        } catch (error) {
          console.error('SSO authentication error:', error);
          setStatus('error');
          setErrorMessage('Failed to authenticate with GoHighLevel. Please try again.');
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Request SSO token from GHL parent
    window.parent.postMessage(
      { type: 'REQUEST_SSO_TOKEN' },
      '*' // GHL will send from various domains
    );

    // Fallback: If no SSO token received after 5 seconds, try to get location from URL
    const fallbackTimeout = setTimeout(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const locationId = urlParams.get('location_id');
      
      if (locationId) {
        // Store location and redirect to dashboard
        document.cookie = `location_id=${locationId}; path=/; max-age=86400; SameSite=None; Secure`;
        router.push('/dashboard');
      } else {
        setStatus('error');
        setErrorMessage('No location context found. Please access this app from within GoHighLevel.');
      }
    }, 5000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(fallbackTimeout);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Loading DropTheFee Residuals
            </h2>
            <p className="text-gray-600">
              Initializing application...
            </p>
          </div>
        )}

        {status === 'authenticating' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authenticating with GoHighLevel
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your access...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p className="font-bold">Authentication Error</p>
              <p className="text-sm">{errorMessage}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}