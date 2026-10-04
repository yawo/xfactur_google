import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '../AuthContext';
import { ClipboardCheck, AlertTriangle, CheckCircle2, ShieldAlert, Search, Filter, Download, FileWarning, Eye, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const initialChecklist = [
  { id: '1', task: 'Vérification des mentions obligatoires', status: 'pending' },
  { id: '2', task: 'Rapprochement bancaire mensuel', status: 'pending' },
  { id: '3', task: 'Validation des nouveaux fournisseurs', status: 'pending' },
  { id: '4', task: 'Contrôle des doublons de facturation', status: 'pending' },
  { id: '5', task: 'Vérification des taux de TVA appliqués', status: 'pending' },
];

export default function Audit() {
  const { user } = useAuth();
  const [factures, setFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState<any[]>([]);
  const [checklist, setChecklist] = useState(initialChecklist);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'factures'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const facturesList = snapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        ;
      setFactures(facturesList);
      
      // Generate dynamic risks based on real data
      const newRisks: any[] = [];
      
      // 1. Check for potential duplicates (same amount and supplier)
      const seen = new Map();
      facturesList.forEach(f => {
        if (!f.montant_ttc_eur || !f.emetteur_nom) return;
        const key = `${f.emetteur_nom}-${f.montant_ttc_eur}`;
        if (seen.has(key)) {
          newRisks.push({
            id: `dup-${f.id}`,
            title: 'Doublon potentiel détecté',
            severity: 'high',
            description: `Une autre facture de ${f.emetteur_nom} pour ${f.montant_ttc_eur}€ existe déjà.`,
            doc: f.numero_facture || 'INCONNU'
          });
        } else {
          seen.set(key, true);
        }
      });

      // 2. Check for high amounts
      facturesList.forEach(f => {
        if (f.montant_ttc_eur > 10000) {
          newRisks.push({
            id: `high-${f.id}`,
            title: 'Montant exceptionnel',
            severity: 'medium',
            description: `La facture dépasse le seuil d'alerte de 10 000€ (${f.montant_ttc_eur}€).`,
            doc: f.numero_facture || 'INCONNU'
          });
        }
      });

      // 3. Check for missing TVA when expected
      facturesList.forEach(f => {
        if (f.montant_ht_eur && f.montant_ttc_eur && f.montant_ht_eur === f.montant_ttc_eur && f.montant_ht_eur > 0) {
          newRisks.push({
            id: `tva-${f.id}`,
            title: 'TVA potentiellement manquante',
            severity: 'low',
            description: `Le montant HT est égal au montant TTC. Vérifier si la TVA est applicable.`,
            doc: f.numero_facture || 'INCONNU'
          });
        }
      });

      // 4. Add AI-detected anomalies
      facturesList.forEach(f => {
        if (f.alertes && Array.isArray(f.alertes)) {
          f.alertes.forEach((alerte: string, index: number) => {
            newRisks.push({
              id: `ai-${f.id}-${index}`,
              title: 'Anomalie détectée par l\'IA',
              severity: 'medium',
              description: alerte,
              doc: f.numero_facture || 'INCONNU'
            });
          });
        }
      });

      setRisks(newRisks);

      // Update checklist based on data
      const newChecklist = initialChecklist.map(item => ({...item}));
      
      // If no duplicates found, mark task as done
      if (newRisks.filter(r => r.title.includes('Doublon')).length === 0 && facturesList.length > 0) {
        newChecklist[3].status = 'done';
      }
      
      // If all invoices have TVA checked (no TVA risks)
      if (newRisks.filter(r => r.title.includes('TVA')).length === 0 && facturesList.length > 0) {
        newChecklist[4].status = 'done';
      }

      setChecklist(newChecklist);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'factures');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const highRisks = risks.filter(r => r.severity === 'high').length;
  const mediumRisks = risks.filter(r => r.severity === 'medium').length;
  const lowRisks = risks.filter(r => r.severity === 'low').length;

  // Calculate a mock score based on risks
  const baseScore = 100;
  const score = Math.max(0, baseScore - (highRisks * 10) - (mediumRisks * 5) - (lowRisks * 2));

  const handleExportCSV = () => {
    if (risks.length === 0) return;

    let csvContent = "Titre,Severite,Description,Document\n";
    
    risks.forEach(r => {
      // Escape quotes and wrap in quotes to handle commas in text
      const title = `"${r.title.replace(/"/g, '""')}"`;
      const desc = `"${r.description.replace(/"/g, '""')}"`;
      const doc = `"${r.doc.replace(/"/g, '""')}"`;
      csvContent += `${title},${r.severity},${desc},${doc}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_risks_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Préparation à l'Audit</h1>
          <p className="text-neutral-500">Identification des risques et checklist de conformité comptable.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm">
            <ShieldAlert className="w-4 h-4" />
            Lancer Analyse Risques
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Risques Détectés
            </h3>
            <div className="flex items-center gap-2">
              {highRisks > 0 && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">{highRisks} Critique{highRisks > 1 ? 's' : ''}</span>}
              {mediumRisks > 0 && <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{mediumRisks} Majeur{mediumRisks > 1 ? 's' : ''}</span>}
              {lowRisks > 0 && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{lowRisks} Mineur{lowRisks > 1 ? 's' : ''}</span>}
              {risks.length === 0 && !loading && <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Aucun risque</span>}
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : risks.length > 0 ? (
              risks.map((risk) => (
                <motion.div
                  key={risk.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-start gap-4 hover:border-emerald-200 transition-all"
                >
                  <div className={cn(
                    "p-3 rounded-xl",
                    risk.severity === 'high' ? "bg-red-50 text-red-600" : 
                    risk.severity === 'medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                  )}>
                    <FileWarning className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold">{risk.title}</h4>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{risk.doc}</span>
                    </div>
                    <p className="text-sm text-neutral-500 leading-relaxed mb-4">
                      {risk.description}
                    </p>
                    <div className="flex items-center gap-3">
                      <button className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Examiner la pièce
                      </button>
                      <button className="text-xs font-bold text-neutral-400 hover:text-neutral-900 transition-colors">
                        Ignorer
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-neutral-200 shadow-sm flex flex-col items-center justify-center text-center">
                <ShieldAlert className="w-12 h-12 text-emerald-200 mb-4" />
                <h4 className="text-lg font-bold text-neutral-900 mb-2">Aucun risque détecté</h4>
                <p className="text-sm text-neutral-500 max-w-md">
                  L'analyse de vos factures ne révèle aucune anomalie majeure pour le moment.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              Checklist Audit
            </h3>
            <div className="space-y-4">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center border",
                    item.status === 'done' ? "bg-emerald-500 border-emerald-500 text-white" : "border-neutral-300"
                  )}>
                    {item.status === 'done' && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    item.status === 'done' ? "text-neutral-400 line-through" : "text-neutral-700"
                  )}>
                    {item.task}
                  </span>
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-3 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:bg-neutral-800 transition-colors">
              Finaliser la période
            </button>
          </div>

          <div className="bg-emerald-600 p-6 rounded-2xl text-white shadow-xl shadow-emerald-600/20">
            <h3 className="text-lg font-bold mb-4">Score de Conformité</h3>
            <div className="flex items-end gap-2 mb-6">
              <span className="text-5xl font-bold tracking-tighter">{score}</span>
              <span className="text-xl font-bold opacity-60 mb-1">/100</span>
            </div>
            <p className="text-sm text-emerald-50 leading-relaxed">
              {score >= 90 ? "Excellent score ! Votre comptabilité est très saine." : 
               score >= 70 ? "Bon score, mais quelques points d'attention nécessitent votre vigilance." : 
               "Attention, de nombreux risques ont été détectés. Une révision est nécessaire."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

