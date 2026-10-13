import Papa from 'papaparse';
import { AccountPCG, AccountOHADA, AccountingStandard, DeviseCode, OHADACountryInfo } from '../types';

export const OHADA_COUNTRIES: OHADACountryInfo[] = [
  { code: 'SN', nom: 'Sénégal', zone: 'UEMOA', devise: 'XOF', tauxTvaStandard: 18, identifiantFiscal: 'NINEA / RCCM', description: 'DGID - Taux normal TVA 18%, déclaration mensuelle' },
  { code: 'CI', nom: "Côte d'Ivoire", zone: 'UEMOA', devise: 'XOF', tauxTvaStandard: 18, identifiantFiscal: 'Compte Contribuable (CC) / RCCM', description: 'DGI - Taux normal TVA 18%, Facturation Normalisée FNE' },
  { code: 'CM', nom: 'Cameroun', zone: 'CEMAC', devise: 'XAF', tauxTvaStandard: 19.25, identifiantFiscal: 'NIU / RCCM', description: 'DGI - Taux 17.5% + 1.75% CAC = 19.25%' },
  { code: 'BJ', nom: 'Bénin', zone: 'UEMOA', devise: 'XOF', tauxTvaStandard: 18, identifiantFiscal: 'IFU / RCCM', description: 'DGI - Plateforme e-MECeF de facturation normalisée' },
  { code: 'BF', nom: 'Burkina Faso', zone: 'UEMOA', devise: 'XOF', tauxTvaStandard: 18, identifiantFiscal: 'IFU / RCCM', description: 'DGI - Facture certifiée, taux normal TVA 18%' },
  { code: 'GA', nom: 'Gabon', zone: 'CEMAC', devise: 'XAF', tauxTvaStandard: 18, identifiantFiscal: 'NIF / RCCM', description: 'DGI - Taux normal TVA 18%, retenue à la source 9.5% prestataires' },
  { code: 'CD', nom: 'RD Congo (RDC)', zone: 'AUTRE', devise: 'USD', tauxTvaStandard: 16, identifiantFiscal: 'Numéro Impôt / Id. Nat / RCCM', description: 'DGI RDC - TVA 16%, monnaies usuelles USD & CDF' },
  { code: 'ML', nom: 'Mali', zone: 'UEMOA', devise: 'XOF', tauxTvaStandard: 18, identifiantFiscal: 'NIF / RCCM', description: 'DGI - Taux normal TVA 18%' },
  { code: 'TG', nom: 'Togo', zone: 'UEMOA', devise: 'XOF', tauxTvaStandard: 18, identifiantFiscal: 'NIF / RCCM', description: 'OTR (Office Togolais des Recettes) - TVA 18%' },
  { code: 'NE', nom: 'Niger', zone: 'UEMOA', devise: 'XOF', tauxTvaStandard: 19, identifiantFiscal: 'NIF / RCCM', description: 'DGI - Taux normal TVA 19%' },
  { code: 'CG', nom: 'Congo (Brazzaville)', zone: 'CEMAC', devise: 'XAF', tauxTvaStandard: 18.9, identifiantFiscal: 'NIU / RCCM', description: 'DGID - Taux 18% + Centimes additionnels' },
  { code: 'TD', nom: 'Tchad', zone: 'CEMAC', devise: 'XAF', tauxTvaStandard: 17.5, identifiantFiscal: 'NIF / RCCM', description: 'DGI - Taux normal TVA 17.5%' },
  { code: 'GN', nom: 'Guinée (Conakry)', zone: 'AUTRE', devise: 'GNF', tauxTvaStandard: 18, identifiantFiscal: 'NIF / RCCM', description: 'DNI - Taux normal TVA 18%' },
  { code: 'CF', nom: 'Centrafrique', zone: 'CEMAC', devise: 'XAF', tauxTvaStandard: 19, identifiantFiscal: 'NIF / RCCM', description: 'DGID - Taux normal TVA 19%' },
  { code: 'GQ', nom: 'Guinée Équatoriale', zone: 'CEMAC', devise: 'XAF', tauxTvaStandard: 15, identifiantFiscal: 'NIF / RCCM', description: 'Taux normal TVA 15%' },
  { code: 'GW', nom: 'Guinée-Bissau', zone: 'UEMOA', devise: 'XOF', tauxTvaStandard: 19, identifiantFiscal: 'NIF / RCCM', description: 'DGCI - Taux normal IGV/TVA 19%' },
  { code: 'KM', nom: 'Comores', zone: 'AUTRE', devise: 'XOF', tauxTvaStandard: 10, identifiantFiscal: 'NIF / RCCM', description: 'AGID - Taux standard 10%' },
];

let pcgCache: AccountPCG[] | null = null;
let ohadaCache: AccountOHADA[] | null = null;

export const accountingService = {
  async loadPCG(): Promise<AccountPCG[]> {
    if (pcgCache && pcgCache.length > 0) return pcgCache;
    const response = await fetch('/data/comptes_pcg.csv');
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          pcgCache = results.data as AccountPCG[];
          resolve(pcgCache);
        },
        error: (error: any) => reject(error)
      });
    });
  },

  async loadOHADA(): Promise<AccountOHADA[]> {
    if (ohadaCache && ohadaCache.length > 0) return ohadaCache;
    const response = await fetch('/data/comptes_ohada.csv');
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const list = (results.data as any[]).map(item => ({
            compte: String(item.compte || '').trim(),
            libelle: String(item.libelle || '').trim(),
            parent: item.parent ? String(item.parent).trim() : undefined,
            classe: item.compte ? parseInt(String(item.compte).charAt(0), 10) : undefined
          }));
          ohadaCache = list;
          resolve(list);
        },
        error: (error: any) => reject(error)
      });
    });
  },

  async getAccounts(standard: AccountingStandard = 'PCG'): Promise<AccountPCG[]> {
    if (standard === 'OHADA') {
      return this.loadOHADA();
    }
    return this.loadPCG();
  },

  findAccount(accounts: AccountPCG[], code: string): AccountPCG | undefined {
    return accounts.find(a => a.compte === code);
  },

  searchAccounts(accounts: AccountPCG[], query: string): AccountPCG[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return accounts.slice(0, 30);
    return accounts.filter(a => 
      a.compte.toLowerCase().includes(lowerQuery) || 
      a.libelle.toLowerCase().includes(lowerQuery)
    ).slice(0, 30);
  },

  formatCurrency(amount: number, currency: DeviseCode = 'EUR'): string {
    const safeAmount = Number(amount) || 0;
    if (currency === 'XOF' || currency === 'XAF') {
      return `${Math.round(safeAmount).toLocaleString('fr-FR')} FCFA`;
    }
    if (currency === 'USD') {
      return `$${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === 'CDF') {
      return `${Math.round(safeAmount).toLocaleString('fr-FR')} CDF`;
    }
    if (currency === 'GNF') {
      return `${Math.round(safeAmount).toLocaleString('fr-FR')} GNF`;
    }
    // Default EUR
    return `${safeAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  },

  getCurrencySymbol(currency: DeviseCode = 'EUR'): string {
    switch (currency) {
      case 'XOF':
      case 'XAF':
        return 'FCFA';
      case 'USD':
        return '$';
      case 'CDF':
        return 'CDF';
      case 'GNF':
        return 'GNF';
      case 'EUR':
      default:
        return '€';
    }
  },

  // Bridge & Concordance mapping between PCG (France) and SYSCOHADA (OHADA)
  mapAccountBetweenStandards(code: string, from: AccountingStandard, to: AccountingStandard): { targetCode: string; label: string; confidence: string } {
    if (from === to) {
      return { targetCode: code, label: 'Compte identique', confidence: '100%' };
    }

    // Mapping rules from PCG -> SYSCOHADA
    const pcgToOhadaMap: Record<string, { code: string; label: string }> = {
      // Fournisseurs & Tiers
      '401000': { code: '401100', label: 'Fournisseurs - Achats de biens (OHADA)' },
      '401100': { code: '401100', label: 'Fournisseurs - Achats de biens et marchandises' },
      '401200': { code: '401200', label: 'Fournisseurs - Prestations de services' },
      '408100': { code: '408100', label: 'Fournisseurs - Factures non parvenues' },
      '411000': { code: '411100', label: 'Clients ventes de biens' },
      '411100': { code: '411100', label: 'Clients ventes de biens' },
      '421000': { code: '422000', label: 'Personnel rémunérations dues' },
      '431000': { code: '431000', label: 'Sécurité sociale (CNSS / Caisses)' },
      
      // TVA
      '445660': { code: '445200', label: 'État, TVA récupérable sur achats et services (OHADA)' },
      '445620': { code: '445300', label: 'État, TVA récupérable sur immobilisations (OHADA)' },
      '445710': { code: '445100', label: 'État, TVA facturée sur ventes (OHADA)' },
      '445510': { code: '445400', label: 'État, TVA due (OHADA)' },
      '445670': { code: '445500', label: 'État, crédit de TVA à reporter (OHADA)' },

      // Banques & Trésorerie
      '512000': { code: '521100', label: 'Banques locales compte principal (OHADA)' },
      '512100': { code: '521100', label: 'Banques locales compte principal (OHADA)' },
      '530000': { code: '571000', label: 'Caisse siège (OHADA)' },
      '580000': { code: '581000', label: 'Virements de fonds internes (OHADA)' },

      // Charges d'exploitation
      '606400': { code: '605400', label: 'Fournitures de bureau non stockées (OHADA)' },
      '606300': { code: '605500', label: 'Petit outillage et matériel de faible valeur (OHADA)' },
      '606100': { code: '605100', label: 'Fournitures non stockables - Eau et électricité (OHADA)' },
      '606200': { code: '605200', label: 'Carburants et lubrifiants (OHADA)' },
      '607000': { code: '601100', label: 'Achats de marchandises (OHADA)' },
      '601000': { code: '602100', label: 'Achats de matières premières (OHADA)' },

      '626000': { code: '628100', label: 'Frais de téléphone et télécommunications (OHADA)' },
      '625100': { code: '638100', label: 'Frais de transport lors de missions et voyages (OHADA)' },
      '625300': { code: '637100', label: 'Frais de réceptions et repas d’affaires (OHADA)' },
      '625600': { code: '638300', label: 'Indemnités journalières de déplacement et missions (OHADA)' },
      '622600': { code: '632400', label: 'Honoraires d’avocats et consultants (OHADA)' },
      '622700': { code: '632200', label: 'Honoraires experts-comptables et CAC (OHADA)' },
      '613200': { code: '622200', label: 'Locations immobilières et bureaux (OHADA)' },
      '618100': { code: '634300', label: 'Abonnements logiciels SaaS et licences (OHADA)' },
      '651000': { code: '634100', label: 'Redevances pour licences et brevets (OHADA)' },
      '623000': { code: '627100', label: 'Annonces, insertions et publicité (OHADA)' },
      '624100': { code: '614000', label: 'Transports de plis et colis (OHADA)' },
      '627000': { code: '631100', label: 'Frais bancaires et tenue de compte (OHADA)' },
      '616000': { code: '625100', label: 'Assurances multirisques professionnelles (OHADA)' },
      '641100': { code: '641100', label: 'Patente et licences d’activité (OHADA)' },
      '656000': { code: '654000', label: 'Pertes de change commerciales (OHADA)' },
      '756000': { code: '754000', label: 'Gains de change commerciaux (OHADA)' },
      '681100': { code: '681100', label: 'Dotations aux amortissements (OHADA)' },
    };

    // Inverse mapping OHADA -> PCG
    if (from === 'OHADA' && to === 'PCG') {
      for (const [pcg, ohada] of Object.entries(pcgToOhadaMap)) {
        if (code.startsWith(ohada.code.slice(0, 4)) || code === ohada.code) {
          return { targetCode: pcg, label: `Équivalent PCG standard (${pcg})`, confidence: '92%' };
        }
      }
      // Heuristic fallback for OHADA -> PCG by class prefix
      if (code.startsWith('6054')) return { targetCode: '606400', label: 'Fournitures de bureau (PCG)', confidence: '90%' };
      if (code.startsWith('4452')) return { targetCode: '445660', label: 'TVA déductible (PCG)', confidence: '95%' };
      if (code.startsWith('521')) return { targetCode: '512100', label: 'Banque (PCG)', confidence: '95%' };
      if (code.startsWith('628')) return { targetCode: '626000', label: 'Télécoms (PCG)', confidence: '90%' };
      if (code.startsWith('638')) return { targetCode: '625100', label: 'Déplacements (PCG)', confidence: '85%' };
      if (code.startsWith('632')) return { targetCode: '622600', label: 'Honoraires (PCG)', confidence: '85%' };
      if (code.startsWith('634')) return { targetCode: '618100', label: 'Logiciels & SaaS (PCG)', confidence: '85%' };
      return { targetCode: code, label: 'Compte conservé ou transposition directe', confidence: '70%' };
    }

    // PCG -> OHADA
    if (pcgToOhadaMap[code]) {
      return { targetCode: pcgToOhadaMap[code].code, label: pcgToOhadaMap[code].label, confidence: '98%' };
    }

    // Prefix match
    for (const [pcgPrefix, ohada] of Object.entries(pcgToOhadaMap)) {
      if (code.startsWith(pcgPrefix.slice(0, 4))) {
        return { targetCode: ohada.code, label: ohada.label, confidence: '85%' };
      }
    }

    // Class 6 heuristic fallback
    if (code.startsWith('6064')) return { targetCode: '605400', label: 'Fournitures de bureau (OHADA)', confidence: '90%' };
    if (code.startsWith('4456')) return { targetCode: '445200', label: 'TVA récupérable (OHADA)', confidence: '95%' };
    if (code.startsWith('512')) return { targetCode: '521100', label: 'Banques locales (OHADA)', confidence: '95%' };
    if (code.startsWith('626')) return { targetCode: '628100', label: 'Télécommunications (OHADA)', confidence: '90%' };
    if (code.startsWith('625')) return { targetCode: '638300', label: 'Missions et déplacements (OHADA)', confidence: '85%' };
    if (code.startsWith('622')) return { targetCode: '632400', label: 'Honoraires (OHADA)', confidence: '85%' };

    return { targetCode: code, label: 'Code reporté par équivalence structurelle', confidence: '65%' };
  }
};
