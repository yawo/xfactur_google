import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search, 
  Trash2, 
  Edit2, 
  Globe2,
  MessageSquare,
  Mail,
  Terminal,
  Copy,
  Check,
  QrCode,
  Send,
  Save,
  Sparkles,
  Phone,
  FileCode,
  ArrowRight,
  ShieldCheck,
  Settings,
  Link2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { aiService } from '../services/aiService';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, onSnapshot, query, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { InvoiceEditorModal } from '../components/InvoiceEditorModal';
import { useAuth } from '../AuthContext';
import { useAccounting } from '../AccountingContext';
import { 
  ingestionConfigService, 
  buildWhatsAppDirectLink, 
  buildWhatsAppQrUrl 
} from '../services/ingestionConfigService';
import { IngestionChannelsSettings } from '../types';

export default function Ingestion() {
  const [activeChannel, setActiveChannel] = useState<'upload' | 'whatsapp' | 'email' | 'api'>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [channelsConfig, setChannelsConfig] = useState<IngestionChannelsSettings | null>(null);


  // WhatsApp Channel State
  const [waPhone, setWaPhone] = useState('+221 77 842 19 30');
  const [waMessage, setWaMessage] = useState('Bonjour, ci-joint la facture Sonatel Fibre du mois en cours.');
  const [waFile, setWaFile] = useState<File | null>(null);
  const [isProcessingWa, setIsProcessingWa] = useState(false);

  // Email Channel State
  const [emailFrom, setEmailFrom] = useState('facturation@fournisseur-pro.com');
  const [emailSubject, setEmailSubject] = useState('Facture N° F-2026-8842 - Maintenance IT');
  const [emailBody, setEmailBody] = useState('Bonjour,\n\nVeuillez trouver ci-joint votre facture acquittée d\'un montant de 180 € (ou 118 000 FCFA).\n\nCordialement,\nService Comptabilité');
  const [emailFile, setEmailFile] = useState<File | null>(null);
  const [isProcessingEmail, setIsProcessingEmail] = useState(false);

  // API / Webhook Channel State
  const [apiPayload, setApiPayload] = useState(JSON.stringify({
    numero_facture: "INV-API-2026-904",
    date_emission: new Date().toISOString().split('T')[0],
    emetteur_nom: "Serveurs & Hébergement Cloud",
    montant_ht_eur: 150.00,
    montant_ttc_eur: 177.00,
    devise: "EUR",
    lignes: [
      { description: "Abonnement Cloud Premium", prix_unitaire_eur: 150.00, quantite: 1, taux_tva: 18 }
    ]
  }, null, 2));
  const [isProcessingApi, setIsProcessingApi] = useState(false);

  const { user } = useAuth();
  const { standard, setStandard, isOHADA, pays, currencySymbol, formatMoney } = useAccounting();

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const cfg = await ingestionConfigService.loadSettings(user?.uid);
        setChannelsConfig(cfg);
        if (cfg.whatsapp.phoneNumber) {
          setWaPhone(cfg.whatsapp.phoneNumber);
        }
      } catch (e) {
        console.warn("Could not load channel settings:", e);
      }
    };
    fetchChannels();
  }, [user]);

  const orgDedicatedEmail = channelsConfig?.email.dedicatedEmail || (user ? `factures-${user.uid.slice(0, 8)}@inbound.xfactur.app` : 'factures@inbound.xfactur.app');
  const orgWhatsAppNumber = channelsConfig?.whatsapp.phoneNumber || '';
  const orgApiKey = user ? `xfk_live_${user.uid.slice(0, 16)}` : 'xfk_live_demo123456';

  const [quickPhoneInput, setQuickPhoneInput] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [savingQuickPhone, setSavingQuickPhone] = useState(false);

  const handleSaveQuickPhone = async (numToSave?: string) => {
    const target = (numToSave || quickPhoneInput).trim();
    if (!target || target.replace(/[^0-9]/g, '').length < 8) {
      setError("Veuillez saisir un numéro de téléphone valide avec son indicatif international (ex: +33 6... ou +221 77...).");
      return;
    }
    setSavingQuickPhone(true);
    setError(null);
    try {
      const current = channelsConfig || ingestionConfigService.getDefaultSettings(user?.uid);
      const updated: IngestionChannelsSettings = {
        ...current,
        whatsapp: {
          ...current.whatsapp,
          enabled: true,
          status: 'connected',
          phoneNumber: target
        }
      };
      await ingestionConfigService.saveSettings(user?.uid, updated);
      setChannelsConfig(updated);
      setWaPhone(target);
      setIsEditingPhone(false);
      setSuccessMsg("Numéro WhatsApp enregistré avec succès ! Votre QR Code de discussion est prêt.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setError(`Erreur lors de l'enregistrement du numéro : ${e.message}`);
    } finally {
      setSavingQuickPhone(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setResults([]);
      return;
    }
    
    const q = query(collection(db, 'factures'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const facturesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      facturesData.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setResults(facturesData);
    }, (err) => {
      console.error("Error fetching factures in ingestion:", err);
      try { handleFirestoreError(err, OperationType.LIST, 'factures'); } catch(e) {}
    });

    return () => unsubscribe();
  }, [user]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleValidate = async (id: string) => {
    try {
      const docRef = doc(db, 'factures', id);
      await updateDoc(docRef, { statut: 'valide' });
    } catch (err) {
      console.error("Error validating:", err);
      try { handleFirestoreError(err, OperationType.UPDATE, 'factures'); } catch(e) {}
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'factures', id));
    } catch (err) {
      console.error("Error deleting:", err);
      try { handleFirestoreError(err, OperationType.DELETE, 'factures'); } catch(e) {}
    }
  };

  // 1. Process Standard Uploads
  const processFiles = async () => {
    if (!user) {
      setError("Vous devez être connecté pour importer des factures.");
      return;
    }
    
    setIsUploading(true);
    setError(null);
    setSuccessMsg(null);
    
    for (const file of files) {
      try {
        const extractionResult = await aiService.extractInvoice(file);
        if (extractionResult.success && extractionResult.data) {
          const invoiceData = extractionResult.data;
          await addDoc(collection(db, 'factures'), {
            organisation_id: user.uid,
            numero_facture: String(invoiceData.numero_facture || '').trim() ? String(invoiceData.numero_facture).trim().substring(0, 50) : 'INCONNU',
            date_emission: (invoiceData.date_emission && /^\d{4}-\d{2}-\d{2}/.test(String(invoiceData.date_emission).trim())) ? String(invoiceData.date_emission).trim().substring(0, 10) : new Date().toISOString().split('T')[0],
            emetteur_nom: invoiceData.emetteur_nom || 'Fournisseur Inconnu',
            montant_ht_eur: isNaN(Number(invoiceData.montant_ht_eur)) ? 0 : Math.max(0, Number(invoiceData.montant_ht_eur)),
            montant_ttc_eur: isNaN(Number(invoiceData.montant_ttc_eur)) ? 0 : Math.max(0, Number(invoiceData.montant_ttc_eur)),
            statut: 'cree',
            lignes: invoiceData.lignes || [],
            source: 'upload',
            source_file: file.name,
            createdAt: serverTimestamp(),
            author_uid: user.uid
          });
          setSuccessMsg(`Facture "${file.name}" extraite et enregistrée avec succès.`);
        } else {
          throw new Error("Échec de l'extraction IA");
        }
      } catch (err: any) {
        console.error(err);
        setError(`Erreur lors du traitement de ${file.name}: ${err.message}`);
      }
    }
    
    setIsUploading(false);
    setFiles([]);
  };

  // 2. Process WhatsApp Ingestion
  const handleProcessWhatsApp = async () => {
    if (!user) {
      setError("Connectez-vous pour utiliser l'ingestion WhatsApp.");
      return;
    }
    setIsProcessingWa(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await aiService.ingestWhatsApp({
        phone: waPhone,
        messageText: waMessage,
        file: waFile || undefined,
        standard
      });

      if (res.success && res.data) {
        const d = res.data;
        await addDoc(collection(db, 'factures'), {
          organisation_id: user.uid,
          numero_facture: d.numero_facture || `WA-${Date.now().toString().slice(-6)}`,
          date_emission: d.date_emission || new Date().toISOString().split('T')[0],
          emetteur_nom: d.emetteur_nom || `Fournisseur WA (${waPhone})`,
          montant_ht_eur: Number(d.montant_ht_eur) || 0,
          montant_ttc_eur: Number(d.montant_ttc_eur) || 0,
          statut: 'cree',
          lignes: d.lignes || [],
          source: 'whatsapp',
          source_file: waFile ? waFile.name : 'WhatsApp Message',
          note: `Reçu par WhatsApp de ${waPhone}`,
          createdAt: serverTimestamp(),
          author_uid: user.uid
        });

        setSuccessMsg(`Facture reçue via WhatsApp traitée et enregistrée avec succès !`);
        setWaFile(null);
      } else {
        throw new Error("L'extraction du message WhatsApp a échoué.");
      }
    } catch (err: any) {
      setError(`Erreur WhatsApp : ${err.message}`);
    } finally {
      setIsProcessingWa(false);
    }
  };

  // 3. Process Email Ingestion
  const handleProcessEmail = async () => {
    if (!user) {
      setError("Connectez-vous pour utiliser l'ingestion par email.");
      return;
    }
    setIsProcessingEmail(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await aiService.ingestEmail({
        from: emailFrom,
        subject: emailSubject,
        bodyText: emailBody,
        file: emailFile || undefined,
        standard
      });

      if (res.success && res.data) {
        const d = res.data;
        await addDoc(collection(db, 'factures'), {
          organisation_id: user.uid,
          numero_facture: d.numero_facture || `EML-${Date.now().toString().slice(-6)}`,
          date_emission: d.date_emission || new Date().toISOString().split('T')[0],
          emetteur_nom: d.emetteur_nom || emailFrom.split('@')[0],
          montant_ht_eur: Number(d.montant_ht_eur) || 0,
          montant_ttc_eur: Number(d.montant_ttc_eur) || 0,
          statut: 'cree',
          lignes: d.lignes || [],
          source: 'email',
          source_file: emailFile ? emailFile.name : emailSubject,
          note: `Transféré par email de ${emailFrom}`,
          createdAt: serverTimestamp(),
          author_uid: user.uid
        });

        setSuccessMsg(`Facture reçue par email extraite et insérée dans le journal !`);
        setEmailFile(null);
      } else {
        throw new Error("L'extraction de l'email a échoué.");
      }
    } catch (err: any) {
      setError(`Erreur Email : ${err.message}`);
    } finally {
      setIsProcessingEmail(false);
    }
  };

  // 4. Process Inbound API Webhook
  const handleProcessApi = async () => {
    if (!user) return;
    setIsProcessingApi(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let parsed = JSON.parse(apiPayload);
      const res = await aiService.ingestInboundApi(parsed, orgApiKey);
      if (res.success && res.data) {
        const d = res.data;
        await addDoc(collection(db, 'factures'), {
          organisation_id: user.uid,
          numero_facture: d.numero_facture || `API-${Date.now().toString().slice(-6)}`,
          date_emission: d.date_emission || new Date().toISOString().split('T')[0],
          emetteur_nom: d.emetteur_nom || 'Webhook Partner',
          montant_ht_eur: Number(d.montant_ht_eur) || 0,
          montant_ttc_eur: Number(d.montant_ttc_eur) || 0,
          statut: 'cree',
          lignes: d.lignes || [],
          source: 'api_webhook',
          source_file: 'REST Webhook Payload',
          createdAt: serverTimestamp(),
          author_uid: user.uid
        });
        setSuccessMsg(`Facture via API Webhook injectée avec succès !`);
      }
    } catch (err: any) {
      setError(`Format JSON invalide ou erreur API : ${err.message}`);
    } finally {
      setIsProcessingApi(false);
    }
  };

  const filteredResults = useMemo(() => {
    if (!searchTerm.trim()) return results;
    const term = searchTerm.toLowerCase();
    return results.filter(r => 
      (r.emetteur_nom || '').toLowerCase().includes(term) ||
      (r.numero_facture || '').toLowerCase().includes(term)
    );
  }, [results, searchTerm]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1",
              isOHADA ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
            )}>
              <Globe2 className="w-3 h-3" />
              {isOHADA ? `SYSCOHADA (${pays || 'Espace OHADA'})` : 'PCG France'}
            </span>
            <span className="text-xs text-neutral-400 font-mono">Devise: {currencySymbol}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Ingestion Multi-Canale & IA</h1>
          <p className="text-neutral-500 text-sm">
            Importez vos factures par téléversement, WhatsApp Business, email dédié ou Webhooks API.
          </p>
        </div>

        <div className="flex items-center bg-white p-1 rounded-2xl border border-neutral-200 shadow-sm self-start md:self-auto">
          <button
            onClick={() => setStandard('OHADA')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              standard === 'OHADA' ? "bg-amber-600 text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            SYSCOHADA
          </button>
          <button
            onClick={() => setStandard('PCG')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              standard === 'PCG' ? "bg-emerald-600 text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            PCG France
          </button>
        </div>
      </header>

      {/* Channel Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveChannel('upload')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeChannel === 'upload' 
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs" 
              : "text-neutral-600 hover:bg-neutral-100"
          )}
        >
          <Upload className="w-4 h-4 text-emerald-600" />
          Fichiers & Numérisation
        </button>

        <button
          onClick={() => setActiveChannel('whatsapp')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeChannel === 'whatsapp' 
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs" 
              : "text-neutral-600 hover:bg-neutral-100"
          )}
        >
          <MessageSquare className="w-4 h-4 text-emerald-500" />
          WhatsApp Ingestion
          <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-mono">LIVE</span>
        </button>

        <button
          onClick={() => setActiveChannel('email')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeChannel === 'email' 
              ? "bg-blue-50 text-blue-800 border border-blue-200 shadow-xs" 
              : "text-neutral-600 hover:bg-neutral-100"
          )}
        >
          <Mail className="w-4 h-4 text-blue-600" />
          Email Inbound
          <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.2 rounded-full font-mono">AUTO</span>
        </button>

        <button
          onClick={() => setActiveChannel('api')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeChannel === 'api' 
              ? "bg-purple-50 text-purple-800 border border-purple-200 shadow-xs" 
              : "text-neutral-600 hover:bg-neutral-100"
          )}
        >
          <Terminal className="w-4 h-4 text-purple-600" />
          API & Webhooks
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 border border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 border border-emerald-200">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Channel Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* 1. CHANNEL: UPLOAD */}
          {activeChannel === 'upload' && (
            <div className="space-y-6">
              <div 
                className={cn(
                  "border-2 border-dashed rounded-3xl p-8 text-center transition-all bg-white shadow-xs",
                  files.length > 0 ? "border-emerald-500 bg-emerald-50/20" : "border-neutral-300 hover:border-emerald-400"
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) setFiles(Array.from(e.dataTransfer.files));
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-emerald-50 rounded-2xl mb-4 text-emerald-600">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900">Glissez vos factures ici</h3>
                  <p className="text-xs text-neutral-500 mt-1 mb-5">PDF multipages, scans, JPEG ou PNG</p>
                  
                  <label className="cursor-pointer bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-xs">
                    Parcourir les fichiers
                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              {files.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs space-y-4"
                >
                  <h4 className="text-xs font-bold text-neutral-700 flex items-center justify-between uppercase tracking-wider">
                    <span>Fichiers sélectionnés</span>
                    <span className="text-neutral-400 font-mono">{files.length}</span>
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 bg-neutral-50 rounded-xl">
                        <FileText className="w-4 h-4 text-neutral-400 shrink-0" />
                        <span className="flex-1 truncate font-medium text-neutral-700">{file.name}</span>
                        <span className="text-neutral-400 font-mono text-[10px]">{(file.size / 1024).toFixed(0)} KB</span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={processFiles}
                    disabled={isUploading}
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extraction IA en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Lancer l'extraction IA
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* 2. CHANNEL: WHATSAPP */}
          {activeChannel === 'whatsapp' && (
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-900">WhatsApp Ingestion Bot</h3>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                        {channelsConfig?.whatsapp.status === 'connected' ? 'Connecté' : 'Actif'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {channelsConfig?.whatsapp.provider === 'meta_cloud_api' 
                        ? 'Meta Cloud API (WABA)' 
                        : channelsConfig?.whatsapp.provider === 'twilio' 
                        ? 'Passerelle Twilio' 
                        : 'Session WhatsApp Web'}
                    </p>
                  </div>
                </div>

                <Link
                  to="/admin?tab=ingestion_channels"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-700 text-neutral-700 rounded-xl text-xs font-bold transition-colors"
                  title="Ouvrir la configuration WhatsApp dans les paramètres"
                >
                  <Settings className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Paramètres</span>
                </Link>
              </div>

              {/* Bot Info & Dynamic QR Code */}
              {(() => {
                const cleanPhone = (orgWhatsAppNumber || '').replace(/[^0-9]/g, '');
                const hasValidPhone = cleanPhone.length >= 8;
                const directLink = hasValidPhone ? buildWhatsAppDirectLink(orgWhatsAppNumber) : '';
                const qrUrl = hasValidPhone ? buildWhatsAppQrUrl(orgWhatsAppNumber) : '';

                if (!hasValidPhone || isEditingPhone) {
                  return (
                    <div className="bg-emerald-50/70 p-5 rounded-3xl border border-emerald-200 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-emerald-600" />
                            Configurer votre numéro WhatsApp de réception
                          </h4>
                          <p className="text-xs text-neutral-600 mt-1">
                            Renseignez le numéro WhatsApp de votre entreprise pour activer la réception automatique de factures et générer votre QR Code de discussion direct.
                          </p>
                        </div>
                        {isEditingPhone && (
                          <button
                            type="button"
                            onClick={() => setIsEditingPhone(false)}
                            className="text-xs font-semibold text-neutral-500 hover:text-neutral-800"
                          >
                            Annuler
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input 
                            type="text"
                            value={quickPhoneInput}
                            onChange={(e) => setQuickPhoneInput(e.target.value)}
                            placeholder="Ex: +33 6 12 34 56 78 ou +221 77 123 45 67"
                            className="flex-1 px-4 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                          />
                          <button
                            type="button"
                            disabled={savingQuickPhone}
                            onClick={() => handleSaveQuickPhone()}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {savingQuickPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Enregistrer & Activer
                          </button>
                        </div>

                        {/* Indicatifs rapides */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-neutral-500 font-medium mr-1">Raccourcis indicatifs :</span>
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
                                const cur = quickPhoneInput || '';
                                if (!cur.startsWith('+')) {
                                  setQuickPhoneInput(`${p.code} `);
                                } else {
                                  const parts = cur.split(' ');
                                  const rest = parts.slice(1).join(' ');
                                  setQuickPhoneInput(`${p.code} ${rest}`.trim());
                                }
                              }}
                              className="px-2 py-0.5 rounded-lg bg-white border border-neutral-200 hover:bg-emerald-50 hover:text-emerald-700 text-neutral-600 text-[11px] font-mono transition"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                          <Phone className="w-4 h-4 text-emerald-600" />
                          Numéro WhatsApp connecté :
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(orgWhatsAppNumber, 'wa_phone')}
                            className="text-emerald-700 font-mono font-bold flex items-center gap-1 hover:underline text-xs bg-white px-2.5 py-1 rounded-lg border border-emerald-200"
                            title="Copier le numéro"
                          >
                            {copiedField === 'wa_phone' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            {orgWhatsAppNumber}
                          </button>
                          <button
                            onClick={() => {
                              setQuickPhoneInput(orgWhatsAppNumber);
                              setIsEditingPhone(true);
                            }}
                            className="text-[11px] text-neutral-500 hover:text-neutral-800 underline px-1"
                          >
                            Modifier
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-neutral-600 leading-relaxed">
                        Envoyez une photo de reçu ou un document PDF directement à ce numéro avec une courte note. L'IA extrait automatiquement les montants, le fournisseur et prépare l'écriture comptable.
                      </p>

                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <a
                          href={directLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ouvrir dans WhatsApp (wa.me)</span>
                        </a>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          Lien direct 100% fonctionnel
                        </span>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-emerald-200 shadow-xs flex-shrink-0">
                      <div className="w-28 h-28 bg-white p-1 rounded-xl">
                        <img 
                          src={qrUrl} 
                          alt={`QR Code WhatsApp pour ${orgWhatsAppNumber}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Scannez pour tester
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* WhatsApp Message Simulator */}
              <div className="space-y-4 pt-1">
                <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Simulateur de message WhatsApp
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-medium text-neutral-600 mb-1">Numéro WhatsApp expéditeur :</label>
                    <input 
                      type="text" 
                      value={waPhone} 
                      onChange={(e) => setWaPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      placeholder="+221 77 000 00 00"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-600 mb-1">Message ou note accompagnatrice :</label>
                    <textarea 
                      rows={2}
                      value={waMessage} 
                      onChange={(e) => setWaMessage(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex: Facture carburant TotalEnergies 35 000 FCFA"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-600 mb-1">Photo / Reçu joint (optionnel) :</label>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={(e) => e.target.files && setWaFile(e.target.files[0])}
                      className="w-full text-xs text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                  </div>
                </div>

                <button
                  onClick={handleProcessWhatsApp}
                  disabled={isProcessingWa}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isProcessingWa ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Traitement WhatsApp en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Simuler la réception WhatsApp & Extraire
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 3. CHANNEL: EMAIL INBOUND */}
          {activeChannel === 'email' && (
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-900">Boîte de Réception Comptable</h3>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                        {channelsConfig?.email.status === 'connected' ? 'Connecté' : 'Actif'}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {channelsConfig?.email.mode === 'imap' 
                        ? `Synchro IMAP (${channelsConfig.email.imapHost || 'SSL 993'})` 
                        : 'Adresse Inbound Dédiée'}
                    </p>
                  </div>
                </div>

                <Link
                  to="/admin?tab=ingestion_channels"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-blue-50 hover:text-blue-700 text-neutral-700 rounded-xl text-xs font-bold transition-colors"
                  title="Ouvrir la configuration Email dans les paramètres"
                >
                  <Settings className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Paramètres</span>
                </Link>
              </div>

              {/* Dedicated Email Address Card */}
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                <div className="text-xs font-bold text-blue-950">Adresse email dédiée de votre organisation :</div>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-blue-200">
                  <span className="font-mono text-xs text-neutral-700 truncate">{orgDedicatedEmail}</span>
                  <button
                    onClick={() => copyToClipboard(orgDedicatedEmail, 'email_addr')}
                    className="p-1 text-blue-600 hover:text-blue-800 transition-colors ml-2"
                    title="Copier l'adresse"
                  >
                    {copiedField === 'email_addr' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Configurez une règle de redirection dans votre messagerie professionnelle (Gmail, Outlook) ou demandez à vos fournisseurs d'envoyer leurs factures directement à cette adresse.
                </p>
              </div>

              {/* Inbound Email Simulator */}
              <div className="space-y-4 pt-1">
                <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Simulateur d'email entrant
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-medium text-neutral-600 mb-1">De (Expéditeur) :</label>
                    <input 
                      type="email" 
                      value={emailFrom} 
                      onChange={(e) => setEmailFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-600 mb-1">Objet de l'email :</label>
                    <input 
                      type="text" 
                      value={emailSubject} 
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-600 mb-1">Corps de l'email :</label>
                    <textarea 
                      rows={2}
                      value={emailBody} 
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-600 mb-1">Pièce jointe (PDF / Scan / EML) :</label>
                    <input 
                      type="file" 
                      accept="application/pdf,image/*,.eml,.msg"
                      onChange={(e) => e.target.files && setEmailFile(e.target.files[0])}
                      className="w-full text-xs text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>

                <button
                  onClick={handleProcessEmail}
                  disabled={isProcessingEmail}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isProcessingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Extraction de l'email en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Simuler l'envoi d'email & Extraire
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 4. CHANNEL: API & WEBHOOKS */}
          {activeChannel === 'api' && (
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">API Rest & Webhooks Entrants</h3>
                  <p className="text-xs text-neutral-500">Intégration Zapier, Make, ERP & Cloud Storage</p>
                </div>
              </div>

              {/* Endpoint & Key Info */}
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-purple-950">URL Endpoint :</span>
                  <div className="mt-1 flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-purple-200 font-mono text-[11px] text-purple-900">
                    <span className="truncate">POST /api/webhooks/inbound-invoice</span>
                    <button 
                      onClick={() => copyToClipboard(`${window.location.origin}/api/webhooks/inbound-invoice`, 'api_url')}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      {copiedField === 'api_url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-purple-950">Clé d'API :</span>
                  <div className="mt-1 flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-purple-200 font-mono text-[11px] text-neutral-600">
                    <span className="truncate">{orgApiKey}</span>
                    <button 
                      onClick={() => copyToClipboard(orgApiKey, 'api_key')}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      {copiedField === 'api_key' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive JSON Tester */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-700">Payload JSON à tester :</span>
                  <span className="text-neutral-400 font-mono text-[10px]">application/json</span>
                </div>
                <textarea
                  rows={7}
                  value={apiPayload}
                  onChange={(e) => setApiPayload(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-900 text-emerald-400 font-mono text-xs rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />

                <button
                  onClick={handleProcessApi}
                  disabled={isProcessingApi}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isProcessingApi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Appel API en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Tester l'envoi API & Enregistrer
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Ingested Invoices List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-neutral-900">Dernières factures ingérées</h3>
              <p className="text-xs text-neutral-500">Pipeline unifié multi-sources avec statut d'avancement</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par fournisseur ou n°..." 
                className="pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {filteredResults.map((result) => {
                const source = result.source || 'upload';
                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs flex flex-col sm:flex-row sm:items-center gap-4 hover:border-neutral-300 transition-all"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                      source === 'whatsapp' ? "bg-emerald-100 text-emerald-700" :
                      source === 'email' ? "bg-blue-100 text-blue-700" :
                      source === 'api_webhook' ? "bg-purple-100 text-purple-700" :
                      "bg-neutral-100 text-neutral-700"
                    )}>
                      {source === 'whatsapp' ? <MessageSquare className="w-6 h-6" /> :
                       source === 'email' ? <Mail className="w-6 h-6" /> :
                       source === 'api_webhook' ? <Terminal className="w-6 h-6" /> :
                       <FileText className="w-6 h-6" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-neutral-900 truncate text-sm">
                          {result.emetteur_nom || 'Fournisseur Inconnu'}
                        </h4>
                        
                        {/* Channel Badge */}
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                          source === 'whatsapp' ? "bg-emerald-100 text-emerald-800" :
                          source === 'email' ? "bg-blue-100 text-blue-800" :
                          source === 'api_webhook' ? "bg-purple-100 text-purple-800" :
                          "bg-neutral-100 text-neutral-700"
                        )}>
                          {source === 'whatsapp' ? 'WhatsApp' :
                           source === 'email' ? 'Email' :
                           source === 'api_webhook' ? 'API Webhook' : 'Upload direct'}
                        </span>

                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                          result.statut === 'cree' ? "bg-amber-100 text-amber-700" :
                          result.statut === 'valide' ? "bg-blue-100 text-blue-700" :
                          "bg-emerald-100 text-emerald-700"
                        )}>
                          {result.statut}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
                        <span>N° {result.numero_facture}</span>
                        <span>•</span>
                        <span>{result.date_emission}</span>
                        {result.note && (
                          <>
                            <span>•</span>
                            <span className="italic text-neutral-400 truncate max-w-xs">{result.note}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-base font-black font-mono text-neutral-900">
                        {formatMoney(result.montant_ttc_eur || 0)}
                      </p>
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono">TTC</p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                      <button 
                        onClick={() => handleDelete(result.id)}
                        className="p-2 hover:bg-red-50 rounded-xl transition-colors text-neutral-400 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setEditingInvoice(result)}
                        className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-400 hover:text-neutral-900"
                        title="Éditer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {result.statut === 'cree' && (
                        <button 
                          onClick={() => handleValidate(result.id)}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                        >
                          Valider
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredResults.length === 0 && !isUploading && (
              <div className="text-center py-16 bg-white rounded-3xl border border-neutral-200 border-dashed p-6">
                <FileText className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500 font-medium text-sm">
                  {searchTerm ? "Aucune facture ne correspond à votre recherche." : "Aucune facture ingérée pour le moment."}
                </p>
                <p className="text-neutral-400 text-xs mt-1">
                  Téléversez des fichiers, ou utilisez le simulateur WhatsApp ou Email pour importer une facture.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editingInvoice && (
          <InvoiceEditorModal 
            invoice={editingInvoice} 
            onClose={() => setEditingInvoice(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
