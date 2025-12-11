'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Globe, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadSettings = async () => {
    try {
      // Load user profile
      setDisplayName(user?.user_metadata?.display_name || '');

      // Load currency from user_settings
      const { data } = await supabase
        .from('user_settings')
        .select('currency')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setCurrency(data.currency || 'USD');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);

    try {
      // Update currency in user_settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .update({ currency, updated_at: new Date().toISOString() })
        .eq('user_id', user?.id);

      if (settingsError) throw settingsError;

      // Update display name in auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      });

      if (authError) throw authError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-[var(--background)] min-h-screen transition-colors duration-300 flex items-center justify-center">
        <div className="text-center animate-scale-in">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="relative spinner rounded-full h-16 w-16 border-4 border-[var(--text-tertiary)] border-t-transparent"></div>
          </div>
          <p className="text-[var(--text-secondary)] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[var(--background)] min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="mb-6 md:mb-8 animate-slide-in-up pl-16 lg:pl-0">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">Settings</h1>
        <p className="text-sm md:text-base text-[var(--text-secondary)]">Manage your profile and preferences</p>
      </div>

      <div className="max-w-2xl">
        {/* Profile Section */}
        <div className="glass-card rounded-2xl p-4 md:p-6 animate-scale-in mb-4 md:mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Profile Information
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-[var(--text-secondary)]" />
                <input
                  type="email"
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 pl-10 pr-4 py-2 text-[var(--text-secondary)] cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Display Name
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-4 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="glass-card rounded-2xl p-4 md:p-6 animate-scale-in mb-4 md:mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6 flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Preferences
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full glass-card border border-[var(--card-border)] rounded-xl transition-all duration-300 px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD - US Dollar ($)</option>
                <option value="EUR">EUR - Euro (€)</option>
                <option value="GBP">GBP - British Pound (£)</option>
                <option value="JPY">JPY - Japanese Yen (¥)</option>
                <option value="CNY">CNY - Chinese Yuan (¥)</option>
                <option value="SGD">SGD - Singapore Dollar (S$)</option>
                <option value="MYR">MYR - Malaysian Ringgit (RM)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <div>
            {success && (
              <span className="text-[var(--accent-success)] text-sm">✓ Settings saved successfully!</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center"
          >
            <Save className="h-4 w-4 mr-2 text-white" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}






