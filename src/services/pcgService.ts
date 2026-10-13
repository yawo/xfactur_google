import { accountingService } from './accountingService';
import { AccountPCG } from '../types';

export const pcgService = {
  loadPCG(): Promise<AccountPCG[]> {
    return accountingService.loadPCG();
  },

  loadOHADA(): Promise<AccountPCG[]> {
    return accountingService.loadOHADA();
  },

  getAccounts(standard?: any): Promise<AccountPCG[]> {
    return accountingService.getAccounts(standard);
  },

  findAccount(accounts: AccountPCG[], code: string): AccountPCG | undefined {
    return accountingService.findAccount(accounts, code);
  },

  searchAccounts(accounts: AccountPCG[], query: string): AccountPCG[] {
    return accountingService.searchAccounts(accounts, query);
  }
};
