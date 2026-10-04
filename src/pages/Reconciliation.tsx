import React, { useState, useEffect, useRef } from 'react';
import { Banknote, Search, Filter, Save, Download, CheckCircle2, AlertCircle, ArrowRightLeft, Loader2, Upload, Trash2 } from 'lucide-react';
import Spreadsheet, { SpreadsheetRef } from '../components/Spreadsheet';
import MarkdownEditorModal from '../components/MarkdownEditorModal';
import { motion } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs, deleteDoc, getDoc } from 'firebase/firestore';
import { AuthProvider, useAuth } from '../AuthContext';
import { aiService } from '../services/aiService';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const columns = [
  { type: 'text', title: 'ID Ligne', width: 0, readOnly: true }, // Hidden
  { type: 'calendar', title: 'Date Opération', width: 120, options: { format: 'YYYY-MM-DD' } },
  { type: 'text', title: 'Libellé Bancaire', width: 250 },
  { type: 'numeric', title: 'Montant Banque (€)', width: 120, mask: '#.##0,00' },
  { type: 'text', title: 'Pièce Comptable', width: 150 },
  { type: 'numeric', title: 'Montant Comptable (€)', width: 120, mask: '#.##0,00' },
  { type: 'dropdown', title: 'Statut', width: 100, source: ['ATTENTE', 'OK', 'ECART'] },
  { type: 'text', title: 'Score IA', width: 100, readOnly: true },
];

export default function Reconciliation() {
  const { user } = useAuth();
  const [data, setData] = useState<any[][]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matching, setMatchingState] = useState(false);
  const matchingRef = useRef(false);
  const setMatching = (val: boolean) => {
    setMatchingState(val);
    matchingRef.current = val;
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lignesReleve, setLignesReleve] = useState<any[]>([]);
  
  const [journalEntries, setJournalEntriesState] = useState<any[]>([]);
  const journalEntriesRef = useRef<any[]>([]);
  const setJournalEntries = (entries: any[]) => {
    setJournalEntriesState(entries);
    journalEntriesRef.current = entries;
  };

  const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending');
  const [compteBanque, setCompteBanque] = useState('512100');
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [rulesContent, setRulesContentState] = useState<string>('');
  const rulesContentRef = useRef<string>('');
  const setRulesContent = (content: string) => {
    setRulesContentState(content);
    rulesContentRef.current = content;
  };
  const spreadsheetDataRef = useRef<any[][]>([]);
  const spreadsheetRef = useRef<SpreadsheetRef>(null);

  const processingLignesIdsRef = useRef<Set<string>>(new Set());
  const hasAutoSyncedRef = useRef(false);

  // Auto-sync effect to fix existing inconsistencies
  useEffect(() => {
    if (!hasAutoSyncedRef.current && journalEntries.length > 0 && lignesReleve.length > 0) {
      hasAutoSyncedRef.current = true;
      lignesReleve.forEach(l => {
        if (l.statut === 'reconcilie' && l.piece_comptable) {
          const matchingJournals = journalEntries.filter(j => j.piece === l.piece_comptable);
          matchingJournals.forEach(j => {
            if (j.statut !== 'reconcilie') {
              updateDoc(doc(db, 'journal', j.id), { statut: 'reconcilie' }).catch(console.error);
            }
            if (j.facture_id) {
              updateDoc(doc(db, 'factures', j.facture_id), { statut: 'rapproche' }).catch(console.error);
            }
          });
        }
      });
    }
  }, [journalEntries, lignesReleve]);

  const runAIMatching = async (lignesToProcess: any[] = lignesReleve) => {
    const toProcess = lignesToProcess.filter(l => !processingLignesIdsRef.current.has(l.id));
    if (toProcess.length === 0 || journalEntriesRef.current.length === 0) return;
    
    toProcess.forEach(l => processingLignesIdsRef.current.add(l.id));
    setMatching(true);
    
    try {
      for (const ligne of toProcess) {
        const i = spreadsheetDataRef.current.findIndex(row => row[0] === ligne.id);
        if (i === -1 || spreadsheetDataRef.current[i][6] === 'OK') continue;
        
        try {
          const pendingJournals = journalEntriesRef.current.filter(j => j.statut === 'cree');
          const result = await aiService.reconcileBank(pendingJournals, [ligne], rulesContentRef.current);
          
          if (result.success && result.data && result.data.matches && result.data.matches.length > 0) {
            const match = result.data.matches[0];
            
            // Update the ref directly
            spreadsheetDataRef.current[i][4] = match.piece_comptable;
            spreadsheetDataRef.current[i][5] = match.montant_comptable.toFixed(2);
            spreadsheetDataRef.current[i][6] = match.score >= 90 ? 'OK' : 'ATTENTE';
            spreadsheetDataRef.current[i][7] = `${match.score}%`;
            
            // Trigger re-render
            setData([...spreadsheetDataRef.current]);
            
            await updateDoc(doc(db, 'lignes_releve', ligne.id), {
              piece_comptable: match.piece_comptable,
              montant_comptable: match.montant_comptable,
              score_ia: match.score,
              statut: match.score >= 90 ? 'valide' : 'attente'
            });
          }
        } catch (e) {
          console.error(`Failed to match line ${ligne.id}:`, e);
          // Fallback basic matching
          const amount = Math.abs(ligne.montant || 0);
          const pendingJournals = journalEntriesRef.current.filter(j => j.statut === 'cree');
          const possibleMatch = pendingJournals.find(j => Math.abs(j.credit || j.debit || 0) === amount);
          
          if (possibleMatch) {
            spreadsheetDataRef.current[i][4] = possibleMatch.piece;
            spreadsheetDataRef.current[i][5] = (possibleMatch.credit || possibleMatch.debit || 0).toFixed(2);
            spreadsheetDataRef.current[i][6] = 'OK';
            spreadsheetDataRef.current[i][7] = '85%';
            setData([...spreadsheetDataRef.current]);
          }
        }
      }
    } catch (err) {
      console.error("Error during AI matching:", err);
    } finally {
      toProcess.forEach(l => processingLignesIdsRef.current.delete(l.id));
      setMatching(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchRules = async () => {
      try {
        const docRef = doc(db, 'settings', `${user.uid}_rules`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().reconciliation !== undefined) {
          setRulesContent(docSnap.data().reconciliation);
        } else {
          setRulesContent(`# Règles de Rapprochement\n\n- Tolérance date: +/- 3j\n- Tolérance montant: 0.00€\n- Mots clés: CB, VIR, PRV\n- Ignorer: "AGIOS"`);
        }
      } catch (err) {
        console.error("Error fetching rules:", err);
      }
    };
    fetchRules();

    // Fetch journal entries
    const qJournal = query(collection(db, 'journal'));

    const unsubscribeJournal = onSnapshot(qJournal, (snapshot) => {
      const entries = snapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        ;
      setJournalEntries(entries);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'journal');
    });

    // Fetch bank statements
    const qReleve = viewMode === 'pending'
      ? query(collection(db, 'lignes_releve'), where('statut', 'in', ['cree', 'attente', 'valide']))
      : query(collection(db, 'lignes_releve'));

    const unsubscribeReleve = onSnapshot(qReleve, (snapshot) => {
      const lignes = snapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        ;
      
      // Sort by date descending
      lignes.sort((a, b) => (b.date_operation || '').localeCompare(a.date_operation || ''));
      
      setLignesReleve(lignes);
      
      const currentData = spreadsheetDataRef.current || [];
      const existingDataMap = new Map(currentData.map(row => [row[0], row]));
      
      const newLignes: any[] = [];

      const spreadsheetData = lignes.map(l => {
        if (existingDataMap.has(l.id)) {
          return existingDataMap.get(l.id)!;
        }
        
        newLignes.push(l);
        
        let statutUI = 'ATTENTE';
        if (l.statut === 'valide' || l.statut === 'reconcilie') statutUI = 'OK';
        
        return [
          l.id,
          l.date_operation || '',
          l.libelle || '',
          (l.montant || 0).toFixed(2),
          l.piece_comptable || '',
          l.montant_comptable ? (l.montant_comptable).toFixed(2) : '',
          statutUI,
          l.score_ia ? `${l.score_ia}%` : ''
        ];
      });
      
      setData(spreadsheetData);
      spreadsheetDataRef.current = spreadsheetData;
      setLoading(false);
      
      if (newLignes.length > 0) {
        runAIMatching(newLignes);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'lignes_releve');
      setLoading(false);
    });

    return () => {
      unsubscribeJournal();
      unsubscribeReleve();
    };
  }, [viewMode, user]);

  const handleDeleteLines = async (idsToDelete: string[]) => {
    if (!user) return;
    try {
      // First, get the lines to find associated pieces
      const linesToDelete = spreadsheetDataRef.current.filter(row => idsToDelete.includes(row[0]));
      const piecesToUnreconcile = linesToDelete.map(row => String(row[4] || '')).filter(Boolean);

      for (const id of idsToDelete) {
        if (!id) continue;
        console.log("Deleting doc from Firestore:", id);
        await deleteDoc(doc(db, 'lignes_releve', id));
        console.log("Successfully deleted doc:", id);
      }

      // If there were pieces associated with the deleted lines, we need to clean up
      if (piecesToUnreconcile.length > 0) {
        const journalSnap = await getDocs(query(collection(db, 'journal')));
        const journals = journalSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

        for (const piece of piecesToUnreconcile) {
          const matchingJournals = journals.filter(j => j.piece === piece);
          for (const j of matchingJournals) {
            // Revert the journal entry to 'cree'
            await updateDoc(doc(db, 'journal', j.id), { statut: 'cree' });
            
            // Revert facture status to 'alloue'
            if (j.facture_id) {
              await updateDoc(doc(db, 'factures', j.facture_id), { statut: 'alloue' }).catch(console.error);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error deleting lines:", err);
      try { handleFirestoreError(err, OperationType.DELETE, 'lignes_releve'); } catch(e) {}
    }
  };

  const handleDeleteSelected = () => {
    const inst = spreadsheetRef.current?.getInstance();
    if (!inst) return;
    
    const sheet = Array.isArray(inst) ? inst[0] : inst;
    if (!sheet) return;
    
    try {
      // In jspreadsheet v5, getSelectedRows(true) returns an array of selected row indices
      let selectedRows = [];
      if (typeof sheet.getSelectedRows === 'function') {
        selectedRows = sheet.getSelectedRows(true) || [];
      }
      
      // Fallback to getSelection if getSelectedRows is empty
      if (selectedRows.length === 0 && typeof sheet.getSelection === 'function') {
        const selection = sheet.getSelection();
        if (selection && selection.length === 4) {
          const y1 = Math.min(selection[1], selection[3]);
          const y2 = Math.max(selection[1], selection[3]);
          for (let i = y1; i <= y2; i++) {
            selectedRows.push(i);
          }
        }
      }
      
      const currentData = sheet.getData();
      
      // If nothing is selected but there's only 1 row, assume they want to delete it
      if (selectedRows.length === 0 && currentData.length === 1) {
        selectedRows = [0];
      }
      
      console.log("Selected rows to delete:", selectedRows);
      
      // BYPASS: jspreadsheet prevents deleting the last row.
      // If we are deleting all rows (or the last row), handle it manually.
      if (selectedRows.length === currentData.length || currentData.length <= 1) {
        console.log("Bypassing jspreadsheet deleteRow to remove the last row(s)");
        
        const idsToDelete = selectedRows.map((idx: number) => currentData[idx]?.[0]).filter(Boolean);
        if (idsToDelete.length > 0) {
          handleDeleteLines(idsToDelete);
        }
        
        // Update local state to empty
        setData([]);
        spreadsheetDataRef.current = [];
        
        // Clear the sheet visually with an empty row so jspreadsheet doesn't crash
        try {
          const emptyRow = Array(sheet.options.columns?.length || 10).fill('');
          sheet.setData([emptyRow]);
        } catch (e) {
          console.error("Error clearing sheet:", e);
        }
        return;
      }
      
      if (selectedRows.length > 0) {
        // Sort descending to avoid index shifting
        const sortedRows = [...selectedRows].sort((a, b) => b - a);
        for (const rowIndex of sortedRows) {
          console.log("Deleting row index:", rowIndex);
          sheet.deleteRow(rowIndex, 1);
        }
      } else {
        // Fallback if no selection is found but deleteRow might still work
        console.log("No selected rows found, calling deleteRow() without args");
        sheet.deleteRow();
      }
    } catch (e) {
      console.error("Error deleting rows:", e);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      const currentData = spreadsheetDataRef.current;
      
      for (const row of currentData) {
        const id = row[0];
        const statutUI = row[6];
        if (!id) continue;
        
        if (viewMode === 'pending' && statutUI !== 'OK') continue;
        
        const newStatut = statutUI === 'OK' ? 'reconcilie' : 'attente';
        
        await updateDoc(doc(db, 'lignes_releve', id), {
          statut: newStatut,
          piece_comptable: String(row[4] || ''),
          montant_comptable: parseFloat(row[5]) || 0
        });
        
        // Find matching journal entries and update them
        const piece = String(row[4] || '');
        if (piece) {
          const matchingJournals = journalEntriesRef.current.filter(j => j.piece === piece);
          for (const matchingJournal of matchingJournals) {
            if (newStatut === 'reconcilie') {
              await updateDoc(doc(db, 'journal', matchingJournal.id), {
                statut: 'reconcilie'
              });
              
              if (matchingJournal.facture_id) {
                await updateDoc(doc(db, 'factures', matchingJournal.facture_id), {
                  statut: 'rapproche'
                });
              }
            } else {
              // Un-reconcile: revert journal to 'cree' and facture to 'alloue'
              await updateDoc(doc(db, 'journal', matchingJournal.id), { statut: 'cree' });
              
              if (matchingJournal.facture_id) {
                await updateDoc(doc(db, 'factures', matchingJournal.facture_id), {
                  statut: 'alloue'
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error saving reconciliation:", err);
      try { handleFirestoreError(err, OperationType.UPDATE, 'lignes_releve'); } catch(e) {}
    } finally {
      setSaving(false);
    }
  };

  const processBankStatement = async (file: File) => {
    return new Promise<any[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) return reject(new Error("Fichier vide"));

          let csvText = "";
          if (file.name.toLowerCase().endsWith('.csv')) {
            csvText = data as string;
          } else if (file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx')) {
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            csvText = XLSX.utils.sheet_to_csv(worksheet);
          }

          // Call AI to extract
          aiService.extractBankStatement(csvText).then(result => {
            if (!result.success || !result.data || !result.data.transactions) {
              return reject(new Error("L'IA n'a pas pu extraire les transactions."));
            }

            const mappedLines = result.data.transactions.map((t: any) => ({
              organisation_id: user.uid,
              date_operation: t.date,
              libelle: t.libelle || 'Opération inconnue',
              montant: t.montant || 0,
              statut: 'cree',
              compte_banque: compteBanque,
              source_file: file.name,
              createdAt: serverTimestamp(),
              author_uid: user.uid
            })).filter((l: any) => l.montant !== 0);

            if (mappedLines.length === 0) {
              return reject(new Error("Aucune opération valide trouvée par l'IA."));
            }

            resolve(mappedLines);
          }).catch(err => {
            reject(new Error("Erreur lors de l'extraction IA: " + err.message));
          });
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = (err) => reject(err);
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        reader.readAsText(file, 'UTF-8');
      } else {
        reader.readAsBinaryString(file);
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    
    setLoading(true);
    setUploadError(null);
    try {
      const file = e.target.files[0];
      const lines = await processBankStatement(file);
      
      for (const line of lines) {
        await addDoc(collection(db, 'lignes_releve'), line);
      }
    } catch (err: any) {
      console.error("Error uploading bank statement:", err);
      const serverError = err.response?.data?.error || err.message;
      setUploadError(`Erreur lors de l'importation du fichier: ${serverError}`);
      try { handleFirestoreError(err, OperationType.CREATE, 'lignes_releve'); } catch(e) {}
    } finally {
      setLoading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const totalRapproche = data.filter(r => r[6] === 'OK').reduce((sum, r) => sum + (parseFloat(r[5]) || 0), 0);
  const totalAttente = data.filter(r => r[6] !== 'OK').reduce((sum, r) => sum + Math.abs(parseFloat(r[3]) || 0), 0);

  const handleExportCSV = () => {
    if (data.length === 0) return;

    let csvContent = "Date,Libelle Operation,Montant (EUR),Piece Comptable,Montant Rapproche (EUR),Statut,Score IA\n";
    
    data.forEach(row => {
      const date = `"${String(row[1] || '').replace(/"/g, '""')}"`;
      const libelle = `"${String(row[2] || '').replace(/"/g, '""')}"`;
      const montant = parseFloat(row[3]) || 0;
      const piece = `"${String(row[4] || '').replace(/"/g, '""')}"`;
      const montantRapproche = parseFloat(row[5]) || 0;
      const statut = `"${String(row[6] || '').replace(/"/g, '""')}"`;
      const score = `"${String(row[7] || '').replace(/"/g, '""')}"`;
      
      csvContent += `${date},${libelle},${montant.toFixed(2).replace('.', ',')},${piece},${montantRapproche.toFixed(2).replace('.', ',')},${statut},${score}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reconciliation_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Réconciliation Bancaire</h1>
          <p className="text-neutral-500">Rapprochez vos opérations bancaires avec vos écritures comptables.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl mr-2">
            <button
              onClick={() => setViewMode('pending')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'pending' ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              À rapprocher
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'history' ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Historique complet
            </button>
          </div>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-neutral-200 rounded-xl shadow-sm">
            <label className="text-xs font-bold text-neutral-500">Compte Banque:</label>
            <input 
              type="text" 
              value={compteBanque}
              onChange={(e) => setCompteBanque(e.target.value)}
              className="w-20 px-2 py-1 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            Importer Relevé
            <input 
              type="file" 
              accept=".csv,.xls,.xlsx" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={loading}
            />
          </label>
          <button 
            onClick={handleSave}
            disabled={saving || (viewMode === 'pending' ? data.filter(r => r[6] === 'OK').length === 0 : data.length === 0)}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Valider le rapprochement
          </button>
        </div>
      </header>

      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold">Erreur d'importation</h3>
            <p className="text-sm mt-1">{uploadError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h3 className="text-sm font-bold">{viewMode === 'pending' ? 'Rapprochement BNP - Mois en cours' : 'Historique des Rapprochements'}</h3>
              <div className="flex items-center gap-4">
                <div className="text-xs font-bold text-emerald-600">Rapproché: {totalRapproche.toFixed(2)} €</div>
                <div className="text-xs font-bold text-amber-600">En suspens: {totalAttente.toFixed(2)} €</div>
              </div>
            </div>
            <div className="p-0 min-h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
              ) : data.length > 0 ? (
                <Spreadsheet 
                  ref={spreadsheetRef}
                  data={data} 
                  columns={columns} 
                  onDataChange={(newData) => {
                    console.log("onDataChange triggered, new length:", newData.length);
                    const oldIds = new Set(spreadsheetDataRef.current.map(r => r[0]).filter(Boolean));
                    const newIds = new Set(newData.map(r => r[0]).filter(Boolean));
                    
                    const missingIds = [...oldIds].filter(id => !newIds.has(id));
                    console.log("Missing IDs to delete:", missingIds);
                    
                    if (missingIds.length > 0) {
                      handleDeleteLines(missingIds);
                    }
                    
                    spreadsheetDataRef.current = newData;
                    setData(newData);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
                  <Banknote className="w-12 h-12 mb-2 text-neutral-300" />
                  <p className="font-medium text-neutral-600 mb-1">{viewMode === 'pending' ? "Aucune ligne de relevé bancaire à rapprocher." : "Aucune opération bancaire trouvée."}</p>
                  {viewMode === 'pending' && <p className="text-xs text-neutral-500">Importez un relevé bancaire (CSV/Excel) pour le rapprocher avec vos écritures en attente.</p>}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
              <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                Matching Automatique
              </h4>
              <p className="text-xs text-neutral-500 mb-6">
                Le moteur de réconciliation utilise la proximité des dates, des montants et l'analyse sémantique des libellés.
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => runAIMatching(lignesReleve)}
                  disabled={matching || data.length === 0 || viewMode === 'history'}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  {matching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {matching ? 'Analyse en cours...' : 'Lancer IA Matching'}
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col">
              <h4 className="text-sm font-bold mb-4">Écritures en attente (Fournisseurs)</h4>
              <p className="text-xs text-neutral-500 mb-4">
                Ces écritures issues de vos factures allouées attendent d'être rapprochées avec un relevé bancaire.
              </p>
              <div className="space-y-2 overflow-y-auto flex-1 max-h-48 pr-2">
                {journalEntries.filter(j => j.statut === 'cree' && String(j.compte_id || '').startsWith('401')).length > 0 ? (
                  journalEntries
                    .filter(j => j.statut === 'cree' && String(j.compte_id || '').startsWith('401'))
                    .map((entry, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-700">{entry.piece || 'Sans pièce'}</span>
                          <span className="text-neutral-500 truncate max-w-[150px]">{entry.libelle || 'Inconnu'}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-neutral-900">{(entry.credit || entry.debit || 0).toFixed(2)} €</span>
                          <span className="text-[10px] text-neutral-400">{entry.date_ecriture}</span>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-neutral-400 text-xs italic">
                    Aucune écriture fournisseur en attente.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              IA Réconciliation
            </h3>
            <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
              Le moteur IA a réconcilié <strong>{data.filter(r => r[6] === 'OK').length} opérations</strong> automatiquement. 
            </p>
            <div className="p-4 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-600/20">
              <p className="text-[10px] font-bold uppercase mb-1 opacity-80">Performance</p>
              <p className="text-2xl font-bold">
                {data.length > 0 ? Math.round((data.filter(r => r[6] === 'OK').length / data.length) * 100) : 0}%
              </p>
              <p className="text-[10px] mt-1 opacity-80">Taux de succès ce mois</p>
            </div>
          </div>

          <div className="bg-neutral-900 p-6 rounded-2xl text-white shadow-xl">
            <h3 className="text-sm font-bold mb-4">Règles de rapprochement</h3>
            <div className="font-mono text-[10px] text-emerald-400 space-y-2 opacity-80">
              <p># reconciliation_org.md</p>
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
        title="Règles de Rapprochement (reconciliation_org.md)"
        documentId="rules"
        field="reconciliation"
        defaultContent={`# Règles de Rapprochement

- Tolérance date: +/- 3j
- Tolérance montant: 0.00€
- Mots clés: CB, VIR, PRV
- Ignorer: "AGIOS"`}
      />
    </div>
  );
}
