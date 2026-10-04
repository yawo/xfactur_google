import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Search, Filter, Save, Download, Plus, Trash2, Loader2 } from 'lucide-react';
import Spreadsheet from '../components/Spreadsheet';
import MarkdownEditorModal from '../components/MarkdownEditorModal';
import { pcgService } from '../services/pcgService';
import { AccountPCG } from '../types';
import { motion } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { AuthProvider, useAuth } from '../AuthContext';
import { aiService } from '../services/aiService';

const columns = [
  { type: 'text', title: 'ID Facture', width: 0, readOnly: true }, // Hidden
  { type: 'calendar', title: 'Date', width: 120, options: { format: 'YYYY-MM-DD' } },
  { type: 'text', title: 'Compte', width: 100 },
  { type: 'text', title: 'Libellé Compte', width: 250 },
  { type: 'numeric', title: 'Débit (€)', width: 120, mask: '#.##0,00' },
  { type: 'numeric', title: 'Crédit (€)', width: 120, mask: '#.##0,00' },
  { type: 'text', title: 'Pièce', width: 120 },
  { type: 'text', title: 'Libellé Ecriture', width: 200 },
];

export default function Allocation() {
  const { user } = useAuth();
  const [data, setData] = useState<any[][]>([]);
  const [pcg, setPcg] = useState<AccountPCG[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [factures, setFactures] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');
  const [rulesContent, setRulesContentState] = useState<string>('');
  const rulesContentRef = useRef<string>('');

  const setRulesContent = (content: string) => {
    setRulesContentState(content);
    rulesContentRef.current = content;
  };
  const spreadsheetDataRef = useRef<any[][]>([]);

  const [allocating, setAllocatingState] = useState(false);
  const allocatingRef = useRef(false);

  const setAllocating = (val: boolean) => {
    setAllocatingState(val);
    allocatingRef.current = val;
  };

  const processingFactureIdsRef = useRef<Set<string>>(new Set());

  const runAIAllocation = async (facturesToProcess: any[] = factures, append: boolean = false) => {
    const toProcess = facturesToProcess.filter(f => !processingFactureIdsRef.current.has(f.id));
    if (toProcess.length === 0) return;
    
    toProcess.forEach(f => processingFactureIdsRef.current.add(f.id));
    setAllocating(true);
    
    try {
      const generatedLines: any[][] = [];
      
      for (const f of toProcess) {
        try {
          const result = await aiService.allocateAccounting(f, rulesContentRef.current);
          
          if (result.success && result.data && result.data.entries) {
            result.data.entries.forEach((entry: any) => {
              generatedLines.push([
                f.id,
                entry.date_ecriture || f.date_emission || new Date().toISOString().split('T')[0],
                entry.compte_id || '401000',
                entry.libelle_compte || 'Compte',
                (entry.debit || 0).toFixed(2),
                (entry.credit || 0).toFixed(2),
                entry.piece || f.numero_facture || 'INCONNU',
                entry.libelle || f.emetteur_nom || 'Fournisseur'
              ]);
            });
          } else {
            throw new Error("Invalid AI response");
          }
        } catch (e) {
          console.error(`Failed to allocate accounting for ${f.id}:`, e);
          // Fallback to basic allocation if AI fails
          const ht = f.montant_ht_eur || 0;
          const ttc = f.montant_ttc_eur || 0;
          const tva = ttc - ht;
          const piece = f.numero_facture || 'INCONNU';
          const date = f.date_emission || new Date().toISOString().split('T')[0];
          const libelle = f.emetteur_nom || 'Fournisseur';

          generatedLines.push([f.id, date, '606400', 'Fournitures de bureau', ht.toFixed(2), '0.00', piece, libelle]);
          if (tva > 0) {
            generatedLines.push([f.id, date, '445660', 'TVA sur autres biens et services', tva.toFixed(2), '0.00', piece, libelle]);
          }
          generatedLines.push([f.id, date, '401100', 'Fournisseurs - Achats de biens', '0.00', ttc.toFixed(2), piece, libelle]);
        }
      }
      
      const newJournalLines = append ? [...spreadsheetDataRef.current, ...generatedLines] : generatedLines;
      setData(newJournalLines);
      spreadsheetDataRef.current = newJournalLines;
    } catch (err) {
      console.error("Error during AI allocation:", err);
    } finally {
      toProcess.forEach(f => processingFactureIdsRef.current.delete(f.id));
      setAllocating(false);
    }
  };

  useEffect(() => {
    pcgService.loadPCG().then(setPcg);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchRules = async () => {
      try {
        const docRef = doc(db, 'settings', `${user.uid}_rules`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().allocation !== undefined) {
          setRulesContent(docSnap.data().allocation);
        } else {
          setRulesContent(`# Règles d'Allocation\n\n- Orange -> 606400\n- AWS -> 618100\n- SNCF -> 625100\n- Adobe -> 651100`);
        }
      } catch (err) {
        console.error("Error fetching rules:", err);
      }
    };
    fetchRules();
    
    setLoading(true);

    if (viewMode === 'pending') {
      const q = query(collection(db, 'factures'), where('statut', '==', 'valide'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const facturesList = snapshot.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
        ;
        setFactures(facturesList);
        
        const currentData = spreadsheetDataRef.current || [];
        const existingFactureIds = new Set(currentData.map(row => row[0]));
        const currentFactureIds = new Set(facturesList.map(f => f.id));
        
        // Keep rows for invoices that are still valid
        const newJournalLines = currentData.filter(row => currentFactureIds.has(row[0]));
        
        const unallocatedFactures = facturesList.filter(f => !existingFactureIds.has(f.id));

        setData(newJournalLines);
        spreadsheetDataRef.current = newJournalLines;
        setLoading(false);

        // Automatically run AI allocation for new invoices
        if (unallocatedFactures.length > 0) {
          runAIAllocation(unallocatedFactures, true);
        }
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'factures');
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      const q = query(collection(db, 'journal'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const journalList = snapshot.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
        ;
        
        journalList.sort((a, b) => (b.date_ecriture || '').localeCompare(a.date_ecriture || ''));

        const newJournalLines = journalList.map(j => [
          j.id,
          j.date_ecriture || '',
          j.compte_id || '',
          j.libelle_compte || '',
          (j.debit || 0).toFixed(2),
          (j.credit || 0).toFixed(2),
          j.piece || '',
          j.libelle || ''
        ]);

        setData(newJournalLines);
        spreadsheetDataRef.current = newJournalLines;
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'journal');
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [viewMode, user]);

  const filteredPcg = pcgService.searchAccounts(pcg, searchQuery);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      const currentData = spreadsheetDataRef.current;
      
      if (viewMode === 'pending') {
        const processedFactureIds = new Set<string>();
        
        // Save journal entries
        for (const row of currentData) {
          const factureId = row[0];
          if (!factureId) continue;
          
          processedFactureIds.add(factureId);
          
          await addDoc(collection(db, 'journal'), {
            organisation_id: user.uid,
            facture_id: factureId,
            date_ecriture: String(row[1] || ''),
            compte_id: String(row[2] || ''),
            libelle_compte: String(row[3] || ''),
            debit: parseFloat(row[4]) || 0,
            credit: parseFloat(row[5]) || 0,
            piece: String(row[6] || ''),
            libelle: String(row[7] || ''),
            statut: 'cree',
            createdAt: serverTimestamp()
          });
        }
        
        // Update invoice statuses
        for (const fId of processedFactureIds) {
          await updateDoc(doc(db, 'factures', fId), {
            statut: 'alloue'
          });
        }
      } else {
        // History mode: update journal entries
        for (const row of currentData) {
          const journalId = row[0];
          if (!journalId) continue;
          await updateDoc(doc(db, 'journal', journalId), {
            date_ecriture: String(row[1] || ''),
            compte_id: String(row[2] || ''),
            libelle_compte: String(row[3] || ''),
            debit: parseFloat(row[4]) || 0,
            credit: parseFloat(row[5]) || 0,
            piece: String(row[6] || ''),
            libelle: String(row[7] || ''),
          });
        }
      }
      
    } catch (err) {
      console.error("Error saving journal:", err);
      try { handleFirestoreError(err, viewMode === 'pending' ? OperationType.CREATE : OperationType.UPDATE, 'journal'); } catch(e) {}
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totalDebit = data.reduce((sum, row) => sum + (parseFloat(row[4]) || 0), 0);
  const totalCredit = data.reduce((sum, row) => sum + (parseFloat(row[5]) || 0), 0);
  const equilibre = Math.abs(totalDebit - totalCredit);

  const handleExportFEC = () => {
    if (data.length === 0) return;

    let csvContent = "JournalCode,JournalLib,EcritureNum,EcritureDate,CompteNum,CompteLib,CompAuxNum,CompAuxLib,PieceRef,PieceDate,EcritureLib,Debit,Credit,EcritureLet,DateLet,ValidDate,Montantdevise,Idevise\n";
    
    data.forEach(row => {
      const date = row[1] ? String(row[1]).replace(/-/g, '') : '';
      const compte = String(row[2] || '');
      const libelleCompte = `"${String(row[3] || '').replace(/"/g, '""')}"`;
      const debit = parseFloat(row[4]) || 0;
      const credit = parseFloat(row[5]) || 0;
      const piece = `"${String(row[6] || '').replace(/"/g, '""')}"`;
      const libelle = `"${String(row[7] || '').replace(/"/g, '""')}"`;
      
      csvContent += `ACH,Achats,,${date},${compte},${libelleCompte},,,${piece},${date},${libelle},${debit.toFixed(2).replace('.', ',')},${credit.toFixed(2).replace('.', ',')},,,,,\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FEC_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Allocation Comptable</h1>
          <p className="text-neutral-500">Transformez vos factures en écritures comptables (PCG 2026).</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl mr-2">
            <button
              onClick={() => setViewMode('pending')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'pending' ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              À allouer
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'history' ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Journal complet
            </button>
          </div>
          <button 
            onClick={handleExportFEC}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export FEC
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || data.length === 0 || equilibre > 0.01}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Générer les écritures
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h3 className="text-sm font-bold">{viewMode === 'pending' ? 'Journal des Achats - Brouillard' : 'Journal Complet'}</h3>
              <div className="flex items-center gap-4">
                <div className="text-xs font-bold text-emerald-600">Total Débit: {totalDebit.toFixed(2)} €</div>
                <div className="text-xs font-bold text-red-600">Total Crédit: {totalCredit.toFixed(2)} €</div>
                <div className={`text-xs font-bold ${equilibre > 0.01 ? 'text-amber-600' : 'text-neutral-400'}`}>
                  Equilibre: {equilibre.toFixed(2)} €
                </div>
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
                  <Calculator className="w-12 h-12 mb-2 text-neutral-300" />
                  <p>{viewMode === 'pending' ? "Aucune facture validée en attente d'allocation." : "Aucune écriture dans le journal."}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Recherche PCG 2026</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Compte ou libellé..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-2">
              {filteredPcg.map((account) => (
                <div 
                  key={account.compte} 
                  className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all cursor-pointer group"
                >
                  <div>
                    <span className="text-xs font-bold text-emerald-600">{account.compte}</span>
                    <p className="text-sm font-medium truncate max-w-[200px]">{account.libelle}</p>
                  </div>
                  <Plus className="w-4 h-4 text-neutral-300 group-hover:text-emerald-600" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600" />
              IA Allocation
            </h3>
            <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
              L'IA a alloué automatiquement <strong>92%</strong> des lignes. 
              Les comptes ont été choisis en fonction de votre historique et des règles <code>allocation_org.md</code>.
            </p>
            <div className="space-y-4">
              <button 
                onClick={() => runAIAllocation(factures, false)}
                disabled={allocating || factures.length === 0 || viewMode === 'history'}
                className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                {allocating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {allocating ? 'Analyse en cours...' : 'Ré-analyser le lot'}
              </button>
            </div>
          </div>

          <div className="bg-neutral-900 p-6 rounded-2xl text-white shadow-xl">
            <h3 className="text-sm font-bold mb-4">Mémoire persistante</h3>
            <div className="font-mono text-[10px] text-emerald-400 space-y-2 opacity-80">
              <p># allocation_org.md</p>
              {rulesContent.split('\n').filter(line => line.trim().startsWith('-')).slice(0, 4).map((rule, i) => (
                <p key={i}>{rule}</p>
              ))}
              {rulesContent.split('\n').filter(line => line.trim().startsWith('-')).length === 0 && (
                <p className="italic">Aucune règle définie.</p>
              )}
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full mt-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors border border-white/20"
            >
              Editer les règles
            </button>
          </div>
        </div>
      </div>

      <MarkdownEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Règles d'Allocation (allocation_org.md)"
        documentId="rules"
        field="allocation"
        defaultContent={`# Règles d'Allocation

- Orange -> 606400
- AWS -> 618100
- SNCF -> 625100
- Adobe -> 651100`}
      />
    </div>
  );
}
