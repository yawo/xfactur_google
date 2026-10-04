export interface Organisation {
  id: string;
  nom: string;
  siret: string;
  email_admin: string;
  regime_tva: 'franchise' | 'reel';
  statut: 'actif' | 'inactif';
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
