import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { AccountingStandard, DeviseCode } from './types';
import { accountingService, OHADA_COUNTRIES } from './services/accountingService';

interface AccountingContextType {
  standard: AccountingStandard;
  setStandard: (std: AccountingStandard) => void;
  devise: DeviseCode;
  setDevise: (dev: DeviseCode) => void;
  pays: string;
  setPays: (p: string) => void;
  formatAmount: (amount: number) => string;
  formatMoney: (amount: number) => string;
  currencySymbol: string;
  toggleStandard: () => void;
  isOHADA: boolean;
  savePreferences: (newStd: AccountingStandard, newDev: DeviseCode, newPays: string) => Promise<void>;
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

export function AccountingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Initialize from localStorage or defaults
  const [standard, setStandardState] = useState<AccountingStandard>(() => {
    const saved = localStorage.getItem('xfactur_standard');
    return (saved === 'OHADA' || saved === 'PCG') ? saved : 'OHADA'; // Default to OHADA as user requested OHADA support
  });
  
  const [devise, setDeviseState] = useState<DeviseCode>(() => {
    const saved = localStorage.getItem('xfactur_devise');
    return (saved as DeviseCode) || (standard === 'OHADA' ? 'XOF' : 'EUR');
  });

  const [pays, setPaysState] = useState<string>(() => {
    return localStorage.getItem('xfactur_pays') || (standard === 'OHADA' ? 'Sénégal' : 'France');
  });

  // Sync with Firestore organization preferences when user is logged in
  useEffect(() => {
    if (!user) return;

    const loadOrgConfig = async () => {
      try {
        const orgRef = doc(db, 'organisations', user.uid);
        const snap = await getDoc(orgRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.referentiel) {
            setStandardState(data.referentiel);
            localStorage.setItem('xfactur_standard', data.referentiel);
          }
          if (data.devise) {
            setDeviseState(data.devise);
            localStorage.setItem('xfactur_devise', data.devise);
          }
          if (data.pays) {
            setPaysState(data.pays);
            localStorage.setItem('xfactur_pays', data.pays);
          }
        }
      } catch (err) {
        console.warn("Could not load organization accounting preferences from Firestore:", err);
      }
    };

    loadOrgConfig();
  }, [user]);

  const setStandard = (std: AccountingStandard) => {
    setStandardState(std);
    localStorage.setItem('xfactur_standard', std);
    // Automatically suggest currency when standard changes
    if (std === 'OHADA' && devise === 'EUR') {
      setDeviseState('XOF');
      localStorage.setItem('xfactur_devise', 'XOF');
      if (pays === 'France') {
        setPaysState('Sénégal');
        localStorage.setItem('xfactur_pays', 'Sénégal');
      }
    } else if (std === 'PCG' && (devise === 'XOF' || devise === 'XAF')) {
      setDeviseState('EUR');
      localStorage.setItem('xfactur_devise', 'EUR');
      setPaysState('France');
      localStorage.setItem('xfactur_pays', 'France');
    }
  };

  const setDevise = (dev: DeviseCode) => {
    setDeviseState(dev);
    localStorage.setItem('xfactur_devise', dev);
  };

  const setPays = (p: string) => {
    setPaysState(p);
    localStorage.setItem('xfactur_pays', p);
    // Find matching country default currency
    const found = OHADA_COUNTRIES.find(c => c.nom.toLowerCase() === p.toLowerCase());
    if (found) {
      setDevise(found.devise);
    }
  };

  const toggleStandard = () => {
    const next = standard === 'PCG' ? 'OHADA' : 'PCG';
    setStandard(next);
  };

  const savePreferences = async (newStd: AccountingStandard, newDev: DeviseCode, newPays: string) => {
    setStandard(newStd);
    setDevise(newDev);
    setPays(newPays);

    if (user) {
      try {
        const orgRef = doc(db, 'organisations', user.uid);
        await updateDoc(orgRef, {
          referentiel: newStd,
          devise: newDev,
          pays: newPays
        });
      } catch (err) {
        console.warn("Could not persist accounting preferences to Firestore:", err);
      }
    }
  };

  const formatAmount = (amount: number) => {
    return accountingService.formatCurrency(amount, devise);
  };

  const currencySymbol = accountingService.getCurrencySymbol(devise);

  return (
    <AccountingContext.Provider
      value={{
        standard,
        setStandard,
        devise,
        setDevise,
        pays,
        setPays,
        formatAmount,
        formatMoney: formatAmount,
        currencySymbol,
        toggleStandard,
        isOHADA: standard === 'OHADA',
        savePreferences
      }}
    >
      {children}
    </AccountingContext.Provider>
  );
}

export function useAccounting() {
  const ctx = useContext(AccountingContext);
  if (!ctx) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return ctx;
}
