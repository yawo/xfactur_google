import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface InvoiceLine {
  description: string;
  prix_unitaire_eur: number;
  quantite: number;
  taux_tva: number;
  categorie_depense?: string;
  montant_ht?: number;
  montant_tva?: number;
  montant_ttc?: number;
}

interface Invoice {
  id: string;
  emetteur_nom: string;
  numero_facture: string;
  date_emission: string;
  montant_ht_eur: number;
  montant_ttc_eur: number;
  lignes: InvoiceLine[];
  statut: string;
}

interface Props {
  invoice: Invoice;
  onClose: () => void;
}

export function InvoiceEditorModal({ invoice, onClose }: Props) {
  const [formData, setFormData] = useState<Invoice>(invoice);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(invoice);
  }, [invoice]);

  const handleChange = (field: keyof Invoice, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLineChange = (index: number, field: keyof InvoiceLine, value: any) => {
    const newLines = [...formData.lignes];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData(prev => ({ ...prev, lignes: newLines }));
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lignes: [...(prev.lignes || []), { description: '', prix_unitaire_eur: 0, quantite: 1, taux_tva: 20, categorie_depense: '', montant_ht: 0, montant_tva: 0, montant_ttc: 0 }]
    }));
  };

  const removeLine = (index: number) => {
    const newLines = [...formData.lignes];
    newLines.splice(index, 1);
    setFormData(prev => ({ ...prev, lignes: newLines }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'factures', invoice.id);
      await updateDoc(docRef, {
        emetteur_nom: formData.emetteur_nom,
        numero_facture: formData.numero_facture,
        date_emission: formData.date_emission,
        montant_ht_eur: Number(formData.montant_ht_eur),
        montant_ttc_eur: Number(formData.montant_ttc_eur),
        lignes: formData.lignes
      });
      onClose();
    } catch (err) {
      console.error("Error saving invoice:", err);
      try { handleFirestoreError(err, OperationType.UPDATE, 'factures'); } catch(e) {}
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 bg-neutral-50">
          <h2 className="text-xl font-bold">Éditer la facture</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Émetteur</label>
              <input 
                type="text" 
                value={formData.emetteur_nom} 
                onChange={e => handleChange('emetteur_nom', e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">N° Facture</label>
              <input 
                type="text" 
                value={formData.numero_facture} 
                onChange={e => handleChange('numero_facture', e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Date d'émission</label>
              <input 
                type="date" 
                value={formData.date_emission} 
                onChange={e => handleChange('date_emission', e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Montant HT</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.montant_ht_eur} 
                  onChange={e => handleChange('montant_ht_eur', parseFloat(e.target.value))}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Montant TTC</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.montant_ttc_eur} 
                  onChange={e => handleChange('montant_ttc_eur', parseFloat(e.target.value))}
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Lines Spreadsheet */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Lignes de la facture</h3>
              <button 
                onClick={addLine}
                className="flex items-center gap-2 text-sm bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" /> Ajouter une ligne
              </button>
            </div>
            
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-neutral-600">Description</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 w-32">Catégorie</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 w-24">Prix U. (€)</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 w-20">Qté</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 w-20">TVA (%)</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 w-24">Montant HT</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 w-24">Montant TVA</th>
                    <th className="px-4 py-3 font-semibold text-neutral-600 w-24">Montant TTC</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {(formData.lignes || []).map((ligne, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/50">
                      <td className="p-2">
                        <input 
                          type="text" 
                          value={ligne.description} 
                          onChange={e => handleLineChange(idx, 'description', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500 rounded px-2 py-1"
                          placeholder="Description..."
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="text" 
                          value={ligne.categorie_depense || ''} 
                          onChange={e => handleLineChange(idx, 'categorie_depense', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500 rounded px-2 py-1"
                          placeholder="Catégorie..."
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          step="0.01"
                          value={ligne.prix_unitaire_eur} 
                          onChange={e => handleLineChange(idx, 'prix_unitaire_eur', parseFloat(e.target.value))}
                          className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500 rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          step="0.01"
                          value={ligne.quantite} 
                          onChange={e => handleLineChange(idx, 'quantite', parseFloat(e.target.value))}
                          className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500 rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          step="0.1"
                          value={ligne.taux_tva} 
                          onChange={e => handleLineChange(idx, 'taux_tva', parseFloat(e.target.value))}
                          className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500 rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          step="0.01"
                          value={ligne.montant_ht !== undefined ? ligne.montant_ht : ((ligne.prix_unitaire_eur || 0) * (ligne.quantite || 0))} 
                          onChange={e => handleLineChange(idx, 'montant_ht', parseFloat(e.target.value))}
                          className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500 rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          step="0.01"
                          value={ligne.montant_tva !== undefined ? ligne.montant_tva : (((ligne.prix_unitaire_eur || 0) * (ligne.quantite || 0)) * (ligne.taux_tva || 0) / 100)} 
                          onChange={e => handleLineChange(idx, 'montant_tva', parseFloat(e.target.value))}
                          className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500 rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          step="0.01"
                          value={ligne.montant_ttc !== undefined ? ligne.montant_ttc : (((ligne.prix_unitaire_eur || 0) * (ligne.quantite || 0)) * (1 + (ligne.taux_tva || 0) / 100))} 
                          onChange={e => handleLineChange(idx, 'montant_ttc', parseFloat(e.target.value))}
                          className="w-full bg-transparent border-none focus:ring-1 focus:ring-emerald-500 rounded px-2 py-1"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => removeLine(idx)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!formData.lignes || formData.lignes.length === 0) && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-neutral-400 italic">
                        Aucune ligne extraite.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-medium text-neutral-600 hover:bg-neutral-200 transition-colors"
          >
            Annuler
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
