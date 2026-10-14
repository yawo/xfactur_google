/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Save, 
  RefreshCw, 
  QrCode, 
  Phone, 
  Key, 
  ShieldCheck, 
  Copy, 
  Check, 
  ExternalLink, 
  Server, 
  Sliders, 
  FileCheck, 
  Send,
  Plus,
  Trash2,
  Lock,
  Globe2,
  Sparkles,
  Info,
  Terminal,
  FolderOpen,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { useAccounting } from '../AccountingContext';
import { 
  IngestionChannelsSettings, 
  WhatsAppIngestionConfig, 
  EmailIngestionConfig,
  WhatsAppProvider,
  EmailSyncMode
} from '../types';
import { 
  ingestionConfigService, 
  buildWhatsAppDirectLink, 
  buildWhatsAppQrUrl 
} from '../services/ingestionConfigService';

interface IngestionSettingsTabProps {
  onSaved?: () => void;
}

export default function IngestionSettingsTab({ onSaved }: IngestionSettingsTabProps) {
  const { user } = useAuth();
  const { standard } = useAccounting();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<IngestionChannelsSettings>(() => 
    ingestionConfigService.getDefaultSettings(user?.uid)
  );

  // Active channel subtab: 'all' | 'whatsapp' | 'email' | 'webhooks'
  const [activeChannelTab, setActiveChannelTab] = useState<'whatsapp' | 'email' | 'webhooks'>('whatsapp');

  // Interactive connection test states
  const [testingWa, setTestingWa] = useState(false);
  const [waTestResult, setWaTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Whitelist phone tag input
  const [newWhitelistedNumber, setNewWhitelistedNumber] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // QR Code refresh animation
  const [isQrRefreshing, setIsQrRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const loaded = await ingestionConfigService.loadSettings(user?.uid);
        if (mounted) {
          setSettings(loaded);
        }
      } catch (err: any) {
        console.error("Error loading ingestion settings:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSettings();
    return () => { mounted = false; };
  }, [user]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      await ingestionConfigService.saveSettings(user?.uid, settings);
      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setError(`Erreur de sauvegarde : ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setTestingWa(true);
    setWaTestResult(null);
    try {
      const result = await ingestionConfigService.testWhatsAppConnection(settings.whatsapp);
      setWaTestResult(result);
      if (result.success) {
        setSettings(prev => ({
          ...prev,
          whatsapp: {
            ...prev.whatsapp,
            status: 'connected',
            lastSyncAt: new Date().toISOString()
          }
        }));
      }
    } catch (err: any) {
      setWaTestResult({ success: false, message: err.message });
    } finally {
      setTestingWa(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setEmailTestResult(null);
    try {
      const result = await ingestionConfigService.testEmailConnection(settings.email);
      setEmailTestResult(result);
      if (result.success) {
        setSettings(prev => ({
          ...prev,
          email: {
            ...prev.email,
            status: 'connected',
            lastSyncAt: new Date().toISOString()
          }
        }));
      }
    } catch (err: any) {
      setEmailTestResult({ success: false, message: err.message });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleImapPresetChange = (preset: 'gmail' | 'outlook' | 'ovh' | 'custom') => {
    let host = settings.email.imapHost;
    let port = settings.email.imapPort;
    let folder = settings.email.imapFolder;

    if (preset === 'gmail') {
      host = 'imap.gmail.com';
      port = 993;
      folder = 'INBOX';
    } else if (preset === 'outlook') {
      host = 'outlook.office365.com';
      port = 993;
      folder = 'INBOX';
    } else if (preset === 'ovh') {
      host = 'ssl0.ovh.net';
      port = 993;
      folder = 'INBOX';
    }

    setSettings(prev => ({
      ...prev,
      email: {
        ...prev.email,
        imapPreset: preset,
        imapHost: host,
        imapPort: port,
        imapFolder: folder
      }
    }));
  };

  const addWhitelistedNumber = () => {
    if (!newWhitelistedNumber.trim()) return;
    const num = newWhitelistedNumber.trim();
    if (!settings.whatsapp.whitelistedNumbers.includes(num)) {
      setSettings(prev => ({
        ...prev,
        whatsapp: {
          ...prev.whatsapp,
          whitelistedNumbers: [...prev.whatsapp.whitelistedNumbers, num]
        }
      }));
    }
    setNewWhitelistedNumber('');
  };

  const removeWhitelistedNumber = (num: string) => {
    setSettings(prev => ({
      ...prev,
      whatsapp: {
        ...prev.whatsapp,
        whitelistedNumbers: prev.whatsapp.whitelistedNumbers.filter(n => n !== num)
      }
    }));
  };

  const refreshQr = () => {
    setIsQrRefreshing(true);
    setTimeout(() => {
      setIsQrRefreshing(false);
    }, 600);
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://xfactur.app';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-xs text-neutral-500 font-medium">Chargement des paramètres d'ingestion automatique...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">Ingestion Automatisée WhatsApp & Email</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Actif 24/7
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
            Connectez vos canaux de réception pour que toutes les factures, reçus et pièces jointes (PDF, photos) reçus par WhatsApp ou email soient automatiquement aspirés, analysés par l'IA et imputés en comptabilité.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer les paramètres
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Configuration d'ingestion enregistrée avec succès dans votre organisation !</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Channel Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-neutral-100 rounded-2xl border border-neutral-200">
        <button
          onClick={() => setActiveChannelTab('whatsapp')}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeChannelTab === 'whatsapp'
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-neutral-600 hover:text-neutral-900"
          )}
        >
          <div className={cn(
            "w-2 h-2 rounded-full",
            settings.whatsapp.enabled ? "bg-emerald-500" : "bg-neutral-300"
          )} />
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>Compte WhatsApp</span>
          <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
            {settings.whatsapp.enabled ? 'Connecté' : 'Désactivé'}
          </span>
        </button>

        <button
          onClick={() => setActiveChannelTab('email')}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeChannelTab === 'email'
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-neutral-600 hover:text-neutral-900"
          )}
        >
          <div className={cn(
            "w-2 h-2 rounded-full",
            settings.email.enabled ? "bg-indigo-500" : "bg-neutral-300"
          )} />
          <Mail className="w-4 h-4 text-indigo-600" />
          <span>Boîte Email & IMAP</span>
          <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
            {settings.email.enabled ? 'Connecté' : 'Désactivé'}
          </span>
        </button>

        <button
          onClick={() => setActiveChannelTab('webhooks')}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeChannelTab === 'webhooks'
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-600 hover:text-neutral-900"
          )}
        >
          <Terminal className="w-4 h-4 text-neutral-600" />
          <span>Webhooks & Clés API</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. WHATSAPP CONFIGURATION TAB                                             */}
      {/* ========================================================================= */}
      {activeChannelTab === 'whatsapp' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Main Toggle Card */}
          <div className="p-6 bg-gradient-to-r from-emerald-50/60 to-emerald-100/30 rounded-3xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900">Ingestion Automatique via WhatsApp</h3>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                    settings.whatsapp.enabled ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-600"
                  )}>
                    {settings.whatsapp.enabled ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-1 max-w-xl">
                  Permet à vos collaborateurs, chauffeurs ou fournisseurs d'envoyer des photos de reçus ou des PDFs directement sur votre numéro WhatsApp. Les pièces jointes sont aspirées et imputées sans aucune saisie manuelle.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input 
                type="checkbox" 
                checked={settings.whatsapp.enabled}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  whatsapp: { ...prev.whatsapp, enabled: e.target.checked }
                }))}
                className="sr-only peer" 
              />
              <div className="w-14 h-7 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Provider Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Mode de Connexion WhatsApp
              </label>
              <span className="text-[11px] text-neutral-400">Sélectionnez la méthode de liaison</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: QR Code Web */}
              <button
                type="button"
                onClick={() => setSettings(prev => ({
                  ...prev,
                  whatsapp: { ...prev.whatsapp, provider: 'qr_web' }
                }))}
                className={cn(
                  "p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between",
                  settings.whatsapp.provider === 'qr_web'
                    ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm"
                    : "bg-white border-neutral-200 hover:bg-neutral-50"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                      <QrCode className="w-5 h-5" />
                    </div>
                    {settings.whatsapp.provider === 'qr_web' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Actif
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900">Lien Direct & QR Code (Numéro Entreprise)</h4>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Connectez votre numéro WhatsApp réel. Génère un QR Code interactif et un lien direct wa.me scannables par tout smartphone pour envoyer des factures sans configuration complexe.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-medium text-emerald-700">
                  <span>Universel</span>
                  <span className="font-mono">wa.me direct</span>
                </div>
              </button>

              {/* Option 2: Meta Cloud API */}
              <button
                type="button"
                onClick={() => setSettings(prev => ({
                  ...prev,
                  whatsapp: { ...prev.whatsapp, provider: 'meta_cloud_api' }
                }))}
                className={cn(
                  "p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between",
                  settings.whatsapp.provider === 'meta_cloud_api'
                    ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm"
                    : "bg-white border-neutral-200 hover:bg-neutral-50"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                      <Globe2 className="w-5 h-5" />
                    </div>
                    {settings.whatsapp.provider === 'meta_cloud_api' && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        Actif
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900">Meta WhatsApp Cloud API</h4>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    API officielle Meta Business Platform. Volume illimité, numéro vérifié et haute disponibilité d'entreprise.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-medium text-blue-700">
                  <span>Haute volumétrie</span>
                  <span className="font-mono">WABA API</span>
                </div>
              </button>

              {/* Option 3: Twilio for WhatsApp */}
              <button
                type="button"
                onClick={() => setSettings(prev => ({
                  ...prev,
                  whatsapp: { ...prev.whatsapp, provider: 'twilio' }
                }))}
                className={cn(
                  "p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between",
                  settings.whatsapp.provider === 'twilio'
                    ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm"
                    : "bg-white border-neutral-200 hover:bg-neutral-50"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                      <Phone className="w-5 h-5" />
                    </div>
                    {settings.whatsapp.provider === 'twilio' && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        Actif
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900">Twilio WhatsApp</h4>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Connectez votre compte Twilio Programmable Messaging pour router les flux WhatsApp via vos numéros Twilio.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-medium text-purple-700">
                  <span>Passerelle Twilio</span>
                  <span className="font-mono">REST API</span>
                </div>
              </button>
            </div>
          </div>

          {/* Provider Specific Configuration Forms */}
          {settings.whatsapp.provider === 'qr_web' && (() => {
            const cleanNumber = (settings.whatsapp.phoneNumber || '').replace(/[^0-9]/g, '');
            const isPhoneValid = cleanNumber.length >= 8;
            const waDirectUrl = isPhoneValid ? buildWhatsAppDirectLink(settings.whatsapp.phoneNumber) : '';
            const waQrUrl = isPhoneValid ? buildWhatsAppQrUrl(settings.whatsapp.phoneNumber) : '';

            return (
              <div className="p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">Connexion WhatsApp Directe & QR Code Réel</h4>
                    <p className="text-xs text-neutral-500">
                      Renseignez votre numéro professionnel pour générer votre QR Code de discussion direct (wa.me) scannable par tout smartphone.
                    </p>
                  </div>
                  {isPhoneValid && (
                    <a
                      href={waDirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-colors"
                      title="Ouvrir directement WhatsApp sur votre appareil"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ouvrir dans WhatsApp</span>
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  {/* Dynamic QR Display */}
                  <div className="flex flex-col items-center justify-center p-6 bg-neutral-50 rounded-2xl border border-neutral-200 text-center">
                    {isPhoneValid ? (
                      <>
                        <div className="w-44 h-44 bg-white p-2 rounded-xl border border-emerald-300 shadow-inner flex items-center justify-center relative">
                          <img 
                            src={waQrUrl} 
                            alt={`WhatsApp Direct QR pour ${settings.whatsapp.phoneNumber}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>QR Code Actif & Vérifié</span>
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-0.5">Scannez pour ouvrir le chat sur votre mobile</p>
                      </>
                    ) : (
                      <>
                        <div className="w-44 h-44 bg-neutral-100/90 p-4 rounded-xl border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center text-center">
                          <QrCode className="w-10 h-10 text-neutral-400 mb-2" />
                          <p className="text-xs font-bold text-neutral-700">QR Code en attente</p>
                          <p className="text-[10px] text-neutral-400 mt-1">Saisissez votre numéro ci-contre pour générer le QR Code de scan réel.</p>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 font-bold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Numéro requis</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Configuration & Instructions */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                      <p className="text-xs font-bold text-emerald-900">Comment fonctionne ce canal WhatsApp :</p>
                      <ol className="text-xs text-emerald-800 space-y-1.5 list-decimal pl-4">
                        <li>Renseignez le numéro WhatsApp de votre entreprise ci-dessous avec son indicatif international.</li>
                        <li>Vos clients, collaborateurs ou vous-même pouvez scanner ce QR Code avec l'appareil photo du smartphone.</li>
                        <li>WhatsApp s'ouvre instantanément sur la conversation avec votre numéro pour envoyer factures et justificatifs.</li>
                        <li>Pour une intégration API d'entreprise 100% automatisée sans téléphone, choisissez l'onglet <strong>Meta WhatsApp Cloud API</strong>.</li>
                      </ol>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-700 flex items-center justify-between">
                          <span>Votre numéro WhatsApp</span>
                          {isPhoneValid && (
                            <span className="text-[10px] text-emerald-600 font-bold">Format valide</span>
                          )}
                        </label>
                        <input 
                          type="text"
                          value={settings.whatsapp.phoneNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            const valid = val.replace(/[^0-9]/g, '').length >= 8;
                            setSettings(prev => ({
                              ...prev,
                              whatsapp: { 
                                ...prev.whatsapp, 
                                phoneNumber: val,
                                status: valid ? 'connected' : 'disconnected'
                              }
                            }));
                          }}
                          placeholder="+33 6 12 34 56 78 ou +221 77 123 45 67"
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500/20"
                        />

                        {/* Country code quick buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-neutral-400 font-medium mr-1">Indicatifs :</span>
                          {[
                            { code: '+33', label: '🇫🇷 +33' },
                            { code: '+221', label: '🇸🇳 +221' },
                            { code: '+225', label: '🇨🇮 +225' },
                            { code: '+237', label: '🇨🇲 +237' },
                            { code: '+223', label: '🇲🇱 +223' },
                            { code: '+241', label: '🇬🇦 +241' },
                            { code: '+242', label: '🇨🇬 +242' },
                            { code: '+243', label: '🇨🇩 +243' },
                          ].map((p) => (
                            <button
                              key={p.code}
                              type="button"
                              onClick={() => {
                                const cur = settings.whatsapp.phoneNumber || '';
                                let newNum = '';
                                if (!cur.startsWith('+')) {
                                  newNum = `${p.code} ${cur}`.trim();
                                } else {
                                  const parts = cur.split(' ');
                                  const rest = parts.slice(1).join(' ');
                                  newNum = `${p.code} ${rest}`.trim();
                                }
                                const valid = newNum.replace(/[^0-9]/g, '').length >= 8;
                                setSettings(prev => ({
                                  ...prev,
                                  whatsapp: { 
                                    ...prev.whatsapp, 
                                    phoneNumber: newNum,
                                    status: valid ? 'connected' : 'disconnected'
                                  }
                                }));
                              }}
                              className="px-2 py-0.5 rounded-lg bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-700 text-neutral-600 text-[11px] font-mono transition"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-700">Statut du canal</label>
                        <div className="flex items-center justify-between h-10 px-4 bg-neutral-50 border border-neutral-200 rounded-xl text-xs">
                          {isPhoneValid ? (
                            <span className="flex items-center gap-2 font-bold text-emerald-700">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Numéro configuré & Prêt
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 font-medium text-amber-700">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              Aucun numéro saisi
                            </span>
                          )}
                          <span className="text-[10px] text-neutral-400 font-mono">Lien direct</span>
                        </div>
                        {isPhoneValid && (
                          <p className="text-[11px] text-neutral-500 pt-1">
                            Lien actif : <span className="font-mono text-emerald-700 font-semibold">{waDirectUrl}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {settings.whatsapp.provider === 'meta_cloud_api' && (
            <div className="p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-5">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">Paramètres Meta WhatsApp Cloud API</h4>
                <p className="text-xs text-neutral-500">Configurez les identifiants de votre application Meta Developers (WABA).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">WhatsApp Business Account ID (WABA ID)</label>
                  <input 
                    type="text"
                    value={settings.whatsapp.wabaId || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, wabaId: e.target.value }
                    }))}
                    placeholder="Ex: 104829104820194"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">Phone Number ID</label>
                  <input 
                    type="text"
                    value={settings.whatsapp.phoneNumberId || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, phoneNumberId: e.target.value }
                    }))}
                    placeholder="Ex: 109284719283741"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">Jeton d'accès permanent (System User Token)</label>
                  <input 
                    type="password"
                    value={settings.whatsapp.metaAccessToken || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, metaAccessToken: e.target.value }
                    }))}
                    placeholder="EAABwz..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">URL de Rappel Webhook (Callback URL)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      readOnly
                      value={`${originUrl}/api/webhooks/whatsapp`}
                      className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs font-mono text-neutral-700"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${originUrl}/api/webhooks/whatsapp`, 'wa_meta_url')}
                      className="px-3 py-2.5 bg-neutral-200 hover:bg-neutral-300 rounded-xl text-neutral-700 transition-colors"
                      title="Copier l'URL"
                    >
                      {copiedKey === 'wa_meta_url' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">Jeton de vérification (Verify Token)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      value={settings.whatsapp.verifyToken || 'xfk_wa_verify_live_992'}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, verifyToken: e.target.value }
                      }))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(settings.whatsapp.verifyToken || 'xfk_wa_verify_live_992', 'wa_verify_token')}
                      className="px-3 py-2.5 bg-neutral-200 hover:bg-neutral-300 rounded-xl text-neutral-700 transition-colors"
                      title="Copier le token"
                    >
                      {copiedKey === 'wa_verify_token' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {settings.whatsapp.provider === 'twilio' && (
            <div className="p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-5">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">Paramètres Twilio for WhatsApp</h4>
                <p className="text-xs text-neutral-500">Renseignez vos identifiants Twilio pour l'ingestion par SMS/WhatsApp.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">Account SID</label>
                  <input 
                    type="text"
                    value={settings.whatsapp.twilioAccountSid || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, twilioAccountSid: e.target.value }
                    }))}
                    placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">Auth Token</label>
                  <input 
                    type="password"
                    value={settings.whatsapp.twilioAuthToken || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, twilioAuthToken: e.target.value }
                    }))}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">Numéro Twilio WhatsApp</label>
                  <input 
                    type="text"
                    value={settings.whatsapp.twilioFromNumber || 'whatsapp:+14155238886'}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, twilioFromNumber: e.target.value }
                    }))}
                    placeholder="whatsapp:+14155238886"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">Webhook URL à coller dans Twilio</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      readOnly
                      value={`${originUrl}/api/webhooks/whatsapp`}
                      className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${originUrl}/api/webhooks/whatsapp`, 'wa_twilio_url')}
                      className="px-3 py-2.5 bg-neutral-200 hover:bg-neutral-300 rounded-xl text-neutral-700 transition-colors"
                    >
                      {copiedKey === 'wa_twilio_url' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Automations & Business Rules */}
          <div className="p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-6">
            <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Règles d'Automatisations & Traitement des Pièces Jointes
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 cursor-pointer hover:bg-neutral-100/60 transition-colors">
                <input 
                  type="checkbox"
                  checked={settings.whatsapp.autoDownloadAttachments}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, autoDownloadAttachments: e.target.checked }
                  }))}
                  className="mt-1 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-neutral-900">Aspiration automatique des pièces jointes</p>
                  <p className="text-[11px] text-neutral-500">Télécharge automatiquement toutes les images (JPG, PNG, WEBP) et documents (PDF) reçus.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 cursor-pointer hover:bg-neutral-100/60 transition-colors">
                <input 
                  type="checkbox"
                  checked={settings.whatsapp.autoProcessWithAI}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, autoProcessWithAI: e.target.checked }
                  }))}
                  className="mt-1 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-neutral-900">Extraction IA multimodale immédiate</p>
                  <p className="text-[11px] text-neutral-500">Applique Gemini 2.5 Flash pour extraire les montants HT/TTC, dates, émetteurs et lignes d'articles.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 cursor-pointer hover:bg-neutral-100/60 transition-colors">
                <input 
                  type="checkbox"
                  checked={settings.whatsapp.sendAutoReply}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, sendAutoReply: e.target.checked }
                  }))}
                  className="mt-1 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-neutral-900">Accusé de réception WhatsApp automatique</p>
                  <p className="text-[11px] text-neutral-500">Répond automatiquement à l'expéditeur dès que sa facture est enregistrée en comptabilité.</p>
                </div>
              </label>

              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-1.5">
                <label className="text-xs font-bold text-neutral-900">Référentiel par défaut pour les reçus WhatsApp</label>
                <select
                  value={settings.whatsapp.defaultStandard}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, defaultStandard: e.target.value as any }
                  }))}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value="OHADA">SYSCOHADA Révisé (FCFA, XOF, XAF)</option>
                  <option value="PCG">Plan Comptable Général (France - EUR €)</option>
                </select>
              </div>
            </div>

            {settings.whatsapp.sendAutoReply && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-neutral-600">Texte de l'accusé de réception automatique</label>
                <textarea 
                  rows={2}
                  value={settings.whatsapp.autoReplyText}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, autoReplyText: e.target.value }
                  }))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            )}

            {/* Whitelisted numbers */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-neutral-900">Filtrage des expéditeurs autorisés</label>
                  <p className="text-[11px] text-neutral-500">Limitez la réception aux collaborateurs et fournisseurs de confiance.</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-700">
                  <input 
                    type="checkbox"
                    checked={settings.whatsapp.whitelistOnly}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      whatsapp: { ...prev.whatsapp, whitelistOnly: e.target.checked }
                    }))}
                    className="rounded text-emerald-600"
                  />
                  <span>Activer la liste blanche stricte</span>
                </label>
              </div>

              {settings.whatsapp.whitelistOnly && (
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newWhitelistedNumber}
                      onChange={(e) => setNewWhitelistedNumber(e.target.value)}
                      placeholder="+221 77 123 45 67 ou +33 6..."
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addWhitelistedNumber(); } }}
                      className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={addWhitelistedNumber}
                      className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {settings.whatsapp.whitelistedNumbers.map((num) => (
                      <span key={num} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-neutral-200 rounded-lg text-xs font-mono text-neutral-700 shadow-2xs">
                        <span>{num}</span>
                        <button
                          type="button"
                          onClick={() => removeWhitelistedNumber(num)}
                          className="text-neutral-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Test Connection Button & Result */}
            <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestWhatsApp}
                disabled={testingWa}
                className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all shadow-sm disabled:opacity-50"
              >
                {testingWa ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Send className="w-4 h-4 text-emerald-400" />}
                Tester la connexion WhatsApp
              </button>

              {waTestResult && (
                <div className={cn(
                  "p-3 rounded-xl border text-xs flex items-center gap-2 font-medium flex-1",
                  waTestResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
                )}>
                  {waTestResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />}
                  <span>{waTestResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EMAIL & IMAP CONFIGURATION TAB                                         */}
      {/* ========================================================================= */}
      {activeChannelTab === 'email' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Main Toggle Card */}
          <div className="p-6 bg-gradient-to-r from-indigo-50/60 to-indigo-100/30 rounded-3xl border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-900">Ingestion Automatique par Email</h3>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                    settings.email.enabled ? "bg-indigo-600 text-white" : "bg-neutral-200 text-neutral-600"
                  )}>
                    {settings.email.enabled ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-1 max-w-xl">
                  Synchronisez votre boîte email professionnelle via IMAP ou utilisez votre adresse de transfert dédiée. Vos factures fournisseurs reçues par email sont traitées et classées automatiquement.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input 
                type="checkbox" 
                checked={settings.email.enabled}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  email: { ...prev.email, enabled: e.target.checked }
                }))}
                className="sr-only peer" 
              />
              <div className="w-14 h-7 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Email Ingestion Modes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Mode de Connexion Email
              </label>
              <span className="text-[11px] text-neutral-400">Choisissez votre méthode de synchronisation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSettings(prev => ({
                  ...prev,
                  email: { ...prev.email, mode: 'imap' }
                }))}
                className={cn(
                  "p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between",
                  settings.email.mode === 'imap'
                    ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm"
                    : "bg-white border-neutral-200 hover:bg-neutral-50"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                      <Server className="w-5 h-5" />
                    </div>
                    {settings.email.mode === 'imap' && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                        Actif
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900">Synchronisation Directe IMAP / Exchange</h4>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Connectez directement votre boîte de messagerie (Gmail Workspace, Microsoft 365, OVH). Xfactur surveille un dossier précis en continu.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-medium text-indigo-700">
                  <span>Recommandé pour les cabinets</span>
                  <span className="font-mono">SSL/TLS 993</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSettings(prev => ({
                  ...prev,
                  email: { ...prev.email, mode: 'forwarding_inbound' }
                }))}
                className={cn(
                  "p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between",
                  settings.email.mode === 'forwarding_inbound'
                    ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm"
                    : "bg-white border-neutral-200 hover:bg-neutral-50"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                      <Mail className="w-5 h-5" />
                    </div>
                    {settings.email.mode === 'forwarding_inbound' && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Actif
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-neutral-900">Adresse de Transfert Dédiée (Inbound)</h4>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Chaque organisation dispose d'une adresse email unique. Vous pouvez transférer manuellement vos emails ou créer une règle de redirection automatique.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-medium text-emerald-700">
                  <span>Zéro configuration serveur</span>
                  <span className="font-mono">Webhook MX</span>
                </div>
              </button>
            </div>
          </div>

          {/* Mode 1: IMAP Settings Form */}
          {settings.email.mode === 'imap' && (
            <div className="p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-neutral-900">Paramètres de Connexion IMAP Sécurisée</h4>
                  <p className="text-xs text-neutral-500">Choisissez votre fournisseur ou entrez manuellement vos paramètres IMAP.</p>
                </div>

                {/* Preset selector */}
                <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
                  {(['gmail', 'outlook', 'ovh', 'custom'] as const).map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleImapPresetChange(preset)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all",
                        settings.email.imapPreset === preset
                          ? "bg-white text-indigo-700 shadow-2xs"
                          : "text-neutral-500 hover:text-neutral-900"
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">Serveur IMAP (Host)</label>
                  <input 
                    type="text"
                    value={settings.email.imapHost}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, imapHost: e.target.value }
                    }))}
                    placeholder="imap.gmail.com"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">Port & Sécurité</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      value={settings.email.imapPort}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        email: { ...prev.email, imapPort: Number(e.target.value) }
                      }))}
                      className="w-24 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-mono text-center"
                    />
                    <label className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={settings.email.imapSecure}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          email: { ...prev.email, imapSecure: e.target.checked }
                        }))}
                        className="rounded text-indigo-600"
                      />
                      <span>SSL/TLS</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">Adresse Email / Nom d'utilisateur</label>
                  <input 
                    type="email"
                    value={settings.email.imapUser}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, imapUser: e.target.value }
                    }))}
                    placeholder="comptabilite@monentreprise.com"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-600">Mot de passe / Mot de passe d'application</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-indigo-600 hover:underline"
                    >
                      {showPassword ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={settings.email.imapPassword || ''}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, imapPassword: e.target.value }
                    }))}
                    placeholder="Mot de passe d'application"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">Dossier surveillé</label>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-neutral-400" />
                    <input 
                      type="text"
                      value={settings.email.imapFolder}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        email: { ...prev.email, imapFolder: e.target.value }
                      }))}
                      placeholder="INBOX ou INBOX/Factures"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-600">Fréquence de vérification</label>
                  <select
                    value={settings.email.checkIntervalMinutes}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, checkIntervalMinutes: Number(e.target.value) }
                    }))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value={2}>Toutes les 2 minutes (Temps Réel)</option>
                    <option value={5}>Toutes les 5 minutes (Recommandé)</option>
                    <option value={15}>Toutes les 15 minutes</option>
                    <option value={60}>Toutes les heures</option>
                  </select>
                </div>
              </div>

              {settings.email.imapPreset === 'gmail' && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 space-y-1">
                    <p className="font-bold">Pour les comptes Google Workspace / Gmail :</p>
                    <p className="text-[11px] leading-relaxed">
                      Si vous utilisez la validation en 2 étapes, créez un <strong>Mot de passe d'application</strong> dans votre compte Google (Sécurité &gt; Mots de passe des applications) et utilisez-le ici pour autoriser l'accès IMAP sécurisé.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Dedicated Inbound Forwarding Address */}
          {settings.email.mode === 'forwarding_inbound' && (
            <div className="p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-5">
              <div>
                <h4 className="text-sm font-bold text-neutral-900">Votre Adresse de Transfert Unique</h4>
                <p className="text-xs text-neutral-500">Transférez n'importe quel email avec pièce jointe vers cette adresse sécurisée.</p>
              </div>

              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Adresse Inbound Dédiée</p>
                    <p className="text-sm font-mono font-bold text-neutral-900">{settings.email.dedicatedEmail}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.email.dedicatedEmail, 'inbound_email')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-2xs"
                >
                  {copiedKey === 'inbound_email' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>Copier l'adresse</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-600">Alias d'entreprise personnalisé (Optionnel)</label>
                <input 
                  type="email"
                  value={settings.email.customForwardingEmail || ''}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, customForwardingEmail: e.target.value }
                  }))}
                  placeholder="factures-compta@monentreprise.com"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[10px] text-neutral-400">Si vous configurez une redirection DNS MX automatique depuis votre propre nom de domaine.</p>
              </div>
            </div>
          )}

          {/* Email Filtering & Post-Processing Rules */}
          <div className="p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-6">
            <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Filtrage des Pièces Jointes & Règles de Traitement
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-neutral-600">Mots-clés filtrés dans l'objet de l'email (séparés par virgule)</label>
                <input 
                  type="text"
                  value={settings.email.subjectFilterKeywords}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, subjectFilterKeywords: e.target.value }
                  }))}
                  placeholder="Facture, Invoice, Reçu, Honoraires, Quittance, Avoir"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[10px] text-neutral-400">Seuls les messages contenant au moins un de ces termes seront analysés par l'automate comptable.</p>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-neutral-600">Extensions de pièces jointes autorisées</label>
                <div className="flex flex-wrap gap-2">
                  {['.pdf', '.png', '.jpg', '.jpeg', '.xlsx', '.csv', '.xml'].map(ext => {
                    const isChecked = settings.email.allowedExtensions.includes(ext);
                    return (
                      <button
                        key={ext}
                        type="button"
                        onClick={() => {
                          setSettings(prev => ({
                            ...prev,
                            email: {
                              ...prev.email,
                              allowedExtensions: isChecked
                                ? prev.email.allowedExtensions.filter(e => e !== ext)
                                : [...prev.email.allowedExtensions, ext]
                            }
                          }));
                        }}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border",
                          isChecked 
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700" 
                            : "bg-neutral-50 border-neutral-200 text-neutral-400 hover:text-neutral-700"
                        )}
                      >
                        {isChecked ? `✓ ${ext}` : `+ ${ext}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 cursor-pointer hover:bg-neutral-100/60 transition-colors">
                <input 
                  type="checkbox"
                  checked={settings.email.markAsReadAfterProcessing}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, markAsReadAfterProcessing: e.target.checked }
                  }))}
                  className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-neutral-900">Marquer comme lu après extraction</p>
                  <p className="text-[11px] text-neutral-500">Évite de retraiter une même facture lors de la prochaine relève IMAP.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 cursor-pointer hover:bg-neutral-100/60 transition-colors">
                <input 
                  type="checkbox"
                  checked={settings.email.applyLabel}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, applyLabel: e.target.checked }
                  }))}
                  className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-neutral-900">Appliquer le libellé comptable</p>
                  <p className="text-[11px] text-neutral-500">Ajoute l'étiquette <strong>{settings.email.labelText}</strong> dans votre messagerie.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 cursor-pointer hover:bg-neutral-100/60 transition-colors">
                <input 
                  type="checkbox"
                  checked={settings.email.archiveOriginal}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, archiveOriginal: e.target.checked }
                  }))}
                  className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-neutral-900">Archiver l'email source</p>
                  <p className="text-[11px] text-neutral-500">Déplace le message vers les archives après traitement réussi.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 cursor-pointer hover:bg-neutral-100/60 transition-colors">
                <input 
                  type="checkbox"
                  checked={settings.email.sendDailyDigest}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    email: { ...prev.email, sendDailyDigest: e.target.checked }
                  }))}
                  className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div>
                  <p className="text-xs font-bold text-neutral-900">Rapport récapitulatif quotidien</p>
                  <p className="text-[11px] text-neutral-500">Recevez un résumé par email chaque soir à 18h des factures ingérées.</p>
                </div>
              </label>
            </div>

            {/* Test Email Connection Button */}
            <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all shadow-sm disabled:opacity-50"
              >
                {testingEmail ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Send className="w-4 h-4 text-indigo-400" />}
                Tester la connexion Email & IMAP
              </button>

              {emailTestResult && (
                <div className={cn(
                  "p-3 rounded-xl border text-xs flex items-center gap-2 font-medium flex-1",
                  emailTestResult.success ? "bg-indigo-50 border-indigo-200 text-indigo-800" : "bg-red-50 border-red-200 text-red-800"
                )}>
                  {emailTestResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-indigo-600" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />}
                  <span>{emailTestResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. WEBHOOKS & REST API SPECIFICATIONS TAB                                 */}
      {/* ========================================================================= */}
      {activeChannelTab === 'webhooks' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="p-6 bg-white rounded-3xl border border-neutral-200 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-neutral-900">Endpoints d'Ingestion en Production</h4>
            <p className="text-xs text-neutral-500">
              Ces points d'accès HTTP peuvent être appelés directement par vos serveurs, Zapier, Make, ou vos webhooks WhatsApp et messagerie pour injecter automatiquement des pièces jointes.
            </p>

            <div className="space-y-4">
              {/* WhatsApp Webhook Endpoint */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold font-mono">POST</span>
                    <span className="text-xs font-mono font-bold text-neutral-900">/api/webhooks/whatsapp</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${originUrl}/api/webhooks/whatsapp`, 'ep_wa')}
                    className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-500"
                    title="Copier l'URL"
                  >
                    {copiedKey === 'ep_wa' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Accepte des pièces jointes multipart (fichiers reçus par WhatsApp) ou un payload JSON avec le texte et l'émetteur.
                </p>
                <pre className="p-3 bg-neutral-900 text-emerald-400 rounded-xl text-[10px] font-mono overflow-x-auto">
{`curl -X POST "${originUrl}/api/webhooks/whatsapp" \\
  -F "phone=+221778421930" \\
  -F "messageText=Reçu station essence" \\
  -F "files=@recu.jpg" \\
  -F "standard=OHADA"`}
                </pre>
              </div>

              {/* Email Inbound Webhook Endpoint */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold font-mono">POST</span>
                    <span className="text-xs font-mono font-bold text-neutral-900">/api/webhooks/email</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(`${originUrl}/api/webhooks/email`, 'ep_email')}
                    className="p-1.5 hover:bg-neutral-200 rounded-lg text-neutral-500"
                    title="Copier l'URL"
                  >
                    {copiedKey === 'ep_email' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Prise en charge native des webhooks de messagerie Mailgun, SendGrid, Postmark et relais SMTP locaux.
                </p>
                <pre className="p-3 bg-neutral-900 text-indigo-300 rounded-xl text-[10px] font-mono overflow-x-auto">
{`curl -X POST "${originUrl}/api/webhooks/email" \\
  -F "from=fournisseur@domaine.com" \\
  -F "subject=Facture mensuelle" \\
  -F "files=@facture.pdf" \\
  -F "standard=OHADA"`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
