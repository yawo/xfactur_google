import React, { useState, useEffect } from 'react';
import { BookOpen, AlertCircle, CheckCircle2, Download, Loader2, Plus } from 'lucide-react';
import Spreadsheet from '../components/Spreadsheet';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';

import { AuthProvider, useAuth } from '../AuthContext';

const columns = [
  { type: 'text', title: 'ID', width: 0, readOnly: true },
  { type: 'calendar', title: 'Date', width: 100, options: { format: 'YYYY-MM-DD' } },
  { type: 'text', title: 'Compte', width: 80 },
  { type: 'text', title: 'Libellé Compte', width: 150 },
  { type: 'numeric', title: 'Débit (€)', width: 100, mask: '#.##0,00' },
  { type: 'numeric', title: 'Crédit (€)', width: 100, mask: '#.##0,00' },
  { type: 'text', title: 'Pièce', width: 100 },
  { type: 'text', title: 'Libellé Ecriture', width: 150 },
  { type: 'text', title: 'Statut', width: 100, readOnly: true },
  { type: 'text', title: 'Opération Banque', width: 150, readOnly: true },
  { type: 'numeric', title: 'Montant Banque', width: 100, readOnly: true },
];

export default function Journal() {
  const { user } = useAuth();
  const [data, setData] = useState<any[][]>([]);
  const [loading, setLoading] = useState(true);
  const [ecarts, setEcarts] = useState<any[]>([]);
  const [applying, setApplying] = useState<string | null>(null);
  
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [releveEntries, setReleveEntries] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const qJournal = query(collection(db, 'journal'));

    const unsubscribeJournal = onSnapshot(qJournal, (snapshot) => {
      const journalList = snapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        ;
      journalList.sort((a, b) => (b.date_ecriture || '').localeCompare(a.date_ecriture || ''));
      setJournalEntries(journalList);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'journal');
      setLoading(false);
    });

    const qReleve = query(collection(db, 'lignes_releve'), where('statut', '==', 'reconcilie'));

    const unsubscribeReleve = onSnapshot(qReleve, (snapshot) => {
      const lignes = snapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        ;
      setReleveEntries(lignes);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'lignes_releve');
    });

    return () => {
      unsubscribeJournal();
      unsubscribeReleve();
    };
  }, [user]);

  useEffect(() => {
    const newJournalLines = journalEntries.map(j => {
      const matchingReleve = releveEntries.find(r => r.piece_comptable === j.piece && j.piece);
      return [
        j.id,
        j.date_ecriture || '',
        j.compte_id || '',
        j.libelle_compte || '',
        (j.debit || 0).toFixed(2),
        (j.credit || 0).toFixed(2),
        j.piece || '',
        j.libelle || '',
        j.statut === 'reconcilie' ? 'RÉCONCILIÉ' : (j.statut || 'EN ATTENTE').toUpperCase(),
        matchingReleve ? matchingReleve.libelle : '',
        matchingReleve ? (matchingReleve.montant || 0).toFixed(2) : ''
      ];
    });

    const bankLines = releveEntries.flatMap(r => {
      const isExpense = (r.montant || 0) < 0;
      const amount = Math.abs(r.montant || 0);
      
      const lines = [];
      
      // Bank line
      lines.push([
        r.id + '_bank',
        r.date_operation || '',
        r.compte_banque || '512100',
        'Banque',
        isExpense ? '0.00' : amount.toFixed(2),
        isExpense ? amount.toFixed(2) : '0.00',
        r.piece_comptable || '',
        r.libelle || '',
        r.statut === 'reconcilie' ? 'RÉCONCILIÉ' : (r.statut || 'EN ATTENTE').toUpperCase(),
        r.libelle || '',
        (r.montant || 0).toFixed(2)
      ]);

      // Counterpart line
      const thirdPartyLine = journalEntries.find(j => j.piece === r.piece_comptable && j.compte_id && j.compte_id.startsWith('4'));
      const compteCounterpart = thirdPartyLine ? thirdPartyLine.compte_id : (isExpense ? '401000' : '411000');
      const libelleCounterpart = thirdPartyLine ? thirdPartyLine.libelle_compte : (isExpense ? 'Fournisseurs' : 'Clients');

      lines.push([
        r.id + '_counterpart',
        r.date_operation || '',
        compteCounterpart,
        libelleCounterpart,
        isExpense ? amount.toFixed(2) : '0.00',
        isExpense ? '0.00' : amount.toFixed(2),
        r.piece_comptable || '',
        `Règlement ${r.libelle || ''}`,
        r.statut === 'reconcilie' ? 'RÉCONCILIÉ' : (r.statut || 'EN ATTENTE').toUpperCase(),
        r.libelle || '',
        (r.montant || 0).toFixed(2)
      ]);

      return lines;
    });

    const allLines = [...newJournalLines, ...bankLines];
    allLines.sort((a, b) => (b[1] || '').localeCompare(a[1] || ''));

    setData(allLines);

    const newEcarts = releveEntries.filter(l => 
      !l.ecart_ajuste && 
      Math.abs(l.montant || 0) !== Math.abs(l.montant_comptable || 0)
    ).map(l => {
      const diff = Math.abs(l.montant || 0) - Math.abs(l.montant_comptable || 0);
      const isExpense = (l.montant || 0) < 0;
      
      let compteDebit = '';
      let compteCredit = '';
      let libelleCompteDebit = '';
      let libelleCompteCredit = '';
      let type = '';

      if (isExpense) {
        if (diff > 0) {
          compteDebit = '627000';
          libelleCompteDebit = 'Services bancaires et assimilés';
          compteCredit = l.compte_banque || '512100';
          libelleCompteCredit = 'Banque';
          type = 'Frais bancaires';
        } else {
          compteDebit = '401000';
          libelleCompteDebit = 'Fournisseurs';
          compteCredit = '765000';
          libelleCompteCredit = 'Escomptes obtenus';
          type = 'Escompte obtenu';
        }
      } else {
        if (diff > 0) {
          compteDebit = l.compte_banque || '512100';
          libelleCompteDebit = 'Banque';
          compteCredit = '766000';
          libelleCompteCredit = 'Gains de change';
          type = 'Gain de change';
        } else {
          compteDebit = '622500';
          libelleCompteDebit = 'Commissions et courtages';
          compteCredit = '411000';
          libelleCompteCredit = 'Clients';
          type = 'Commission (ex: Stripe)';
        }
      }

      return {
        id: l.id,
        date: l.date_operation,
        piece: l.piece_comptable,
        libelle: l.libelle,
        diff: Math.abs(diff),
        type,
        compteDebit,
        libelleCompteDebit,
        compteCredit,
        libelleCompteCredit
      };
    });

    setEcarts(newEcarts);
  }, [journalEntries, releveEntries]);

  const handleApplySuggestion = async (ecart: any) => {
    if (!user) return;
    setApplying(ecart.id);
    
    try {
      // Debit line
      await addDoc(collection(db, 'journal'), {
        organisation_id: user.uid,
        date_ecriture: ecart.date || new Date().toISOString().split('T')[0],
        compte_id: ecart.compteDebit,
        libelle_compte: ecart.libelleCompteDebit,
        debit: ecart.diff,
        credit: 0,
        piece: ecart.piece || 'AJUSTEMENT',
        libelle: `Ajustement: ${ecart.libelle || ecart.type}`,
        statut: 'reconcilie',
        createdAt: serverTimestamp()
      });
      
      // Credit line
      await addDoc(collection(db, 'journal'), {
        organisation_id: user.uid,
        date_ecriture: ecart.date || new Date().toISOString().split('T')[0],
        compte_id: ecart.compteCredit,
        libelle_compte: ecart.libelleCompteCredit,
        debit: 0,
        credit: ecart.diff,
        piece: ecart.piece || 'AJUSTEMENT',
        libelle: `Ajustement: ${ecart.libelle || ecart.type}`,
        statut: 'reconcilie',
        createdAt: serverTimestamp()
      });
      
      // Mark as adjusted
      await updateDoc(doc(db, 'lignes_releve', ecart.id), {
        ecart_ajuste: true
      });
    } catch (err) {
      console.error("Error applying adjustment:", err);
      try { handleFirestoreError(err, OperationType.CREATE, 'journal'); } catch(e) {}
    } finally {
      setApplying(null);
    }
  };

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
      
      csvContent += `OD,Opérations Diverses,,${date},${compte},${libelleCompte},,,${piece},${date},${libelle},${debit.toFixed(2).replace('.', ',')},${credit.toFixed(2).replace('.', ',')},,,,,\n`;
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
          <h1 className="text-3xl font-bold tracking-tight">Journal Général</h1>
          <p className="text-neutral-500">Consultez le journal final et traitez les écarts de rapprochement.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportFEC}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export FEC
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <h3 className="text-sm font-bold">Écritures Comptables</h3>
              <div className="flex items-center gap-4">
                <div className="text-xs font-bold text-neutral-500">{data.length} lignes</div>
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
                  onDataChange={() => {}} // Read-only mostly, or we can allow edits
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
                  <BookOpen className="w-12 h-12 mb-2 text-neutral-300" />
                  <p>Aucune écriture dans le journal.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Écarts à traiter
            </h3>
            <p className="text-xs text-neutral-500 mb-6 leading-relaxed">
              Ces écarts proviennent de la réconciliation bancaire. Appliquez les suggestions pour équilibrer le journal.
            </p>
            
            {ecarts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-neutral-900">Aucun écart</p>
                <p className="text-xs text-neutral-500">Tout est équilibré.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ecarts.map((ecart) => (
                  <div key={ecart.id} className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-amber-800">{ecart.type}</span>
                      <span className="text-xs font-bold text-amber-600">{ecart.diff.toFixed(2)} €</span>
                    </div>
                    <p className="text-[10px] text-amber-700 mb-3 truncate" title={ecart.libelle}>
                      {ecart.libelle}
                    </p>
                    <div className="text-[10px] text-neutral-600 space-y-1 mb-3 bg-white/50 p-2 rounded">
                      <div className="flex justify-between">
                        <span>D: {ecart.compteDebit}</span>
                        <span>{ecart.diff.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>C: {ecart.compteCredit}</span>
                        <span>{ecart.diff.toFixed(2)}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleApplySuggestion(ecart)}
                      disabled={applying === ecart.id}
                      className="w-full flex items-center justify-center gap-1 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      {applying === ecart.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Appliquer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
