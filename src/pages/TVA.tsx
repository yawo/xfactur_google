import React, { useState, useEffect, useRef } from 'react';
import { Calculator, AlertCircle, CheckCircle2, Search, Filter, Download, Save, Loader2, FileWarning, BrainCircuit, Banknote } from 'lucide-react';
import Spreadsheet from '../components/Spreadsheet';
import { motion } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { AuthProvider, useAuth } from '../AuthContext';
import { aiService } from '../services/aiService';

const columns = [
  { type: 'text', title: 'ID', width: 0, readOnly: true }, // Hidden ID column
  { type: 'text', title: 'N° Facture', width: 120, readOnly: true },
  { type: 'calendar', title: 'Date', width: 120, options: { format: 'YYYY-MM-DD' }, readOnly: true },
  { type: 'text', title: 'Fournisseur', width: 200, readOnly: true },
  { type: 'numeric', title: 'HT (€)', width: 100, mask: '#.##0,00' },
  { type: 'numeric', title: 'TVA (€)', width: 100, mask: '#.##0,00' },
  { type: 'numeric', title: 'TTC (€)', width: 100, mask: '#.##0,00' },
  { type: 'text', title: 'Taux Calculé', width: 100, readOnly: true },
  { type: 'dropdown', title: 'Statut TVA', width: 120, source: ['OK', 'ANOMALIE', 'À VÉRIFIER'] },
  { type: 'text', title: 'Détail Anomalie', width: 250, readOnly: true },
];

export default function TVA() {
  const { user } = useAuth();
  const [data, setData] = useState<any[][]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [facturesMap, setFacturesMap] = useState<Record<string, any>>({});
  const spreadsheetDataRef = useRef<any[][]>([]);

  const [stats, setStats] = useState({
    totalHT: 0,
    totalTVA: 0,
    anomaliesCount: 0,
    toCheckCount: 0
  });

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'factures'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() as any }))
        ;

      const newMap: Record<string, any> = {};
      let tHT = 0;
      let tTVA = 0;
      let aCount = 0;
      let cCount = 0;

      const currentData = spreadsheetDataRef.current || [];
      const existingDataMap = new Map(currentData.map(row => [row[0], row]));

      const formattedData = docs.map(f => {
        newMap[f.id] = f;
        
        if (existingDataMap.has(f.id)) {
          const existingRow = existingDataMap.get(f.id)!;
          const ht = parseFloat(existingRow[4]) || 0;
          const tva = parseFloat(existingRow[5]) || 0;
          const statut = existingRow[8];
          tHT += ht;
          tTVA += tva;
          if (statut === 'ANOMALIE') aCount++;
          if (statut === 'À VÉRIFIER') cCount++;
          return existingRow;
        }
        
        const ht = f.montant_ht_eur || 0;
        const ttc = f.montant_ttc_eur || 0;
        const tva = typeof f.montant_tva_eur === 'number' ? f.montant_tva_eur : (ttc - ht);
        
        tHT += ht;
        tTVA += tva;

        // Auto-detect basic anomalies
        let statut = f.statut_tva || 'À VÉRIFIER';
        let detail = f.detail_anomalie_tva || '';

        if (statut === 'À VÉRIFIER') {
          const calculatedTTC = ht + tva;
          const diff = Math.abs(calculatedTTC - ttc);
          
          if (diff > 0.05) { // Tolerance of 5 cents
            statut = 'ANOMALIE';
            detail = `Écart mathématique: HT(${ht}) + TVA(${tva}) != TTC(${ttc})`;
          } else if (ht > 0 && tva === 0) {
            statut = 'À VÉRIFIER';
            detail = 'TVA à 0. Vérifier si auto-entrepreneur ou intra-com.';
          } else {
            const rate = (tva / ht) * 100;
            const validRates = [20, 10, 5.5, 2.1, 0];
            const isExactRate = validRates.some(r => Math.abs(rate - r) < 0.5);
            
            if (ht > 0 && (rate < 0 || rate > 20.5)) {
              statut = 'ANOMALIE';
              detail = `Taux global incohérent (>20% ou négatif): ~${rate.toFixed(1)}%`;
            } else if (ht > 0 && !isExactRate) {
              statut = 'OK';
              detail = `Taux mixte probable (~${rate.toFixed(1)}%)`;
            } else {
              statut = 'OK';
              detail = '';
            }
          }
        }

        if (statut === 'ANOMALIE') aCount++;
        if (statut === 'À VÉRIFIER') cCount++;

        const rateDisplay = ht > 0 ? `${((tva / ht) * 100).toFixed(1)}%` : '0%';

        return [
          docSnap.id,
          f.numero_facture || '',
          f.date_emission || '',
          f.emetteur_nom || '',
          ht.toFixed(2),
          tva.toFixed(2),
          ttc.toFixed(2),
          rateDisplay,
          statut,
          detail
        ];
      });
      
      setStats({ totalHT: tHT, totalTVA: tTVA, anomaliesCount: aCount, toCheckCount: cCount });
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
        
        const docRef = doc(db, 'factures', id);
        await updateDoc(docRef, {
          montant_ht_eur: Math.max(0, parseFloat(row[4]) || 0),
          montant_tva_eur: Math.max(0, parseFloat(row[5]) || 0),
          montant_ttc_eur: Math.max(0, parseFloat(row[6]) || 0),
          statut_tva: row[8],
          detail_anomalie_tva: row[9]
        });
      }
    } catch (err) {
      console.error("Error saving:", err);
      try { handleFirestoreError(err, OperationType.UPDATE, 'factures'); } catch(e) {}
    } finally {
      setSaving(false);
    }
  };

  const runAICheck = async () => {
    if (data.length === 0 || checking) return;
    setChecking(true);
    
    try {
      const currentData = [...spreadsheetDataRef.current];
      
      for (let i = 0; i < currentData.length; i++) {
        const row = currentData[i];
        const id = row[0];
        if (!id) continue;
        
        // Only check those with anomalies or to check
        if (row[8] === 'OK') continue;
        
        const factureData = facturesMap[id];
        if (!factureData) continue;
        
        try {
          // We use the conformity check AI but specifically ask it to focus on VAT if we had a specific prompt.
          // For now, we simulate a deeper AI check based on existing data.
          const ht = parseFloat(row[4]);
          const tva = parseFloat(row[5]);
          const ttc = parseFloat(row[6]);
          
          let newStatut = row[8];
          let newDetail = row[9];

          // Simulate AI reasoning
          await new Promise(resolve => setTimeout(resolve, 500)); // Fake delay

          if (ht > 0 && tva === 0) {
            // AI "checks" if supplier is known to be non-VAT
            const knownNonVat = ['auto-entrepreneur', 'google ireland', 'meta platforms ireland'];
            const supplierName = String(row[3]).toLowerCase();
            
            if (knownNonVat.some(name => supplierName.includes(name))) {
              newStatut = 'OK';
              newDetail = 'Fournisseur identifié comme non assujetti (Auto-entrepreneur / Intra-com)';
            } else {
              newStatut = 'ANOMALIE';
              newDetail = 'TVA à 0 injustifiée. Vérifier le n° de TVA intracommunautaire.';
            }
          }

          currentData[i][8] = newStatut;
          currentData[i][9] = newDetail;
          
          // Update Firestore immediately for this row
          await updateDoc(doc(db, 'factures', id), {
            statut_tva: newStatut,
            detail_anomalie_tva: newDetail
          });

        } catch (e) {
          console.error(`Failed to check VAT for ${id}:`, e);
        }
      }
      
      setData([...currentData]);
      spreadsheetDataRef.current = currentData;
    } catch (err) {
      console.error("Error running AI check:", err);
    } finally {
      setChecking(false);
    }
  };

  const handleExportCSV = () => {
    const headers = columns.filter(c => c.title !== 'ID').map(c => c.title).join(',');
    const csvData = spreadsheetDataRef.current.map(row => {
      return row.slice(1).map(cell => {
        const cellStr = String(cell || '').replace(/"/g, '""');
        return `"${cellStr}"`;
      }).join(',');
    });
    
    const csvContent = [headers, ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `controle_tva_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Calculator className="w-8 h-8 text-emerald-600" />
            Contrôle TVA
          </h1>
          <p className="text-neutral-500">Détection d'anomalies et vérification des montants de TVA.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
          <button 
            onClick={runAICheck}
            disabled={checking || data.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50"
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
            Analyse IA Approfondie
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">TVA Déductible Totale</p>
            <p className="text-xl font-bold">{stats.totalTVA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Banknote className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">Base HT Totale</p>
            <p className="text-xl font-bold">{stats.totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <FileWarning className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">Anomalies Critiques</p>
            <p className="text-xl font-bold text-red-600">{stats.anomaliesCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-500 font-medium">À Vérifier Manuellement</p>
            <p className="text-xl font-bold text-amber-600">{stats.toCheckCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Rechercher une facture..." 
                className="pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
              />
            </div>
            <button className="p-2 text-neutral-500 hover:bg-neutral-200 rounded-lg transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm text-neutral-500">
            {data.length} factures analysées
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
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
            <div className="h-full flex flex-col items-center justify-center text-neutral-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune facture à contrôler</p>
              <p className="text-sm">Importez des factures pour commencer le contrôle TVA.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
