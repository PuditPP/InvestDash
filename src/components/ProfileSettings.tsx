import React, { useState } from 'react';
import { User, Mail, Lock, Camera, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePortfolio } from '../context/PortfolioContext';

export const ProfileSettings: React.FC = () => {
  const { user } = usePortfolio();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
  const [email] = useState(user?.email || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [isOldPasswordVerified, setIsOldPasswordVerified] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 2MB.' });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Only image files are allowed.' });
      return;
    }

    setIsUploadingAvatar(true);
    setMessage(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // 1. Upload file to Supabase Storage
      // NOTE: Ensure 'avatars' bucket is created and set to public in your Supabase project
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update component state and profile metadata
      setAvatarUrl(publicUrl);
      
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'Profile picture uploaded successfully!' });
    } catch (err: any) {
      console.error('Upload failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to upload profile picture. Please ensure "avatars" bucket is created and set to public in Supabase Storage.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          full_name: fullName,
          avatar_url: avatarUrl
        }
      });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleVerifyOldPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingPassword(true);
    setMessage(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email || '',
        password: oldPassword,
      });

      if (signInError) {
        throw new Error('Incorrect old password.');
      }

      setIsOldPasswordVerified(true);
      setMessage({ type: 'success', text: 'Password verified. You can now set a new password.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to verify password.' });
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      
      // Reset flow
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsOldPasswordVerified(false);
      setShowPasswordFields(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Account Settings</h1>
        <p className="text-gray-500 mt-1">Manage your profile information and security preferences.</p>
      </header>

      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2 ${
          message.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Section */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border bg-sidebar/30">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Profile Information
              </h2>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border/50">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-bold border-4 border-sidebar overflow-hidden shadow-xl">
                    {isUploadingAvatar ? (
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      fullName.charAt(0) || user?.email?.charAt(0) || '?'
                    )}
                  </div>
                  <label className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      disabled={isUploadingAvatar}
                    />
                  </label>
                </div>
                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <h3 className="text-xl font-bold text-white">{fullName || 'No Name Set'}</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Enter your full name" 
                      className="w-full bg-sidebar border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70"
                >
                  {isUpdatingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Security Section */}
        <div className="space-y-6">
          <section className="bg-card border border-border rounded-2xl overflow-hidden h-full">
            <div className="p-6 border-b border-border bg-sidebar/30">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-500" />
                Security
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              {!showPasswordFields ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-gray-500 mb-6">Want to update your password? You will need your current password for verification.</p>
                  <button 
                    onClick={() => setShowPasswordFields(true)}
                    className="flex items-center justify-center gap-2 bg-sidebar border border-border hover:border-blue-500 hover:text-blue-500 px-6 py-2.5 rounded-xl text-sm font-bold transition-all mx-auto"
                  >
                    <Lock className="w-4 h-4" />
                    Change Password
                  </button>
                </div>
              ) : !isOldPasswordVerified ? (
                <form onSubmit={handleVerifyOldPassword} className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full bg-sidebar border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowPasswordFields(false)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-sidebar transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isVerifyingPassword}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-70 shadow-lg shadow-blue-500/20"
                    >
                      {isVerifyingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Verify
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-6 animate-in slide-in-from-top-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full bg-sidebar border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        className="w-full bg-sidebar border border-border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70"
                    >
                      {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                      Update Password
                    </button>
                  </div>
                </form>
              )}

              <div className="p-4 bg-sidebar/30 rounded-xl border border-border/50">
                <div className="flex gap-3 text-[10px] text-gray-500 italic">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <p>Security Tip: Use a password with at least 8 characters including letters and symbols.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
