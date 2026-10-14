import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Settings, Users, Shield, Globe, Database, Key, Bell, Save, Plus, Trash2, Loader2, MessageSquare, Mail, Terminal, Link2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { AuthProvider, useAuth } from '../AuthContext';
import { useAccounting } from '../AccountingContext';
import { OHADA_COUNTRIES } from '../services/accountingService';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { AccountingStandard, DeviseCode } from '../types';
import IngestionSettingsTab from '../components/IngestionSettingsTab';

interface OrgFormData {
  nom: string;
  siret: string;
  email_admin: string;
  regime_tva: string;
  statut: string;
  referentiel: AccountingStandard;
  pays: string;
  devise: DeviseCode;
}

const settingsSections = [
  { id: 'org', icon: Globe, label: 'Organisation', description: 'Informations légales et fiscales.' },
  { id: 'ingestion_channels', icon: MessageSquare, label: 'Ingestion WhatsApp & Email', description: 'Connexion de comptes et collecte automatique des pièces jointes.' },
  { id: 'users', icon: Users, label: 'Utilisateurs', description: 'Gérer les accès et les rôles.' },
  { id: 'integrations', icon: Database, label: 'Intégrations & PDP', description: 'Connecteurs ERP, Banques et PDP.' },
  { id: 'api', icon: Key, label: 'API & Webhooks', description: 'Clés d\'accès et notifications.' },
  { id: 'security', icon: Shield, label: 'Sécurité', description: 'SSO, 2FA et logs d\'audit.' },
  { id: 'notifications', icon: Bell, label: 'Notifications', description: 'Alertes par email et Slack.' },
];

export default function Admin() {
  const { user } = useAuth();
  const { standard, devise, pays, savePreferences } = useAccounting();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const initialSection = (tabParam === 'ingestion' || tabParam === 'whatsapp' || tabParam === 'email' || tabParam === 'ingestion_channels') 
    ? 'ingestion_channels' 
    : (tabParam || 'org');

  const [activeSection, setActiveSection] = useState(initialSection);

  useEffect(() => {
    if (tabParam === 'ingestion' || tabParam === 'whatsapp' || tabParam === 'email' || tabParam === 'ingestion_channels') {
      setActiveSection('ingestion_channels');
    } else if (tabParam) {
      setActiveSection(tabParam);
    }
  }, [tabParam]);

  const [orgData, setOrgData] = useState<OrgFormData>({
    nom: '',
    siret: '',
    email_admin: '',
    regime_tva: 'reel',
    statut: 'actif',
    referentiel: (standard || 'OHADA') as AccountingStandard,
    pays: pays || 'Sénégal',
    devise: (devise || 'XOF') as DeviseCode
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchOrg = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'organisations', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrgData(prev => ({ 
            ...prev, 
            ...data,
            referentiel: data.referentiel || standard,
            pays: data.pays || pays,
            devise: data.devise || devise
          }));
        } else {
          setOrgData(prev => ({ ...prev, email_admin: user.email || '' }));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'organisations');
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'organisations', user.uid);
      await setDoc(docRef, orgData, { merge: true });
      await savePreferences(orgData.referentiel as any, orgData.devise as any, orgData.pays);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'organisations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Console Admin</h1>
          <p className="text-neutral-500">Gérez votre organisation, vos utilisateurs et vos intégrations.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder les modifications
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4",
                activeSection === section.id 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" 
                  : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                activeSection === section.id ? "bg-emerald-100" : "bg-neutral-100"
              )}>
                <section.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{section.label}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5 leading-tight">{section.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
            {activeSection === 'org' && (
              <div className="space-y-8">
                <h3 className="text-xl font-bold">Informations de l'organisation</h3>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Nom de l'entreprise</label>
                      <input 
                        type="text" 
                        value={orgData.nom}
                        onChange={e => setOrgData({...orgData, nom: e.target.value})}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        {orgData.referentiel === 'OHADA' ? 'Identifiant Légal (RCCM / NIF / IFU / NINEA)' : 'Numéro SIRET'}
                      </label>
                      <input 
                        type="text" 
                        value={orgData.siret}
                        placeholder={orgData.referentiel === 'OHADA' ? 'Ex: SN.DKR.2023.B.12345 ou IFU 3201...' : '14 chiffres'}
                        onChange={e => setOrgData({...orgData, siret: e.target.value})}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Référentiel Comptable</label>
                      <select 
                        value={orgData.referentiel}
                        onChange={e => {
                          const newStd = e.target.value as AccountingStandard;
                          setOrgData(prev => ({
                            ...prev,
                            referentiel: newStd,
                            devise: newStd === 'OHADA' ? 'XOF' : 'EUR',
                            pays: newStd === 'OHADA' ? 'Sénégal' : 'France'
                          }));
                        }}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                      >
                        <option value="OHADA">SYSCOHADA Révisé (17 Pays OHADA)</option>
                        <option value="PCG">Plan Comptable Général (France PCG 2026)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Pays d'implantation</label>
                      <select 
                        value={orgData.pays}
                        onChange={e => {
                          const p = e.target.value;
                          const found = OHADA_COUNTRIES.find(c => c.nom.toLowerCase() === p.toLowerCase());
                          setOrgData(prev => ({
                            ...prev,
                            pays: p,
                            devise: found ? found.devise : prev.devise
                          }));
                        }}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <optgroup label="Espace OHADA (Afrique de l'Ouest & Centrale)">
                          {OHADA_COUNTRIES.map(c => (
                            <option key={c.code} value={c.nom}>{c.nom} ({c.zone}) - TVA {c.tauxTvaStandard}%</option>
                          ))}
                        </optgroup>
                        <optgroup label="Europe">
                          <option value="France">France</option>
                        </optgroup>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Devise principale de tenue de comptes</label>
                      <select 
                        value={orgData.devise}
                        onChange={e => setOrgData({...orgData, devise: e.target.value as any})}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="XOF">FCFA (XOF - Franc de la Communauté Financière d'Afrique)</option>
                        <option value="XAF">FCFA (XAF - Franc de la Coopération Financière en Afrique Centrale)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="USD">Dollar US ($)</option>
                        <option value="CDF">Franc Congolais (CDF)</option>
                        <option value="GNF">Franc Guinéen (GNF)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Email de facturation</label>
                      <input 
                        type="email" 
                        value={orgData.email_admin}
                        onChange={e => setOrgData({...orgData, email_admin: e.target.value})}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Régime Fiscal & Comptable</label>
                      <select 
                        value={orgData.regime_tva}
                        onChange={e => setOrgData({...orgData, regime_tva: e.target.value})}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="reel">Système Normal / Réel Normal</option>
                        <option value="synthetique">Système Minimal de Trésorerie (SMT) / Régime Synthétique</option>
                        <option value="franchise">Franchise de TVA / Régime de base</option>
                        <option value="exempt">Exonération spécifique (Code des Investissements)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'users' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">Utilisateurs & Rôles</h3>
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm">
                    <Plus className="w-4 h-4" />
                    Ajouter un utilisateur
                  </button>
                </div>
                <div className="space-y-4">
                  {[
                    { name: user?.displayName || 'Admin', email: user?.email || '', role: 'Admin', status: 'Actif' },
                  ].map((userItem, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          {userItem.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{userItem.name}</p>
                          <p className="text-xs text-neutral-500">{userItem.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs font-bold">{userItem.role}</p>
                          <p className="text-[10px] text-emerald-600 font-medium">{userItem.status}</p>
                        </div>
                        <button className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* INGESTION WHATSAPP & EMAIL */}
            {activeSection === 'ingestion_channels' && (
              <IngestionSettingsTab />
            )}

            {/* INTEGRATIONS & PDP */}
            {activeSection === 'integrations' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Connecteurs & Plateformes Partenaires</h3>
                    <p className="text-xs text-neutral-500 mt-1">Gérez vos passerelles bancaires, PDP (Chorus Pro) et canaux de collecte.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* WhatsApp & Email shortcut card */}
                  <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/40 rounded-2xl border border-emerald-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900">Ingestion WhatsApp & Email</h4>
                        <p className="text-[11px] text-emerald-800 font-medium">Connecteurs de messagerie & pièces jointes</p>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-600">
                      Configurez l'appairage QR Code WhatsApp, l'API Cloud Meta, et la synchronisation IMAP de votre boîte email.
                    </p>
                    <button
                      onClick={() => setActiveSection('ingestion_channels')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
                    >
                      <span>Configurer les canaux</span>
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Chorus Pro / PDP */}
                  <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900">Portail Public / PDP (Chorus Pro)</h4>
                        <p className="text-[11px] text-neutral-500">Facturation électronique 2026</p>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-600">
                      Connecteur certifié Factur-X / UBL avec le Portail Public de Facturation et plateformes de dématérialisation partenaires.
                    </p>
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-neutral-200 text-neutral-700 text-[10px] font-bold">
                      Conforme réforme e-invoicing
                    </span>
                  </div>

                  {/* Open Banking / DSP2 */}
                  <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-600 text-white rounded-xl">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900">Agrégation Bancaire DSP2 / EBICS</h4>
                        <p className="text-[11px] text-neutral-500">Rapprochement bancaire temps réel</p>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-600">
                      Synchronisation automatique des relevés bancaires (format CFONB, MT940, CAMT.053) pour le lettrage automatique.
                    </p>
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Connecté (Bridge & Powens)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* API & WEBHOOKS */}
            {activeSection === 'api' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold">API & Webhooks d'Ingestion</h3>
                  <p className="text-xs text-neutral-500 mt-1">Clés d'accès programmatiques et endpoints pour intégrer Xfactur dans votre SI.</p>
                </div>

                <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Clé API Organisation (Live)</p>
                      <p className="text-sm font-mono font-bold text-neutral-900 mt-1">
                        xfk_live_{user?.uid ? user.uid.slice(0, 16) : 'demo99281729'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`xfk_live_${user?.uid ? user.uid.slice(0, 16) : 'demo99281729'}`);
                      }}
                      className="px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-xl text-xs font-bold text-neutral-700 transition-colors shadow-2xs"
                    >
                      Copier la clé API
                    </button>
                  </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-neutral-200 space-y-3">
                  <h4 className="text-sm font-bold text-neutral-900">Webhooks WhatsApp & Email</h4>
                  <p className="text-xs text-neutral-500">
                    Pour configurer les webhooks entrants de messagerie ou les règles de filtrage des pièces jointes, accédez directement au panneau dédié.
                  </p>
                  <button
                    onClick={() => setActiveSection('ingestion_channels')}
                    className="flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    <span>Gérer les webhooks dans Ingestion WhatsApp & Email</span>
                    <Terminal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {activeSection !== 'org' && activeSection !== 'users' && activeSection !== 'ingestion_channels' && activeSection !== 'integrations' && activeSection !== 'api' && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mb-4">
                  <Settings className="w-8 h-8 text-neutral-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">Module en développement</h3>
                <p className="text-sm text-neutral-500 max-w-md">
                  Cette section de la console d'administration sera disponible dans la prochaine mise à jour.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
