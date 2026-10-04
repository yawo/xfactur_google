import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart, BarChart3, ArrowUpRight, ArrowDownRight, Download, Loader2, FileText, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { AuthProvider, useAuth } from '../AuthContext';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalTVA, setTotalTVA] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [averageInvoice, setAverageInvoice] = useState(0);
  const [timeRange, setTimeRange] = useState('tout');

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'factures'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const facturesList = snapshot.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        ;
      
      // Process data for charts
      const monthlyMap = new Map<string, number>();
      const categoryMap = new Map<string, number>();
      const supplierMap = new Map<string, number>();
      const statusMap = new Map<string, number>();
      let total = 0;
      let tva = 0;
      let count = 0;

      const now = new Date();
      const cutoffDate = new Date();
      if (timeRange === '30d') cutoffDate.setDate(now.getDate() - 30);
      else if (timeRange === '6m') cutoffDate.setMonth(now.getMonth() - 6);
      else if (timeRange === '12m') cutoffDate.setFullYear(now.getFullYear() - 1);
      else cutoffDate.setFullYear(2000); // For 'tout'

      facturesList.forEach(f => {
        if (!f.date_emission) return;
        const date = new Date(f.date_emission);
        if (date < cutoffDate && timeRange !== 'tout') return;

        count++;
        const amount = Number(f.montant_ttc_eur) || 0;
        const amountHT = Number(f.montant_ht_eur) || 0;
        total += amount;
        tva += (amount - amountHT);

        // Monthly aggregation
        const monthYear = `${date.toLocaleString('fr-FR', { month: 'short' })} ${date.getFullYear()}`;
        monthlyMap.set(monthYear, (monthlyMap.get(monthYear) || 0) + amount);

        // Supplier aggregation
        const supplier = f.emetteur_nom || 'Inconnu';
        supplierMap.set(supplier, (supplierMap.get(supplier) || 0) + amount);

        // Status aggregation
        const status = f.statut || 'cree';
        const statusLabels: Record<string, string> = {
          'cree': 'À vérifier',
          'valide': 'Validée',
          'alloue': 'Comptabilisée',
          'rapproche': 'Rapprochée'
        };
        const statusLabel = statusLabels[status] || status;
        statusMap.set(statusLabel, (statusMap.get(statusLabel) || 0) + 1);

        // Category aggregation (line level)
        if (f.lignes && f.lignes.length > 0) {
          f.lignes.forEach((ligne: any) => {
            const cat = ligne.categorie_depense || f.emetteur_nom || 'Autre';
            const lineAmount = ligne.montant_ttc !== undefined 
              ? ligne.montant_ttc 
              : ((ligne.prix_unitaire_eur || 0) * (ligne.quantite || 0)) * (1 + (ligne.taux_tva || 0) / 100);
            categoryMap.set(cat, (categoryMap.get(cat) || 0) + lineAmount);
          });
        } else {
          const cat = f.categorie || f.emetteur_nom || 'Autre';
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + amount);
        }
      });

      // Format monthly data
      const formattedMonthly = Array.from(monthlyMap.entries())
        .map(([name, depenses]) => ({ name, revenus: 0, depenses }))
        .sort((a, b) => {
          const [monthA, yearA] = a.name.split(' ');
          const [monthB, yearB] = b.name.split(' ');
          if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
          const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
          return months.indexOf(monthA) - months.indexOf(monthB);
        });

      // Format category data
      const formattedCategories = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);

      // Format supplier data
      const formattedSuppliers = Array.from(supplierMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Format status data
      const formattedStatus = Array.from(statusMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setMonthlyData(formattedMonthly);
      setExpenseData(formattedCategories);
      setTopSuppliers(formattedSuppliers);
      setStatusData(formattedStatus);
      setTotalExpenses(total);
      setTotalTVA(tva);
      setInvoiceCount(count);
      setAverageInvoice(count > 0 ? total / count : 0);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'factures');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [timeRange]);

  const handleExportCSV = () => {
    if (monthlyData.length === 0 && expenseData.length === 0) return;

    let csvContent = "Mois,Depenses (EUR)\n";
    monthlyData.forEach(row => {
      csvContent += `"${row.name}",${row.depenses}\n`;
    });
    
    csvContent += "\n";
    
    csvContent += "Categorie,Montant (EUR)\n";
    expenseData.forEach(row => {
      csvContent += `"${row.name}",${row.value}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `analytics_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytique & Prévisions</h1>
          <p className="text-neutral-500">Visualisez vos performances financières et anticipez votre trésorerie.</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-all focus:outline-none"
          >
            <option value="tout">Tout</option>
            <option value="30d">30 derniers jours</option>
            <option value="6m">6 derniers mois</option>
            <option value="12m">12 derniers mois</option>
          </select>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Dépenses Totales', value: `${totalExpenses.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'TVA Déductible', value: `${totalTVA.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Factures Traitées', value: invoiceCount.toString(), icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Panier Moyen', value: `${averageInvoice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-2 rounded-xl", stat.bg)}>
                    <stat.icon className={cn("w-6 h-6", stat.color)} />
                  </div>
                </div>
                <p className="text-sm font-bold text-neutral-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Évolution des Dépenses</h3>
              </div>
              <div className="h-80 w-full">
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a3a3a3' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a3a3a3' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                      />
                      <Area type="monotone" name="Dépenses" dataKey="depenses" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorDep)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-neutral-400">
                    Aucune donnée disponible
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
              <h3 className="text-xl font-bold mb-8">Répartition par Catégorie</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="h-64">
                  {expenseData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={expenseData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {expenseData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} />
                      </RePieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-neutral-400">
                      Aucune donnée
                    </div>
                  )}
                </div>
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                  {expenseData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-medium text-neutral-600 truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="text-sm font-bold">{item.value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm lg:col-span-2">
              <h3 className="text-xl font-bold mb-8">Top Fournisseurs</h3>
              <div className="h-80 w-full">
                {topSuppliers.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSuppliers} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a3a3a3' }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a3a3a3' }} width={150} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24}>
                        {topSuppliers.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-neutral-400">
                    Aucune donnée disponible
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm lg:col-span-2">
              <h3 className="text-xl font-bold mb-8">Statut des Factures</h3>
              <div className="h-80 w-full">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a3a3a3' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#a3a3a3' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => `${value} facture(s)`}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-neutral-400">
                    Aucune donnée disponible
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
