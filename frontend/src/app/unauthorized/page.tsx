'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UnauthorizedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reason, setReason] = useState('');

  useEffect(() => {
    setReason(searchParams.get('reason') || 'access-denied');
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-gray-700 mb-2">
              {reason === 'not-allowlisted' 
                ? 'Your email address is not authorized to access this application.'
                : 'You do not have permission to access this application.'
              }
            </p>
            <p className="text-sm text-gray-600">
              Please contact your administrator to request access.
            </p>
          </div>
          <div className="mt-8 space-y-4">
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Login
            </button>
            <p className="text-sm text-gray-500">
              Need help? Contact{' '}
              <a href="mailto:admin@jnetsolution.com" className="text-blue-600 hover:underline">
                admin@jnetsolution.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}