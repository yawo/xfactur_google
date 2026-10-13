import React, { useState, useEffect } from 'react';
import { FileText, Search, Edit2, RotateCcw, Trash2, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy, deleteField, getDocs } from 'firebase/firestore';
import { AuthProvider, useAuth } from '../AuthContext';
import { useAccounting } from '../AccountingContext';
import { InvoiceEditorModal } from '../components/InvoiceEditorModal';

export default function Factures() {
  const { user } = useAuth();
  const { currencySymbol, formatMoney } = useAccounting();
  const [factures, setFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'reset' | 'delete', id: string } | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'factures'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      // Sort by date descending locally
      data.sort((a: any, b: any) => {
        const dateA = a.date_emission || '';
        const dateB = b.date_emission || '';
        return dateB.localeCompare(dateA);
      });
      setFactures(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'factures');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const executeReset = async (id: string) => {
    try {
      await updateDoc(doc(db, 'factures', id), {
        statut: 'cree',
        est_conforme: deleteField(),
        score_qualite: deleteField(),
        alertes: deleteField(),
        statut_tva: deleteField(),
        detail_anomalie_tva: deleteField(),
        tva_conforme: deleteField(),
        lignes_comptables: deleteField()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'factures');
    }
  };

  const executeDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'factures', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'factures');
    }
  };

  const filteredFactures = factures.filter(f => {
    const search = searchTerm.toLowerCase();
    return (
      (f.numero_facture || '').toLowerCase().includes(search) ||
      (f.emetteur_nom || '').toLowerCase().includes(search) ||
      (f.statut || '').toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'cree':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Créée</span>;
      case 'valide':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Validée (Conformité)</span>;
      case 'tva_validee':
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">TVA Validée</span>;
      case 'alloue':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Allouée</span>;
      case 'rapproche':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Rapprochée</span>;
      case 'rejete':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Rejetée</span>;
      default:
        return <span className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded-full text-xs font-medium">{statut || 'Inconnu'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Toutes les factures</h1>
          <p className="text-neutral-500 mt-1">Gérez l'ensemble des factures du système, éditez-les ou réinitialisez leur statut.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro, émetteur ou statut..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-neutral-600">N° Facture</th>
                <th className="px-6 py-4 font-semibold text-neutral-600">Date</th>
                <th className="px-6 py-4 font-semibold text-neutral-600">Émetteur</th>
                <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Montant HT</th>
                <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Montant TTC</th>
                <th className="px-6 py-4 font-semibold text-neutral-600">Statut</th>
                <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
                      Chargement des factures...
                    </div>
                  </td>
                </tr>
              ) : filteredFactures.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                    Aucune facture trouvée.
                  </td>
                </tr>
              ) : (
                filteredFactures.map((facture) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={facture.id} 
                    className="hover:bg-neutral-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      {facture.numero_facture || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {facture.date_emission || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {facture.emetteur_nom || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-neutral-900 text-right font-mono">
                      {facture.montant_ht_eur !== undefined && facture.montant_ht_eur !== null ? formatMoney(facture.montant_ht_eur) : '-'}
                    </td>
                    <td className="px-6 py-4 text-neutral-900 text-right font-mono font-medium">
                      {facture.montant_ttc_eur !== undefined && facture.montant_ttc_eur !== null ? formatMoney(facture.montant_ttc_eur) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(facture.statut)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingInvoice(facture)}
                          className="p-2 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Éditer la facture"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'reset', id: facture.id })}
                          className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Réinitialiser le statut (Refaire le flux)"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'delete', id: facture.id })}
                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer la facture"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
          >
            <h3 className="text-lg font-bold mb-2">
              {confirmAction.type === 'reset' ? 'Réinitialiser la facture' : 'Supprimer la facture'}
            </h3>
            <p className="text-neutral-600 mb-6">
              {confirmAction.type === 'reset' 
                ? 'Voulez-vous vraiment réinitialiser cette facture ? Elle repassera par toutes les étapes (Conformité, TVA, Allocation).'
                : 'Voulez-vous vraiment supprimer cette facture définitivement ? Cette action est irréversible.'}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors font-medium"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  if (confirmAction.type === 'reset') {
                    executeReset(confirmAction.id);
                  } else {
                    executeDelete(confirmAction.id);
                  }
                  setConfirmAction(null);
                }}
                className={`px-4 py-2 text-white rounded-lg transition-colors font-medium ${
                  confirmAction.type === 'reset' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirmer
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {editingInvoice && (
        <InvoiceEditorModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
        />
      )}
    </div>
  );
}
