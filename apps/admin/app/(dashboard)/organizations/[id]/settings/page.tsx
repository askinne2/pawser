'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type TabId = 'general' | 'branding' | 'portal' | 'domains';

interface Settings {
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  locale: string;
  websiteUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textPrimary: string;
  textSecondary: string;
  headingFont: string;
  bodyFont: string;
  showLogo: boolean;
  showOrgName: boolean;
  navLinks: Array<{ label: string; url: string }>;
  showContactInfo: boolean;
  showSocialLinks: boolean;
  footerText: string | null;
  copyrightText: string | null;
  ctaButtonText: string;
  ctaButtonUrl: string | null;
  ctaButtonStyle: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

interface Domain {
  id: string;
  domain: string;
  isPrimary: boolean;
  verificationStatus: string;
  sslStatus: string;
}

const fontOptions = [
  { value: 'system', label: 'System Default' },
  { value: 'inter', label: 'Inter' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'montserrat', label: 'Montserrat' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'open-sans', label: 'Open Sans' },
];

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Pacific/Honolulu',
  'America/Anchorage',
];

export default function SettingsPage() {
  const params = useParams();
  const orgId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Local edits
  const [editedSettings, setEditedSettings] = useState<Partial<Settings>>({});
  const [editedSlug, setEditedSlug] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = getToken();
      const response = await fetch(`${apiUrl}/api/v1/organizations/${orgId}/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error?.message || 'Failed to fetch settings');
        return;
      }

      setOrganization(data.data.organization);
      setSettings(data.data.settings);
      setDomains(data.data.domains);
      setEditedSlug(data.data.organization.slug);
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, orgId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSettings = async () => {
    if (Object.keys(editedSettings).length === 0) return;

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = getToken();
      const response = await fetch(`${apiUrl}/api/v1/organizations/${orgId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editedSettings),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSettings({ ...settings!, ...editedSettings });
        setEditedSettings({});
        setSuccessMessage('Settings saved successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.error?.message || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSlug = async () => {
    if (!editedSlug || editedSlug === organization?.slug) return;

    setSaving(true);
    setError('');

    try {
      const token = getToken();
      const response = await fetch(`${apiUrl}/api/v1/organizations/${orgId}/settings/slug`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug: editedSlug }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOrganization({ ...organization!, slug: editedSlug });
        setSuccessMessage('Subdomain updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.error?.message || 'Failed to update subdomain');
      }
    } catch (err) {
      setError('Failed to update subdomain');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof Settings, value: Settings[keyof Settings]) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }));
  };

  const getCurrentValue = <K extends keyof Settings>(key: K): Settings[K] => {
    return (editedSettings[key] ?? settings?.[key]) as Settings[K];
  };

  const hasChanges = Object.keys(editedSettings).length > 0;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'branding', label: 'Branding' },
    { id: 'portal', label: 'Portal' },
    { id: 'domains', label: 'Domains' },
  ];

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!settings || !organization) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 mb-4">{error || 'Failed to load settings'}</p>
          <Link href={`/organizations/${orgId}`} className="text-blue-600 hover:text-blue-700">
            ← Back to organization
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href={`/organizations/${orgId}`} className="text-blue-600 hover:text-blue-700 text-sm">
          ← Back to organization
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-1">{organization.name}</p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <p className="text-emerald-700">{successMessage}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={getCurrentValue('contactEmail') || ''}
                  onChange={(e) => updateSetting('contactEmail', e.target.value || null)}
                  placeholder="adopt@shelter.org"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={getCurrentValue('phone') || ''}
                  onChange={(e) => updateSetting('phone', e.target.value || null)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  value={getCurrentValue('address') || ''}
                  onChange={(e) => updateSetting('address', e.target.value || null)}
                  placeholder="123 Main St, City, State"
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                <select
                  value={getCurrentValue('timezone')}
                  onChange={(e) => updateSetting('timezone', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <hr className="my-6" />

              <h3 className="font-semibold text-slate-900">Social Links</h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input
                  type="url"
                  value={getCurrentValue('websiteUrl') || ''}
                  onChange={(e) => updateSetting('websiteUrl', e.target.value || null)}
                  placeholder="https://www.mysheter.org"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Facebook</label>
                  <input
                    type="url"
                    value={getCurrentValue('facebookUrl') || ''}
                    onChange={(e) => updateSetting('facebookUrl', e.target.value || null)}
                    placeholder="https://facebook.com/..."
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Instagram</label>
                  <input
                    type="url"
                    value={getCurrentValue('instagramUrl') || ''}
                    onChange={(e) => updateSetting('instagramUrl', e.target.value || null)}
                    placeholder="https://instagram.com/..."
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Color Settings */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Colors</h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={getCurrentValue('primaryColor')}
                        onChange={(e) => updateSetting('primaryColor', e.target.value)}
                        className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={getCurrentValue('primaryColor')}
                        onChange={(e) => updateSetting('primaryColor', e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Secondary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={getCurrentValue('secondaryColor')}
                        onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                        className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={getCurrentValue('secondaryColor')}
                        onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Background Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={getCurrentValue('backgroundColor')}
                        onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                        className="w-12 h-10 rounded border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={getCurrentValue('backgroundColor')}
                        onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Typography */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Typography</h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Heading Font
                    </label>
                    <select
                      value={getCurrentValue('headingFont')}
                      onChange={(e) => updateSetting('headingFont', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
                    >
                      {fontOptions.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Body Font
                    </label>
                    <select
                      value={getCurrentValue('bodyFont')}
                      onChange={(e) => updateSetting('bodyFont', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
                    >
                      {fontOptions.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="mt-8 p-4 bg-slate-100 rounded-lg">
                <h3 className="font-semibold text-slate-700 mb-3">Preview</h3>
                <div
                  className="p-6 rounded-lg shadow"
                  style={{ backgroundColor: getCurrentValue('backgroundColor') }}
                >
                  <div
                    className="px-4 py-3 rounded-lg mb-4"
                    style={{ backgroundColor: getCurrentValue('primaryColor') }}
                  >
                    <span className="text-white font-semibold">Header with Primary Color</span>
                  </div>
                  <p style={{ color: getCurrentValue('textPrimary') }}>
                    This is sample body text in the primary text color.
                  </p>
                  <p style={{ color: getCurrentValue('textSecondary') }} className="text-sm mt-2">
                    This is secondary text for descriptions and captions.
                  </p>
                  <button
                    className="mt-4 px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: getCurrentValue('primaryColor') }}
                  >
                    {getCurrentValue('ctaButtonText')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Portal Tab */}
          {activeTab === 'portal' && (
            <div className="space-y-6 max-w-xl">
              <h3 className="font-semibold text-slate-900">Header</h3>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Show Logo</label>
                <button
                  onClick={() => updateSetting('showLogo', !getCurrentValue('showLogo'))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    getCurrentValue('showLogo') ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      getCurrentValue('showLogo') ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Show Organization Name</label>
                <button
                  onClick={() => updateSetting('showOrgName', !getCurrentValue('showOrgName'))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    getCurrentValue('showOrgName') ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      getCurrentValue('showOrgName') ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <hr className="my-6" />

              <h3 className="font-semibold text-slate-900">Call-to-Action Button</h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Button Text</label>
                <input
                  type="text"
                  value={getCurrentValue('ctaButtonText')}
                  onChange={(e) => updateSetting('ctaButtonText', e.target.value)}
                  placeholder="Apply to Adopt"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Button URL</label>
                <input
                  type="url"
                  value={getCurrentValue('ctaButtonUrl') || ''}
                  onChange={(e) => updateSetting('ctaButtonUrl', e.target.value || null)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <hr className="my-6" />

              <h3 className="font-semibold text-slate-900">Footer</h3>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Show Contact Info</label>
                <button
                  onClick={() =>
                    updateSetting('showContactInfo', !getCurrentValue('showContactInfo'))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    getCurrentValue('showContactInfo') ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      getCurrentValue('showContactInfo') ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Show Social Links</label>
                <button
                  onClick={() =>
                    updateSetting('showSocialLinks', !getCurrentValue('showSocialLinks'))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    getCurrentValue('showSocialLinks') ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      getCurrentValue('showSocialLinks') ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Footer Text</label>
                <textarea
                  value={getCurrentValue('footerText') || ''}
                  onChange={(e) => updateSetting('footerText', e.target.value || null)}
                  placeholder="Custom footer text (supports markdown)"
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Copyright Text
                </label>
                <input
                  type="text"
                  value={getCurrentValue('copyrightText') || ''}
                  onChange={(e) => updateSetting('copyrightText', e.target.value || null)}
                  placeholder="© 2026 My Shelter. All rights reserved."
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
            </div>
          )}

          {/* Domains Tab */}
          {activeTab === 'domains' && (
            <div className="space-y-6">
              {/* Subdomain */}
              <div className="max-w-xl">
                <h3 className="font-semibold text-slate-900 mb-4">Subdomain</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedSlug}
                    onChange={(e) => setEditedSlug(e.target.value.toLowerCase())}
                    placeholder="mysheter"
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                  <span className="text-slate-600">.pawser.app</span>
                  {editedSlug !== organization.slug && (
                    <button
                      onClick={handleSaveSlug}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Current URL:{' '}
                  <a
                    href={`https://${organization.slug}.pawser.app`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {organization.slug}.pawser.app
                  </a>
                </p>
              </div>

              <hr className="my-6" />

              {/* Custom Domains */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-4">Custom Domains</h3>

                {domains.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg">
                    <p className="text-slate-500 mb-2">No custom domains configured</p>
                    <p className="text-sm text-slate-400">
                      Custom domain support coming soon
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-sm font-medium text-slate-600">
                          Domain
                        </th>
                        <th className="text-left py-2 text-sm font-medium text-slate-600">
                          Status
                        </th>
                        <th className="text-left py-2 text-sm font-medium text-slate-600">SSL</th>
                        <th className="text-right py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {domains.map((domain) => (
                        <tr key={domain.id} className="border-b border-slate-100">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {domain.domain}
                              {domain.isPrimary && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                domain.verificationStatus === 'verified'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : domain.verificationStatus === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {domain.verificationStatus}
                            </span>
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                domain.sslStatus === 'active'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {domain.sslStatus}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button className="text-sm text-red-600 hover:text-red-700">
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
