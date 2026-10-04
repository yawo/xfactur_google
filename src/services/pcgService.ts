import Papa from 'papaparse';
import { AccountPCG } from '../types';

export const pcgService = {
  async loadPCG(): Promise<AccountPCG[]> {
    const response = await fetch('/data/comptes_pcg.csv');
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data as AccountPCG[]);
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  },

  findAccount(accounts: AccountPCG[], code: string): AccountPCG | undefined {
    return accounts.find(a => a.compte === code);
  },

  searchAccounts(accounts: AccountPCG[], query: string): AccountPCG[] {
    const lowerQuery = query.toLowerCase();
    return accounts.filter(a => 
      a.compte.includes(query) || 
      a.libelle.toLowerCase().includes(lowerQuery)
    ).slice(0, 20);
  }
};
