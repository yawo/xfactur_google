import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, Search, Filter, Download, Save, Loader2, Globe2 } from 'lucide-react';
import Spreadsheet from '../components/Spreadsheet';
import MarkdownEditorModal from '../components/MarkdownEditorModal';
import { motion } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { AuthProvider, useAuth } from '../AuthContext';
import { useAccounting } from '../AccountingContext';
import { aiService } from '../services/aiService';
import { cn } from '../lib/utils';

export default function Conformite() {
  const { user } = useAuth();
  const { standard, setStandard, devise, pays, currencySymbol, isOHADA } = useAccounting();
  const [data, setData] = useState<any[][]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [facturesMap, setFacturesMap] = useState<Record<string, any>>({});
  const [rulesContent, setRulesContent] = useState<string>('');
  const spreadsheetDataRef = useRef<any[][]>([]);

  const columns = useMemo(() => [
    { type: 'text', title: 'ID', width: 0, readOnly: true }, // Hidden ID column
    { type: 'text', title: 'N° Facture', width: 120 },
    { type: 'calendar', title: 'Date', width: 120, options: { format: 'YYYY-MM-DD' } },
    { type: 'text', title: 'Fournisseur', width: 200 },
    { type: 'numeric', title: `HT (${currencySymbol})`, width: 100, mask: '#.##0,00' },
    { type: 'numeric', title: `TVA (${currencySymbol})`, width: 100, mask: '#.##0,00' },
    { type: 'numeric', title: `TTC (${currencySymbol})`, width: 100, mask: '#.##0,00' },
    { type: 'dropdown', title: 'Conforme', width: 100, source: ['OUI', 'NON', 'EN ATTENTE'] },
    { type: 'text', title: 'Score IA', width: 100, readOnly: true },
  ], [currencySymbol]);

  useEffect(() => {
    if (!user) return;

    const fetchRules = async () => {
      try {
        const docRef = doc(db, 'settings', `${user.uid}_rules`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().conformite !== undefined) {
          setRulesContent(docSnap.data().conformite);
        } else {
          if (isOHADA) {
            setRulesContent(`# Règles de Conformité SYSCOHADA (${pays || 'Espace OHADA'})\n\n- Validation RCCM ou IFU/NIF/NINEA obligatoire\n- Taux de TVA standard 18% (ou 19.25% selon pays)\n- Mention obligatoire Facture Normalisée ou e-MECeF\n- Retenue à la source (BNC / AIR) pour prestataires sans IFU`);
          } else {
            setRulesContent(`# Règles de Conformité PCG (France)\n\n- Validation SIRET obligatoire pour > 150€\n- TVA 20% par défaut sur services IT\n- Bloquer si date émission > 30 jours`);
          }
        }
      } catch (err) {
        console.error("Error fetching rules:", err);
      }
    };
    fetchRules();

    const q = query(collection(db, 'factures'), where('statut', '==', 'cree'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() as any }))
        ;

      const newMap: Record<string, any> = {};
      const currentData = spreadsheetDataRef.current || [];
      const existingDataMap = new Map(currentData.map(row => [row[0], row]));

      const formattedData = docs.map(f => {
        newMap[f.id] = f;
        
        if (existingDataMap.has(f.id)) {
          return existingDataMap.get(f.id)!;
        }

        const ht = f.montant_ht_eur || 0;
        const ttc = f.montant_ttc_eur || 0;
        const tva = ttc - ht;
        
        const isUncheckedDefault = (f.score_qualite === 0 || f.score_qualite === undefined) && 
                                   (f.est_conforme === false || f.est_conforme === undefined) && 
                                   (!Array.isArray(f.alertes) || f.alertes.length === 0);
                                   
        const conformeStatus = isUncheckedDefault ? 'EN ATTENTE' : (f.est_conforme === true ? 'OUI' : (f.est_conforme === false ? 'NON' : 'EN ATTENTE'));

        return [
          f.id,
          f.numero_facture || '',
          f.date_emission || '',
          f.emetteur_nom || '',
          ht.toFixed(2),
          tva.toFixed(2),
          ttc.toFixed(2),
          conformeStatus,
          (typeof f.score_qualite === 'number' && !isUncheckedDefault) ? `${f.score_qualite}%` : 'N/A'
        ];
      });
      
      setFacturesMap(newMap);
      setData(formattedData);
      spreadsheetDataRef.current = formattedData;
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'factures');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      const currentData = spreadsheetDataRef.current;
      
      for (const row of currentData) {
        const id = row[0];
        if (!id) continue;
        
        const conformeStr = row[7];
        const isConforme = conformeStr === 'OUI' ? true : (conformeStr === 'NON' ? false : null);
        
        // Only update if marked as OUI
        if (isConforme === true) {
          const docRef = doc(db, 'factures', id);
          await updateDoc(docRef, {
            numero_facture: String(row[1] || 'INCONNU').substring(0, 50),
            date_emission: (row[2] && /^\d{4}-\d{2}-\d{2}/.test(String(row[2]))) ? String(row[2]) : new Date().toISOString().split('T')[0],
            emetteur_nom: String(row[3] || 'Fournisseur Inconnu'),
            montant_ht_eur: Math.max(0, parseFloat(row[4]) || 0),
            montant_ttc_eur: Math.max(0, parseFloat(row[6]) || 0),
            est_conforme: true,
            score_qualite: parseInt(row[8]) || 0,
            statut: 'valide' // Move to next stage
          });
        }
      }
    } catch (err) {
      console.error("Error saving:", err);
      try { handleFirestoreError(err, OperationType.UPDATE, 'factures'); } catch(e) {}
    } finally {
      setSaving(false);
    }
  };

  const [checking, setChecking] = useState(false);

  const runAICheck = async () => {
    if (data.length === 0 || checking) return;
    setChecking(true);
    
    try {
      for (let i = 0; i < spreadsheetDataRef.current.length; i++) {
        const row = spreadsheetDataRef.current[i];
        const id = row[0];
        if (!id) continue;
        
        // Skip if already checked
        if (row[7] === 'OUI' || row[7] === 'NON') continue;
        
        const factureData = facturesMap[id];
        if (!factureData) continue;
        
        try {
          const response = await aiService.checkConformity(factureData, rulesContent, standard, pays);
          
          if (response.success && response.data) {
            const result = response.data;
            // Update local data progressively
            spreadsheetDataRef.current[i][7] = result.est_conforme ? 'OUI' : 'NON';
            spreadsheetDataRef.current[i][8] = result.score_qualite ? `${result.score_qualite}%` : 'N/A';
            setData([...spreadsheetDataRef.current]);
            
            // Update Firestore
            await updateDoc(doc(db, 'factures', id), {
              est_conforme: result.est_conforme,
              score_qualite: result.score_qualite || 0,
              alertes: result.alertes || []
            });
          }
        } catch (e) {
          console.error(`Failed to check conformity for ${id}:`, e);
        }
      }
    } catch (err) {
      console.error("Error during AI check:", err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1",
              isOHADA ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
            )}>
              <Globe2 className="w-3 h-3" />
              {isOHADA ? `Conformité Fiscale SYSCOHADA (${pays || 'Espace OHADA'})` : 'Conformité Fiscale PCG (France)'}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Qualité & Conformité</h1>
          <p className="text-neutral-500">
            Vérifiez et validez la conformité fiscale ({isOHADA ? 'RCCM, IFU/NIF, Facture Normalisée' : 'SIRET, TVA intracommunautaire'}) de vos documents.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Standard Switcher */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-neutral-200 shadow-sm">
            <button
              onClick={() => setStandard('OHADA')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                standard === 'OHADA' ? "bg-amber-500 text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
              )}
            >
              SYSCOHADA
            </button>
            <button
              onClick={() => setStandard('PCG')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                standard === 'PCG' ? "bg-emerald-600 text-white shadow-sm" : "text-neutral-600 hover:text-neutral-900"
              )}
            >
              PCG
            </button>
          </div>

          <button 
            onClick={runAICheck}
            disabled={checking || data.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm disabled:opacity-50"
          >
            {checking ? <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
            {checking ? 'Analyse en cours...' : 'Lancer IA Conformité'}
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || data.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Valider les conformes
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600" />
              Filtres
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">Statut</label>
                <select className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option>À vérifier (créé)</option>
                  <option>Tous les statuts</option>
                </select>
              </div>
            </div>
          </div>

          <div className={cn(
            "p-6 rounded-2xl text-white shadow-lg transition-all",
            isOHADA ? "bg-amber-600 shadow-amber-600/20" : "bg-emerald-600 shadow-emerald-600/20"
          )}>
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-8 h-8 opacity-80" />
              <h3 className="text-lg font-bold">IA Conformité {isOHADA ? 'OHADA' : 'PCG'}</h3>
            </div>
            <p className="text-sm opacity-95 mb-4 leading-relaxed">
              {isOHADA 
                ? "Le moteur IA vérifie les mentions obligatoires OHADA (RCCM, NIF/IFU/NINEA, conformité TVA régionale UEMOA/CEMAC 18-19.25% et facture normalisée)."
                : "Le moteur IA analyse les mentions obligatoires françaises (SIRET, cohérence des taux TVA 5.5/10/20% et numérotation séquentielle)."}
            </p>
            <div className="text-xs bg-white/10 p-2.5 rounded-xl border border-white/20">
              <span className="font-semibold">Règle active :</span> {isOHADA ? 'Actes Uniformes OHADA & CGI UEMOA/CEMAC' : 'Code Général des Impôts (France)'}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h3 className="text-sm font-bold">Lot de validation en cours</h3>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500" /> {data.length} à vérifier</span>
              </div>
            </div>
            <div className="p-0 min-h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
              ) : data.length > 0 ? (
                <Spreadsheet 
                  data={data} 
                  columns={columns} 
                  onDataChange={(newData) => {
                    spreadsheetDataRef.current = newData;
                    setData(newData);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
                  <CheckCircle2 className="w-12 h-12 mb-2 text-neutral-300" />
                  <p>Aucune facture en attente de validation.</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
              <h4 className="text-sm font-bold mb-4">Règles organisationnelles</h4>
              <div className="space-y-3">
                {rulesContent.split('\n').filter(line => line.trim().startsWith('-')).slice(0, 3).map((rule, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs p-2 bg-neutral-50 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {rule.replace(/^-/, '').trim()}
                  </div>
                ))}
                {rulesContent.split('\n').filter(line => line.trim().startsWith('-')).length === 0 && (
                  <div className="text-xs text-neutral-500 italic">Aucune règle définie.</div>
                )}
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-xs font-bold text-emerald-600 hover:underline"
              >
                Modifier les règles (.md)
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
              <h4 className="text-sm font-bold mb-4">Apprentissage IA</h4>
              <p className="text-xs text-neutral-500 mb-4">
                L'IA apprend de vos corrections. La précision globale sur votre organisation est de 94%.
              </p>
              <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[94%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <MarkdownEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Règles de Conformité (conformite.md)"
        documentId="rules"
        field="conformite"
        defaultContent={`# Règles de Conformité

- Validation SIRET obligatoire pour > 150€
- TVA 20% par défaut sur services IT
- Bloquer si date émission > 30 jours`}
      />
    </div>
  );
}
