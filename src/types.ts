export type AccountingStandard = 'PCG' | 'OHADA';
export type DeviseCode = 'EUR' | 'XOF' | 'XAF' | 'USD' | 'CDF' | 'GNF';

export interface Organisation {
  id: string;
  nom: string;
  siret: string; // or RCCM / NIF / IFU / NINEA
  identifiant_legal?: string;
  email_admin: string;
  regime_tva: 'franchise' | 'reel' | 'synthetique' | 'exempt';
  statut: 'actif' | 'inactif';
  referentiel?: AccountingStandard;
  devise?: DeviseCode;
  pays?: string;
}

export interface Entreprise {
  id: string;
  siret?: string;
  nom: string;
  tva_intracom?: string;
  pays?: string;
  adresse?: string;
}

export interface Facture {
  id: string;
  organisation_id: string;
  numero_facture: string;
  date_emission: string;
  emetteur_id: string;
  destinataire_id: string;
  montant_ht_eur: number;
  montant_ttc_eur: number;
  statut: 'cree' | 'valide' | 'alloue' | 'bloque' | 'archive';
  score_qualite: number;
  est_conforme: boolean;
  source?: string;
  note?: string;
}

export interface LigneFacture {
  id: string;
  facture_id: string;
  description: string;
  quantite: number;
  prix_unitaire_eur: number;
  taux_tva: number;
  tva_eur: number;
  categorie?: string;
}

export interface JournalEntry {
  id: string;
  organisation_id: string;
  facture_id?: string;
  date_ecriture: string;
  compte_id: string;
  debit: number;
  credit: number;
  statut: 'cree' | 'valide' | 'reconcilie';
  confidence_score?: number;
}

export interface Releve {
  id: string;
  organisation_id: string;
  banque: string;
  date_releve: string;
}

export interface LigneReleve {
  id: string;
  releve_id: string;
  date_operation: string;
  montant: number;
  libelle: string;
  statut: 'cree' | 'valide' | 'reconcilie';
}

export interface AccountPCG {
  compte: string;
  libelle: string;
  parent?: string;
}

export interface AccountOHADA {
  compte: string;
  libelle: string;
  parent?: string;
  classe?: number;
}

export type AccountingAccount = AccountPCG;

export interface OHADACountryInfo {
  code: string;
  nom: string;
  zone: 'UEMOA' | 'CEMAC' | 'AUTRE';
  devise: DeviseCode;
  tauxTvaStandard: number;
  identifiantFiscal: string; // Ex: 'IFU', 'RCCM', 'NINEA', 'NIU'
  description: string;
}

export interface Subreddit {
  id: string;
  nom: string;
  description: string;
  createur_id: string;
  created_at: string;
}

export interface Post {
  id: string;
  subreddit_id: string;
  auteur_id: string;
  auteur_name: string;
  titre: string;
  contenu: string;
  votes: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  auteur_id: string;
  auteur_name: string;
  contenu: string;
  created_at: string;
}

export type WhatsAppProvider = 'qr_web' | 'meta_cloud_api' | 'twilio';
export type EmailSyncMode = 'imap' | 'forwarding_inbound' | 'webhook_provider';

export interface WhatsAppIngestionConfig {
  enabled: boolean;
  provider: WhatsAppProvider;
  status: 'connected' | 'disconnected' | 'pending';
  phoneNumber: string;
  wabaId?: string;
  phoneNumberId?: string;
  metaAccessToken?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  autoDownloadAttachments: boolean;
  autoProcessWithAI: boolean;
  sendAutoReply: boolean;
  autoReplyText: string;
  whitelistOnly: boolean;
  whitelistedNumbers: string[];
  defaultStandard: AccountingStandard;
  lastSyncAt?: string;
  inboundWebhookUrl?: string;
  verifyToken?: string;
}

export interface EmailIngestionConfig {
  enabled: boolean;
  mode: EmailSyncMode;
  status: 'connected' | 'disconnected' | 'pending';
  dedicatedEmail: string;
  customForwardingEmail?: string;
  imapPreset: 'gmail' | 'outlook' | 'ovh' | 'custom';
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  imapPassword?: string;
  imapFolder: string;
  checkIntervalMinutes: number;
  allowedExtensions: string[];
  subjectFilterKeywords: string;
  markAsReadAfterProcessing: boolean;
  applyLabel: boolean;
  labelText: string;
  archiveOriginal: boolean;
  sendDailyDigest: boolean;
  lastSyncAt?: string;
}

export interface IngestionChannelsSettings {
  whatsapp: WhatsAppIngestionConfig;
  email: EmailIngestionConfig;
  updatedAt?: string;
}

