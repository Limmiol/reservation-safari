import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Save, AlertCircle, Palette, Shield, Image, Building2, Bell, FileText, Mail, CheckCircle, CreditCard, Copy, MessageSquare, Send, ShieldCheck, Loader2 } from 'lucide-react';
import { getSiteConfig, saveSiteConfig, defaultConfig } from '@/lib/siteConfig';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';
const buildApiUrl = (path) => API_BASE_URL ? `${API_BASE_URL}${path}` : path;

const ACCENT_PRESETS = [
  { label: 'Safari Green', value: '137 72% 45%' },
  { label: 'Ocean Blue', value: '210 100% 50%' },
  { label: 'Sunset Orange', value: '25 95% 53%' },
  { label: 'Royal Purple', value: '270 70% 55%' },
  { label: 'Crimson Red', value: '0 86% 56%' },
  { label: 'Teal', value: '180 70% 40%' },
  { label: 'Gold', value: '45 93% 47%' },
  { label: 'Slate', value: '215 20% 45%' },
];

const ALL_ROUTES = [
  { path: '/', label: 'Dashboard' },
  { path: '/clients', label: 'Clients' },
  { path: '/packages', label: 'Packages' },
  { path: '/bookings', label: 'Bookings' },
  { path: '/calendar', label: 'Calendar' },
  { path: '/safari-library', label: 'Safari Library' },
  { path: '/safari-quote-builder', label: 'Safari Quote Builder' },
  { path: '/package-import', label: 'Package Import' },
  { path: '/when-to-visit', label: 'When to Visit' },
  { path: '/trip-planner', label: 'Trip Planner' },
  { path: '/testimonials', label: 'Testimonials' },
  { path: '/quotes', label: 'Quotes' },
  { path: '/invoices', label: 'Invoices' },
  { path: '/payments', label: 'Payments' },
  { path: '/vouchers', label: 'Vouchers' },
  { path: '/flights', label: 'Flights' },
  { path: '/manifests', label: 'Manifests' },
  { path: '/messages', label: 'Messages' },
  { path: '/vehicles', label: 'Vehicles' },
  { path: '/drivers', label: 'Drivers' },
  { path: '/equipment', label: 'Equipment' },
  { path: '/resource-scheduler', label: 'Resource Scheduler' },
  { path: '/resource-assignments', label: 'Resources' },
  { path: '/availability', label: 'Availability' },
  { path: '/expenses', label: 'Expenses' },
  { path: '/income', label: 'Income' },
  { path: '/agents', label: 'AI Agents' },
  { path: '/otas', label: 'OTA Channels' },
  { path: '/currency-converter', label: 'Currency Converter' },
  { path: '/driver-performance', label: 'Driver Performance' },
  { path: '/agent-dashboard', label: 'Agent Dashboard' },
  { path: '/guide-dashboard', label: 'Guide Dashboard' },
  { path: '/users', label: 'Users' },
  { path: '/profile', label: 'Profile' },
  { path: '/settings', label: 'Settings' },
];

const ROLES = ['admin', 'user', 'agent', 'guide', 'driver', 'other'];

export default function Settings() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const { toast } = useToast();
  const [business, setBusiness] = useState({
    company_email: 'info@safarireservations.com',
    support_phone: '+254 (0) 700 000000',
    business_address: 'Nairobi, Kenya',
    currency: 'USD',
    timezone: 'Africa/Nairobi',
  });

  const [quoteDefaults, setQuoteDefaults] = useState({
    company_about: '',
    company_contact: '',
    payment_terms: '50/50',
    validity_days: 14,
    inclusions: '',
    exclusions: '',
  });

  const [notifs, setNotifs] = useState({
    booking_confirmation_email: true,
    payment_reminder_email: true,
    weekly_report_email: true,
  });

  const [siteConfig, setSiteConfig] = useState(getSiteConfig);
  const [activeTab, setActiveTab] = useState('business');
  const [selectedRole, setSelectedRole] = useState('admin');
  const logoInputRef = useRef();

  const [smtp, setSmtp] = useState({ host: '', port: '587', user: '', pass: '', sender_name: '', company_email: '', company_phone: '', company_address: '', logo_url: '', accent_color: '#16a34a', payment_link: '' });
  const [smtpLoaded, setSmtpLoaded] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [serverOnline, setServerOnline] = useState(null); // null=unknown, true, false

  // PesaPal state
  const [pesapal, setPesapal] = useState({ consumer_key: '', consumer_secret: '', environment: 'sandbox', ipn_id: '', configured: false });
  const [pesapalLoaded, setPesapalLoaded] = useState(false);
  const [pesapalSaving, setPesapalSaving] = useState(false);
  const pesapalCallbackUrl = `${API_BASE_URL || `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`}/api/payment/callback`;

  // SMS / WhatsApp state
  const [sms, setSms] = useState({
    provider: 'twilio',
    twilio_account_sid: '', twilio_auth_token: '', twilio_from: '', twilio_whatsapp_from: '',
    at_username: '', at_api_key: '', at_sender_id: '',
    sms_enabled: false, whatsapp_enabled: false,
    wa_templates: {
      booking_received: '', booking_confirmed: '', payment_receipt: '', upcoming_reminder: '',
    },
  });
  const [smsLoaded, setSmsLoaded] = useState(false);
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsTestTo, setSmsTestTo] = useState('');
  const [smsTestChannel, setSmsTestChannel] = useState('sms');
  const [smsTestTemplate, setSmsTestTemplate] = useState('');  // '' = freeform body
  const [smsVerifying, setSmsVerifying] = useState(false);
  const [smsVerifyResult, setSmsVerifyResult] = useState(null); // { ok, friendlyName } | { ok:false, error } | null

  // Helper: parse response safely, detect offline server
  const safeJson = async (res) => {
    const text = await res.text();
    if (!text.trim()) return {};
    if (text.trim().startsWith('<')) throw new Error('backend_offline');
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON response from server');
    }
  };

  // Reset loaded flags whenever we leave a tab so it re-checks on return
  useEffect(() => {
    if (activeTab !== 'email') setSmtpLoaded(false);
    if (activeTab !== 'payments') setPesapalLoaded(false);
    if (activeTab !== 'sms') setSmsLoaded(false);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'email' && !smtpLoaded) {
      fetch(buildApiUrl('/api/email/config'), {
        headers: { Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
      })
        .then(async r => {
          const text = await r.text();
          if (text.trim().startsWith('<')) { setServerOnline(false); setSmtpLoaded(true); return; }
          const cfg = JSON.parse(text);
          setServerOnline(true);
          if (cfg.configured) setSmtp(s => ({
            ...s,
            host: cfg.host || '', port: cfg.port || '587',
            user: cfg.user || '', sender_name: cfg.sender_name || '',
            company_email: cfg.company_email || '', company_phone: cfg.company_phone || '',
            company_address: cfg.company_address || '', logo_url: cfg.logo_url || '',
            accent_color: cfg.accent_color || '#16a34a', payment_link: cfg.payment_link || '',
          }));
          setSmtpLoaded(true);
        })
        .catch(() => { setServerOnline(false); setSmtpLoaded(true); });
    }
  }, [activeTab, smtpLoaded]);

  // Load PesaPal config when payments tab is opened
  useEffect(() => {
    if (activeTab === 'payments' && !pesapalLoaded) {
      fetch(buildApiUrl('/api/payment/config'), {
        headers: { Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
      })
        .then(async r => {
          const text = await r.text();
          if (text.trim().startsWith('<')) { setPesapalLoaded(true); return; }
          const cfg = JSON.parse(text);
          if (cfg.configured) {
            setPesapal(p => ({
              ...p,
              consumer_key : cfg.consumer_key || '',
              consumer_secret: cfg.consumer_secret === '••••••••' ? p.consumer_secret : (cfg.consumer_secret || ''),
              environment  : cfg.environment || 'sandbox',
              ipn_id       : cfg.ipn_id || '',
              configured   : true,
            }));
          }
          setPesapalLoaded(true);
        })
        .catch(() => setPesapalLoaded(true));
    }
  }, [activeTab, pesapalLoaded]);

  // Load SMS config when tab opens
  useEffect(() => {
    if (activeTab === 'sms' && !smsLoaded) {
      fetch(buildApiUrl('/api/sms/config'), {
        headers: { Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
      })
        .then(async r => {
          const text = await r.text();
          if (text.trim().startsWith('<')) { setSmsLoaded(true); return; }
          const cfg = JSON.parse(text);
          setSms(s => ({ ...s, ...cfg }));
          setSmsLoaded(true);
        })
        .catch(() => setSmsLoaded(true));
    }
  }, [activeTab, smsLoaded]);

  const saveSms = async () => {
    setSmsSaving(true);
    try {
      const res = await fetch(buildApiUrl('/api/sms/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
        body: JSON.stringify(sms),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSms(s => ({ ...s, ...data }));
      toast({ title: '✅ SMS / WhatsApp settings saved' });
    } catch (err) {
      if (err.message === 'backend_offline') toast({ title: 'Server offline', variant: 'destructive' });
      else toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSmsSaving(false);
    }
  };

  const testSms = async () => {
    if (!smsTestTo) { toast({ title: 'Enter a phone number to test', variant: 'destructive' }); return; }
    setSmsTesting(true);
    try {
      const payload = { to: smsTestTo, channel: smsTestChannel };
      if (smsTestChannel === 'whatsapp' && smsTestTemplate) payload.templateEvent = smsTestTemplate;
      const res = await fetch(buildApiUrl('/api/sms/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
        body: JSON.stringify(payload),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Test failed');
      toast({ title: `✅ Test ${smsTestChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} sent!`, description: `Sent to ${smsTestTo}` });
    } catch (err) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    } finally {
      setSmsTesting(false);
    }
  };

  // Verify Twilio credentials against Twilio's Accounts API without sending a message.
  // If the user has typed a fresh Auth Token (not the bullet placeholder), pass it through
  // so they can validate BEFORE clicking Save.
  const verifyTwilio = async () => {
    setSmsVerifying(true);
    setSmsVerifyResult(null);
    try {
      const body = {
        accountSid: (sms.twilio_account_sid || '').trim(),
      };
      const typed = (sms.twilio_auth_token || '').trim();
      if (typed && typed !== '••••••••') body.authToken = typed;
      const res = await fetch(buildApiUrl('/api/sms/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
        body: JSON.stringify(body),
      });
      const data = await safeJson(res);
      if (!res.ok || !data.ok) throw new Error(data.error || 'Verification failed');
      setSmsVerifyResult({ ok: true, friendlyName: data.friendlyName, status: data.status });
      toast({ title: '✅ Twilio credentials verified', description: data.friendlyName ? `Account: ${data.friendlyName}` : 'Credentials are valid.' });
    } catch (err) {
      setSmsVerifyResult({ ok: false, error: err.message });
      toast({ title: 'Verification failed', description: err.message, variant: 'destructive' });
    } finally {
      setSmsVerifying(false);
    }
  };

  const savePesapal = async () => {
    if (!pesapal.consumer_key || !pesapal.consumer_secret) {
      toast({ title: 'Missing fields', description: 'Consumer Key and Consumer Secret are required.', variant: 'destructive' });
      return;
    }
    setPesapalSaving(true);
    try {
      const res = await fetch(buildApiUrl('/api/payment/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
        body: JSON.stringify({ consumer_key: pesapal.consumer_key, consumer_secret: pesapal.consumer_secret, environment: pesapal.environment }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast({ title: '✅ PesaPal credentials saved!' });
      setPesapalLoaded(false); // reload to pick up ipn_id after first save
    } catch (err) {
      if (err.message === 'backend_offline') {
        toast({ title: 'Server offline', description: 'Run: cd server && node server.js', variant: 'destructive' });
      } else {
        toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
      }
    } finally {
      setPesapalSaving(false);
    }
  };

  const saveSmtp = async () => {
    if (!smtp.host || !smtp.user || !smtp.pass) {
      toast({ title: 'Missing fields', description: 'Host, email address, and password are required.', variant: 'destructive' });
      return;
    }
    setSmtpSaving(true);
    try {
      const res = await fetch(buildApiUrl('/api/email/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
        body: JSON.stringify(smtp),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setServerOnline(true);
      toast({ title: '✅ SMTP settings saved!', description: 'Your email configuration has been saved successfully.' });
    } catch (err) {
      if (err.message === 'backend_offline') {
        setServerOnline(false);
        toast({ title: 'Server offline', description: 'Run: cd server && node server.js', variant: 'destructive' });
      } else {
        toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
      }
    } finally {
      setSmtpSaving(false);
    }
  };

  const testSmtp = async () => {
    setSmtpTesting(true);
    try {
      const res = await fetch(buildApiUrl('/api/email/test'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('rs_auth_token')}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Test failed');
      toast({ title: '✅ Test email sent!', description: 'Check your inbox to confirm delivery.' });
    } catch (err) {
      if (err.message === 'backend_offline') {
        setServerOnline(false);
        toast({ title: 'Server offline', description: 'Run: cd server && node server.js', variant: 'destructive' });
      } else {
        toast({ title: 'Email failed', description: err.message, variant: 'destructive' });
      }
    } finally {
      setSmtpTesting(false);
    }
  };

  useEffect(() => {
    // Load from user settings if saved
    base44.auth.me().then(me => {
      if (me?.settings) {
        try {
          const saved = JSON.parse(me.settings);
          if (saved.business) setBusiness(b => ({ ...b, ...saved.business }));
          if (saved.quoteDefaults) setQuoteDefaults(q => ({ ...q, ...saved.quoteDefaults }));
          if (saved.notifs) setNotifs(n => ({ ...n, ...saved.notifs }));
        } catch {}
      }
    }).catch(() => {});
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({ settings: JSON.stringify({ business, quoteDefaults, notifs }) });
      saveSiteConfig(siteConfig);
    },
    onSuccess: () => toast({ title: '✅ Settings saved successfully' }),
    onError: () => toast({ title: 'Failed to save settings', variant: 'destructive' }),
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setSiteConfig(c => ({ ...c, logoUrl: file_url }));
    toast({ title: '✅ Logo uploaded' });
  };

  const toggleNavItem = (role, path) => {
    setSiteConfig(c => {
      const rolePerm = c.navPermissions?.[role] ?? defaultConfig.navPermissions[role];
      // null means admin (all allowed) — treat as full list for editing
      const current = rolePerm === null
        ? ALL_ROUTES.map(r => r.path)
        : (rolePerm || []);
      const next = current.includes(path) ? current.filter(p => p !== path) : [...current, path];
      return { ...c, navPermissions: { ...c.navPermissions, [role]: next } };
    });
  };

  const tabs = [
    { id: 'business', label: t('settings_tab_business'), icon: Building2 },
    { id: 'quotes', label: t('settings_tab_quotes'), icon: FileText },
    { id: 'identity', label: t('settings_tab_identity'), icon: Image },
    { id: 'appearance', label: t('settings_tab_appearance'), icon: Palette },
    { id: 'permissions', label: t('settings_tab_permissions'), icon: Shield },
    { id: 'notifications', label: t('settings_tab_notifications'), icon: Bell },
    { id: 'email', label: 'Email / SMTP', icon: Mail },
    { id: 'sms', label: 'SMS / WhatsApp', icon: MessageSquare },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t('settings')}</h1>
          <p className="text-muted-foreground mt-1">{t('settings_subtitle')}</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Business Info */}
        {activeTab === 'business' && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-2">{t('business_info')}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">{t('company_email')}</label>
                <Input type="email" value={business.company_email} onChange={e => setBusiness(b => ({...b, company_email: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('support_phone')}</label>
                <Input value={business.support_phone} onChange={e => setBusiness(b => ({...b, support_phone: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('default_currency')}</label>
                <Input value={business.currency} onChange={e => setBusiness(b => ({...b, currency: e.target.value}))} placeholder="USD" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('timezone')}</label>
                <Input value={business.timezone} onChange={e => setBusiness(b => ({...b, timezone: e.target.value}))} placeholder="Africa/Nairobi" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">{t('business_address')}</label>
                <Textarea rows={3} value={business.business_address} onChange={e => setBusiness(b => ({...b, business_address: e.target.value}))} />
              </div>
            </div>
          </Card>
        )}

        {/* Quotes Defaults */}
        {activeTab === 'quotes' && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold mb-2">{t('settings_tab_quotes')}</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">{t('quote_validity_days')}</label>
                <Input type="number" min="1" value={quoteDefaults.validity_days} onChange={e => setQuoteDefaults(q => ({...q, validity_days: parseInt(e.target.value)}))} />
                <p className="text-xs text-muted-foreground">How many days quotes are valid before expiry</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">{t('default_payment_terms')}</label>
                <Select value={quoteDefaults.payment_terms} onValueChange={(v) => setQuoteDefaults(q => ({...q, payment_terms: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50/50">50% Deposit, 50% Balance</SelectItem>
                    <SelectItem value="30/70">30% Deposit, 70% Balance</SelectItem>
                    <SelectItem value="full">Full Payment Upfront</SelectItem>
                    <SelectItem value="flexible">Flexible Payment Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">{t('default_inclusions')}</label>
                <Textarea rows={3} value={quoteDefaults.inclusions} onChange={e => setQuoteDefaults(q => ({...q, inclusions: e.target.value}))} placeholder="e.g., Accommodation, meals, guide, park fees, transfers" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">{t('default_exclusions')}</label>
                <Textarea rows={3} value={quoteDefaults.exclusions} onChange={e => setQuoteDefaults(q => ({...q, exclusions: e.target.value}))} placeholder="e.g., International flights, travel insurance, personal expenses" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">Company About Section</label>
                <Textarea rows={3} value={quoteDefaults.company_about} onChange={e => setQuoteDefaults(q => ({...q, company_about: e.target.value}))} placeholder="Tell clients about your company..." />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-1">Company Contact Details (JSON)</label>
                <Textarea rows={3} value={quoteDefaults.company_contact} onChange={e => setQuoteDefaults(q => ({...q, company_contact: e.target.value}))} placeholder='{"email": "info@example.com", "phone": "+254..."}' className="font-mono text-xs" />
              </div>
            </div>
          </Card>
        )}

        {/* Site Identity */}
        {activeTab === 'identity' && (
          <Card className="p-6 space-y-6">
            <h2 className="text-lg font-semibold">{t('settings_tab_identity')}</h2>
            <div>
              <label className="block text-sm font-medium mb-1">App / Company Name</label>
              <Input value={siteConfig.appName} onChange={e => setSiteConfig(c => ({...c, appName: e.target.value}))} placeholder="Safari Reservations" />
              <p className="text-xs text-muted-foreground mt-1">Appears in browser title and sidebar.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Logo</label>
              <div className="flex items-center gap-4">
                {siteConfig.logoUrl ? (
                  <img src={siteConfig.logoUrl} alt="Logo" className="h-14 w-14 rounded-xl object-contain border border-border bg-muted" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-xs border border-border">No Logo</div>
                )}
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                    <Image className="w-4 h-4 mr-2" /> Upload Logo
                  </Button>
                  {siteConfig.logoUrl && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setSiteConfig(c => ({...c, logoUrl:''}))}>Remove</Button>
                  )}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Recommended: square PNG or SVG, min 128×128px.</p>
            </div>
          </Card>
        )}

        {/* Appearance */}
        {activeTab === 'appearance' && (
          <Card className="p-6 space-y-6">
            <h2 className="text-lg font-semibold">{t('accent_color')}</h2>
            <p className="text-sm text-muted-foreground">Choose the primary color used throughout the interface.</p>
            <div className="grid grid-cols-4 gap-3">
              {ACCENT_PRESETS.map(preset => {
                const isSelected = siteConfig.accentColor === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => setSiteConfig(c => ({...c, accentColor: preset.value}))}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isSelected ? 'border-foreground shadow-md' : 'border-border hover:border-muted-foreground'}`}
                  >
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ background: `hsl(${preset.value})` }}
                    />
                    <span className="text-xs font-medium">{preset.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Custom HSL Value</label>
              <div className="flex gap-3 items-center">
                <Input
                  value={siteConfig.accentColor}
                  onChange={e => setSiteConfig(c => ({...c, accentColor: e.target.value}))}
                  placeholder="137 72% 45%"
                  className="font-mono"
                />
                <div className="w-9 h-9 rounded-xl flex-shrink-0 border border-border" style={{ background: `hsl(${siteConfig.accentColor})` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Format: H S% L% (e.g. 210 100% 50%)</p>
            </div>
          </Card>
        )}

        {/* Nav Permissions */}
        {activeTab === 'permissions' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-1">{t('nav_permissions')}</h2>
            <p className="text-sm text-muted-foreground mb-4">Control which pages are visible for each user role.</p>

            <div className="flex gap-2 mb-5 flex-wrap">
              {ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${selectedRole === role ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  {role}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_ROUTES.map(route => {
                const rolePerm = siteConfig.navPermissions?.[selectedRole] ?? defaultConfig.navPermissions[selectedRole];
                // null = admin unrestricted → all enabled
                const perms = rolePerm === null ? ALL_ROUTES.map(r => r.path) : (rolePerm || []);
                const enabled = perms.includes(route.path);
                return (
                  <label key={route.path} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${enabled ? 'border-primary/40 bg-primary/5' : 'border-border bg-transparent'}`}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => toggleNavItem(selectedRole, route.path)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm">{route.label}</span>
                  </label>
                );
              })}
            </div>
          </Card>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('settings_tab_notifications')}</h2>
            {[
              { key: 'booking_confirmation_email', label: 'Booking Confirmations', desc: 'Send email when bookings are confirmed' },
              { key: 'payment_reminder_email', label: 'Payment Reminders', desc: 'Send payment reminder emails to clients' },
              { key: 'weekly_report_email', label: 'Weekly Reports', desc: 'Receive weekly summary reports' },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  checked={notifs[item.key]}
                  onChange={e => setNotifs(n => ({...n, [item.key]: e.target.checked}))}
                  className="w-4 h-4 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </label>
            ))}
          </Card>
        )}

        {/* Email / SMTP */}
        {activeTab === 'email' && (
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Email / SMTP Configuration</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure your outgoing email server so admins can send invoices, quotes, and invitations by email.</p>
            </div>

            {/* Server status banner */}
            {serverOnline === false && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
                <div>
                  <p className="font-semibold">Backend server is not running</p>
                  <p className="mt-1">Settings cannot be saved until the server is started. Open a terminal and run:</p>
                  <code className="block mt-2 bg-red-100 px-3 py-2 rounded font-mono text-xs">cd C:\Users\USER\Downloads\reservation-safari\server &amp;&amp; node server.js</code>
                  <p className="mt-2 text-xs text-red-600">Once started, come back to this tab and re-enter your credentials.</p>
                </div>
              </div>
            )}
            {serverOnline === true && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Backend server is online — settings will save correctly.
              </div>
            )}

            {/* Section: SMTP */}
            <div className="border border-border rounded-lg p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">SMTP Server</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">SMTP Host *</label>
                  <Input placeholder="e.g. smtp.gmail.com" value={smtp.host} onChange={e => setSmtp(s => ({ ...s, host: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">Gmail: smtp.gmail.com · Outlook: smtp.office365.com</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Port *</label>
                  <Input type="number" placeholder="587" value={smtp.port} onChange={e => setSmtp(s => ({ ...s, port: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">587 (TLS) or 465 (SSL)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sender Name</label>
                  <Input placeholder="Reservation Safari" value={smtp.sender_name} onChange={e => setSmtp(s => ({ ...s, sender_name: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Email Address (Login) *</label>
                  <Input type="email" placeholder="your@email.com" value={smtp.user} onChange={e => setSmtp(s => ({ ...s, user: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Password / App Password *</label>
                  <Input type="password" placeholder="••••••••••••" value={smtp.pass} onChange={e => setSmtp(s => ({ ...s, pass: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">Gmail requires an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline text-primary">App Password</a> (needs 2FA enabled).</p>
                </div>
              </div>
            </div>

            {/* Section: Company info shown in emails */}
            <div className="border border-border rounded-lg p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company Info (shown in all emails)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Company Email</label>
                  <Input type="email" placeholder="info@yourcompany.com" value={smtp.company_email} onChange={e => setSmtp(s => ({ ...s, company_email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Company Phone</label>
                  <Input placeholder="+254 700 000 000" value={smtp.company_phone} onChange={e => setSmtp(s => ({ ...s, company_phone: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Company Address</label>
                  <Input placeholder="Nairobi, Kenya" value={smtp.company_address} onChange={e => setSmtp(s => ({ ...s, company_address: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Logo URL</label>
                  <Input placeholder="https://yoursite.com/logo.png" value={smtp.logo_url} onChange={e => setSmtp(s => ({ ...s, logo_url: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">Must be a public URL. Will appear at the top of every email.</p>
                  {smtp.logo_url && <img src={smtp.logo_url} alt="Logo preview" className="mt-2 h-12 object-contain rounded border border-border" />}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Email Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={smtp.accent_color || '#16a34a'} onChange={e => setSmtp(s => ({ ...s, accent_color: e.target.value }))} className="h-9 w-16 rounded border border-border cursor-pointer" />
                    <Input placeholder="#16a34a" value={smtp.accent_color} onChange={e => setSmtp(s => ({ ...s, accent_color: e.target.value }))} className="w-36" />
                    <span className="text-xs text-muted-foreground">Used for email header background</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Payment link */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment Link</p>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Page URL</label>
                <Input placeholder="https://pay.yoursite.com or PayPal/Stripe link" value={smtp.payment_link} onChange={e => setSmtp(s => ({ ...s, payment_link: e.target.value }))} />
                <p className="text-xs text-muted-foreground mt-1">A "Pay Now" button will appear in invoices, quotes, and booking confirmation emails when this is set.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={saveSmtp} disabled={smtpSaving} className="gap-2">
                <Save className="w-4 h-4" /> {smtpSaving ? 'Saving…' : 'Save Email Settings'}
              </Button>
              <Button variant="outline" onClick={testSmtp} disabled={smtpTesting} className="gap-2">
                <Mail className="w-4 h-4" /> {smtpTesting ? 'Sending…' : 'Send Test Email'}
              </Button>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <strong>Quick Setup Tips</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Gmail: Enable 2-Step Verification → create App Password at myaccount.google.com/apppasswords</li>
                <li>Outlook / Office 365: Use regular email + password, port 587</li>
                <li>Click "Send Test Email" after saving to confirm it works</li>
              </ul>
            </div>
          </Card>
        )}

        {/* SMS / WhatsApp */}
        {activeTab === 'sms' && (
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> SMS / WhatsApp Notifications
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Send booking confirmations, payment receipts and trip reminders straight to clients' phones via SMS or WhatsApp. Configure your provider below, then enable per-event triggers in <strong>Automations</strong>.
              </p>
            </div>

            {/* Channel toggles */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-between gap-3 border border-border rounded-lg p-4 cursor-pointer hover:bg-accent/30">
                <div>
                  <p className="font-medium text-sm">SMS channel</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Allow automations to send SMS</p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-primary"
                  checked={!!sms.sms_enabled}
                  onChange={e => setSms(s => ({ ...s, sms_enabled: e.target.checked }))}
                />
              </label>
              <label className="flex items-center justify-between gap-3 border border-border rounded-lg p-4 cursor-pointer hover:bg-accent/30">
                <div>
                  <p className="font-medium text-sm">WhatsApp channel</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Allow automations to send WhatsApp (Twilio only)</p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-primary"
                  checked={!!sms.whatsapp_enabled}
                  onChange={e => setSms(s => ({ ...s, whatsapp_enabled: e.target.checked }))}
                />
              </label>
            </div>

            {/* Provider selector */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Provider</p>
              <Select value={sms.provider} onValueChange={v => setSms(s => ({ ...s, provider: v }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio (SMS + WhatsApp, worldwide)</SelectItem>
                  <SelectItem value="africastalking">Africa's Talking (SMS, East Africa)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {sms.provider === 'twilio'
                  ? 'Twilio supports both SMS and WhatsApp. WhatsApp requires an approved sender or sandbox number.'
                  : 'Africa\'s Talking supports SMS only. Best for Kenya/Tanzania/Uganda safari operators.'}
              </p>
            </div>

            {/* Twilio credentials */}
            {sms.provider === 'twilio' && (
              <div className="border border-border rounded-lg p-4 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Twilio Credentials</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Account SID *</label>
                    <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={sms.twilio_account_sid} onChange={e => { setSmsVerifyResult(null); setSms(s => ({ ...s, twilio_account_sid: e.target.value.trim() })); }} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Auth Token *</label>
                    <Input type="password" placeholder="32-char hex token from Twilio Console" value={sms.twilio_auth_token} onFocus={e => { if (e.target.value === '••••••••') setSms(s => ({ ...s, twilio_auth_token: '' })); }} onChange={e => { setSmsVerifyResult(null); setSms(s => ({ ...s, twilio_auth_token: e.target.value.trim() })); }} />
                    <p className="text-xs text-muted-foreground mt-1">Find both at <a href="https://console.twilio.com/" target="_blank" rel="noreferrer" className="underline text-primary">console.twilio.com</a></p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">SMS Sender Number</label>
                    <Input placeholder="+15551234567" value={sms.twilio_from} onChange={e => setSms(s => ({ ...s, twilio_from: e.target.value }))} />
                    <p className="text-xs text-muted-foreground mt-1">Your Twilio phone number (E.164 format)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">WhatsApp Sender</label>
                    <Input placeholder="+14155238886" value={sms.twilio_whatsapp_from} onChange={e => setSms(s => ({ ...s, twilio_whatsapp_from: e.target.value }))} />
                    <p className="text-xs text-muted-foreground mt-1">Sandbox: +14155238886. Production: your approved number.</p>
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Approved Templates (Twilio Content API) — production cold-sends */}
            {sms.provider === 'twilio' && (
              <div className="border border-border rounded-lg p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">WhatsApp Approved Templates (Production)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional. Paste a Twilio Content SID (<code className="text-[11px]">HX…</code>) for each event to use a Meta-approved template. Required for first-contact / &gt;24h sends in production. Leave blank to use freeform body (sandbox / in-session only). Create templates at <a href="https://console.twilio.com/us1/develop/sms/content-template-builder" target="_blank" rel="noreferrer" className="underline text-primary">Twilio Content Template Builder</a>.
                  </p>
                </div>
                {[
                  { key: 'booking_received',  label: 'Booking Received',  vars: '{{1}} client · {{2}} ref · {{3}} package · {{4}} start date · {{5}} guests' },
                  { key: 'booking_confirmed', label: 'Booking Confirmed', vars: '{{1}} client · {{2}} ref · {{3}} package · {{4}} start date · {{5}} end date' },
                  { key: 'payment_receipt',   label: 'Payment Receipt',   vars: '{{1}} client · {{2}} amount · {{3}} payment ref' },
                  { key: 'upcoming_reminder', label: 'Upcoming Trip (7d)',vars: '{{1}} client · {{2}} package · {{3}} start date' },
                ].map(t => (
                  <div key={t.key}>
                    <label className="block text-sm font-medium mb-1">{t.label}</label>
                    <Input
                      placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={sms.wa_templates?.[t.key] || ''}
                      onChange={e => setSms(s => ({ ...s, wa_templates: { ...(s.wa_templates || {}), [t.key]: e.target.value.trim() } }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Template vars: {t.vars}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Africa's Talking credentials */}
            {sms.provider === 'africastalking' && (
              <div className="border border-border rounded-lg p-4 space-y-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Africa's Talking Credentials</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Username *</label>
                    <Input placeholder="sandbox or your username" value={sms.at_username} onChange={e => setSms(s => ({ ...s, at_username: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Sender ID (optional)</label>
                    <Input placeholder="SAFARI" value={sms.at_sender_id} onChange={e => setSms(s => ({ ...s, at_sender_id: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">API Key *</label>
                    <Input type="password" placeholder="••••••••" value={sms.at_api_key} onChange={e => setSms(s => ({ ...s, at_api_key: e.target.value }))} />
                    <p className="text-xs text-muted-foreground mt-1">Generate at <a href="https://account.africastalking.com/" target="_blank" rel="noreferrer" className="underline text-primary">account.africastalking.com</a></p>
                  </div>
                </div>
              </div>
            )}

            {/* Save & Verify */}
            <div className="flex flex-wrap gap-3 pt-1">
              <Button onClick={saveSms} disabled={smsSaving} className="gap-2">
                <Save className="w-4 h-4" /> {smsSaving ? 'Saving…' : 'Save Settings'}
              </Button>
              {sms.provider === 'twilio' && (
                <Button type="button" variant="outline" onClick={verifyTwilio} disabled={smsVerifying} className="gap-2">
                  {smsVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {smsVerifying ? 'Verifying…' : 'Verify Twilio Credentials'}
                </Button>
              )}
            </div>
            {smsVerifyResult && (
              <div className={`rounded-lg border p-3 text-sm flex items-start gap-2 ${smsVerifyResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>
                {smsVerifyResult.ok
                  ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <div>
                  {smsVerifyResult.ok ? (
                    <>
                      <strong>Credentials valid.</strong>{' '}
                      Account: <code className="text-xs">{smsVerifyResult.friendlyName || '(no name)'}</code>
                      {smsVerifyResult.status && <> — status: <code className="text-xs">{smsVerifyResult.status}</code></>}
                    </>
                  ) : (
                    <><strong>Invalid credentials.</strong> {smsVerifyResult.error}</>
                  )}
                </div>
              </div>
            )}

            {/* Test sender */}
            <div className="border border-dashed border-border rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Send className="w-3.5 h-3.5" /> Send Test Message
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    placeholder="+254712345678"
                    value={smsTestTo}
                    onChange={e => setSmsTestTo(e.target.value)}
                  />
                </div>
                <Select value={smsTestChannel} onValueChange={setSmsTestChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {smsTestChannel === 'whatsapp' && sms.provider === 'twilio' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Template (optional)</label>
                  <Select value={smsTestTemplate || 'freeform'} onValueChange={v => setSmsTestTemplate(v === 'freeform' ? '' : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freeform">Freeform body (sandbox / in-session)</SelectItem>
                      <SelectItem value="booking_received">Template — Booking Received</SelectItem>
                      <SelectItem value="booking_confirmed">Template — Booking Confirmed</SelectItem>
                      <SelectItem value="payment_receipt">Template — Payment Receipt</SelectItem>
                      <SelectItem value="upcoming_reminder">Template — Upcoming Trip</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">Pick a template to test production cold-send with sample data. Needs a ContentSid configured above.</p>
                </div>
              )}
              <Button variant="outline" onClick={testSms} disabled={smsTesting} className="gap-2">
                <Send className="w-4 h-4" /> {smsTesting ? 'Sending…' : `Send Test ${smsTestChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`}
              </Button>
              <p className="text-xs text-muted-foreground">
                Save your settings first, then send a test message to your own phone to verify delivery.
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              <strong>Setup tips</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Phone numbers should include the country code (e.g. +254 for Kenya). The system normalises common formats.</li>
                <li>Twilio WhatsApp sandbox: have testers send <code>join &lt;your-keyword&gt;</code> to your sandbox number first.</li>
                <li>Bookings without a phone number on the linked Client will be silently skipped (logged in Automations).</li>
                <li>SMS messages are kept short (≤320 chars) to stay within standard SMS billing.</li>
              </ul>
            </div>
          </Card>
        )}

        {/* Payments — PesaPal */}
        {activeTab === 'payments' && (
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold">PesaPal Payment Gateway</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Connect PesaPal to generate unique payment links per invoice. Clients can pay online via M-Pesa, cards, and more.
              </p>
            </div>

            {/* Environment */}
            <div className="border border-border rounded-lg p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Environment</p>
              <div className="flex gap-3">
                {['sandbox', 'production'].map(env => (
                  <button
                    key={env}
                    onClick={() => setPesapal(p => ({ ...p, environment: env, ipn_id: '' }))}
                    className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${pesapal.environment === env ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
                  >
                    {env === 'sandbox' ? '🧪 Sandbox (Testing)' : '🚀 Production (Live)'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {pesapal.environment === 'sandbox'
                  ? 'Use sandbox credentials from developer.pesapal.com to test without real payments.'
                  : 'Use live credentials from your PesaPal merchant account. Real payments will be processed.'}
              </p>
            </div>

            {/* Credentials */}
            <div className="border border-border rounded-lg p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">API Credentials</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Consumer Key *</label>
                  <Input
                    value={pesapal.consumer_key}
                    onChange={e => setPesapal(p => ({ ...p, consumer_key: e.target.value }))}
                    placeholder="qkio1BGGYAXTu2JOfm7XSXNruoZsrqEW"
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Consumer Secret *</label>
                  <Input
                    type="password"
                    value={pesapal.consumer_secret}
                    onChange={e => setPesapal(p => ({ ...p, consumer_secret: e.target.value }))}
                    placeholder="••••••••••••••••"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API credentials from{' '}
                <span className="text-primary">developer.pesapal.com</span>{' '}
                → Applications → {pesapal.environment === 'production' ? 'Live API' : 'Demo API'}
              </p>
            </div>

            {/* Callback URL (read-only) */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">IPN Callback URL</p>
              <div className="flex items-center gap-2">
                <Input value={pesapalCallbackUrl} readOnly className="font-mono text-xs bg-muted" />
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(pesapalCallbackUrl);
                  toast({ title: 'Copied to clipboard' });
                }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This URL is auto-registered with PesaPal when you first generate a payment link. You may also add it manually in your PesaPal dashboard → IPN Settings.
              </p>
              {pesapal.ipn_id && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                  IPN registered: <span className="font-mono">{pesapal.ipn_id}</span>
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <Button onClick={savePesapal} disabled={pesapalSaving} className="gap-2">
                <Save className="w-4 h-4" />
                {pesapalSaving ? 'Saving…' : 'Save PesaPal Settings'}
              </Button>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-1">
              <strong>How it works</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                <li>Open any Invoice and click <strong>Generate Payment Link</strong> to create a PesaPal checkout URL</li>
                <li>The link is automatically included in invoice emails sent to clients</li>
                <li>When the client pays, PesaPal calls the IPN callback and the invoice is marked <strong>Paid</strong> automatically</li>
              </ul>
            </div>
          </Card>
        )}

        {/* Save (only show for non-email and non-payments tabs) */}
        {activeTab !== 'email' && activeTab !== 'payments' && (
          <div className="flex gap-3 justify-end mt-6">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
              <Save className="w-4 h-4" /> {t('save_all_settings')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}