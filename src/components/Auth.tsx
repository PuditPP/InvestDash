import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Loader2, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      
      setMessage({ 
        type: 'success', 
        text: 'Magic link sent! Check your email to sign in.' 
      });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'An error occurred while sending the magic link.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-card border border-border p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl" />

        <div className="relative text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20 mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">InvestDash</h1>
          <p className="text-gray-500 font-medium">
            Sign in securely with a magic link
          </p>
        </div>

        <form onSubmit={handleMagicLink} className="relative space-y-6">
          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-in fade-in zoom-in-95 duration-200 ${
              message.type === 'success' ? 'bg-success/10 text-success border border-success/20' : 'bg-danger/10 text-danger border border-danger/20'
            }`}>
              {message.type === 'error' && <AlertCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                required
                className="w-full bg-sidebar border border-border rounded-xl py-4 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <p className="text-[10px] text-gray-500 ml-1 italic">
              We'll send a secure sign-in link to your inbox.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Send Magic Link</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="relative pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our <span className="text-blue-500 cursor-pointer">Terms of Service</span>
          </p>
        </div>
      </div>
    </div>
  );
};
