'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CreditCard, Mail, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function VerifyEmail() {
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    // Get email from URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleResendEmail = async () => {
    if (!email) return;
    
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) throw error;
      setResent(true);
    } catch (error) {
      console.error('Error resending email:', error);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <CreditCard className="h-12 w-12 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">FinAI</h1>
          <p className="text-slate-400 mt-2">Your AI-powered financial assistant</p>
        </div>

        {/* Verification Message */}
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-blue-500/20 rounded-full">
              <Mail className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-white mb-4">Check Your Email</h2>
          
          <p className="text-slate-300 mb-6">
            We've sent a verification link to:
          </p>
          
          {email && (
            <div className="bg-slate-900 rounded-lg p-3 mb-6">
              <p className="text-blue-400 font-medium">{email}</p>
            </div>
          )}

          <p className="text-slate-400 text-sm mb-8">
            Click the link in the email to verify your account and start using FinAI.
          </p>

          {/* Resend Email */}
          <div className="space-y-4">
            {resent ? (
              <div className="flex items-center justify-center text-green-400 text-sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                Verification email sent!
              </div>
            ) : (
              <button
                onClick={handleResendEmail}
                disabled={resending || !email}
                className="flex items-center justify-center w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors text-sm"
              >
                {resending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Resend verification email
                  </>
                )}
              </button>
            )}

            <div className="text-center">
              <Link 
                href="/login" 
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-slate-400 text-xs">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
}


