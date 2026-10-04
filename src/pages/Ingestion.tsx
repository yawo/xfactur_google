import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Search, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { aiService } from '../services/aiService';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { InvoiceEditorModal } from '../components/InvoiceEditorModal';
import { AuthProvider, useAuth } from '../AuthContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export default function Ingestion() {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setResults([]);
      return;
    }
    
    const q = query(collection(db, 'factures'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const facturesData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        ;
      
      // Sort locally by createdAt desc
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleValidate = async (id: string) => {
    try {
      const docRef = doc(db, 'factures', id);
      await updateDoc(docRef, {
        statut: 'valide'
      });
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
        // 1. Call AI Service to extract data
        const extractionResult = await aiService.extractInvoice(file);
        
        if (extractionResult.success && extractionResult.data) {
          const invoiceData = extractionResult.data;
          
          // 2. Save to Firestore
          await addDoc(collection(db, 'factures'), {
            organisation_id: user.uid, // Using user ID as org ID for MVP
            numero_facture: String(invoiceData.numero_facture || '').trim() ? String(invoiceData.numero_facture).trim().substring(0, 50) : 'INCONNU',
            date_emission: (invoiceData.date_emission && /^\d{4}-\d{2}-\d{2}/.test(String(invoiceData.date_emission).trim())) ? String(invoiceData.date_emission).trim().substring(0, 10) : new Date().toISOString().split('T')[0],
            emetteur_nom: invoiceData.emetteur_nom || 'Fournisseur Inconnu',
            montant_ht_eur: isNaN(Number(invoiceData.montant_ht_eur)) ? 0 : Math.max(0, Number(invoiceData.montant_ht_eur)),
            montant_ttc_eur: isNaN(Number(invoiceData.montant_ttc_eur)) ? 0 : Math.max(0, Number(invoiceData.montant_ttc_eur)),
            statut: 'cree',
            lignes: invoiceData.lignes || [],
            source_file: file.name,
            createdAt: serverTimestamp(),
            author_uid: user.uid
          });
        } else {
          throw new Error("Échec de l'extraction IA");
        }
      } catch (err: any) {
        console.error(err);
        setError(`Erreur lors du traitement de ${file.name}: ${err.message}`);
        try {
           handleFirestoreError(err, OperationType.CREATE, 'factures');
        } catch(e) {}
      }
    }
    
    setIsUploading(false);
    setFiles([]);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Ingestion Universelle</h1>
        <p className="text-neutral-500">Importez vos factures pour extraction intelligente.</p>
      </header>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-200">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl flex items-center gap-3 border border-emerald-200">
          <CheckCircle2 className="w-5 h-5" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div 
            className={cn(
              "border-2 border-dashed rounded-2xl p-10 text-center transition-all",
              files.length > 0 ? "border-emerald-500 bg-emerald-50/30" : "border-neutral-300 hover:border-emerald-400 bg-white"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) setFiles(Array.from(e.dataTransfer.files));
            }}
          >
            <div className="flex flex-col items-center">
              <div className="p-4 bg-emerald-50 rounded-full mb-4">
                <Upload className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold">Glissez vos documents ici</h3>
              <p className="text-sm text-neutral-500 mt-2 mb-6">Factures (PDF, JPG, PNG)</p>
              
              <label className="cursor-pointer bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm">
                Parcourir les fichiers
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>

          {files.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm"
            >
              <h4 className="text-sm font-bold mb-4 flex items-center justify-between">
                Fichiers sélectionnés
                <span className="text-xs font-normal text-neutral-500">{files.length} fichier(s)</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-neutral-50 rounded-lg text-xs">
                    <FileText className="w-4 h-4 text-neutral-400" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-neutral-400">{(file.size / 1024).toFixed(0)} KB</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={processFiles}
                disabled={isUploading}
                className="w-full mt-6 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    Lancer l'extraction IA
                    <CheckCircle2 className="w-5 h-5" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Dernières extractions</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {results.map((result) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-6"
                >
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold truncate">{result.emetteur_nom || 'Inconnu'}</h4>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                        result.statut === 'cree' ? "bg-amber-100 text-amber-700" :
                        result.statut === 'valide' ? "bg-blue-100 text-blue-700" :
                        "bg-emerald-100 text-emerald-700"
                      )}>
                        {result.statut}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      N° {result.numero_facture} • {result.date_emission}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{(result.montant_ttc_eur || 0).toFixed(2)} €</p>
                    <p className="text-[10px] text-neutral-400 uppercase tracking-widest">TTC</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDelete(result.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-neutral-400 hover:text-red-600"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setEditingInvoice(result)}
                      className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-900"
                      title="Éditer"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    {result.statut === 'cree' && (
                      <button 
                        onClick={() => handleValidate(result.id)}
                        className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        Valider
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {results.length === 0 && !isUploading && (
              <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200 border-dashed">
                <p className="text-neutral-400 italic">Aucune extraction récente. Importez des fichiers pour commencer.</p>
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
