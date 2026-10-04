import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function generateMockData(organisation_id: string, author_uid: string) {
  const f1 = await addDoc(collection(db, 'factures'), {
    organisation_id,
    author_uid,
    numero_facture: 'F-2023-001',
    date_emission: '2023-01-15',
    emetteur_nom: 'TechCorp SA',
    montant_ht_eur: 1000,
    montant_ttc_eur: 1200,
    statut: 'cree',
    score_qualite: 95,
    est_conforme: true,
    createdAt: serverTimestamp()
  });
  
  const f2 = await addDoc(collection(db, 'factures'), {
    organisation_id,
    author_uid,
    numero_facture: 'F-2023-002',
    date_emission: '2023-02-20',
    emetteur_nom: 'Office Supplies Inc',
    montant_ht_eur: 250,
    montant_ttc_eur: 300,
    statut: 'alloue',
    score_qualite: 100,
    est_conforme: true,
    createdAt: serverTimestamp()
  });

  const f3 = await addDoc(collection(db, 'factures'), {
    organisation_id,
    author_uid,
    numero_facture: 'F-2023-003',
    date_emission: '2023-03-05',
    emetteur_nom: 'Server Cloud LLC',
    montant_ht_eur: 500,
    montant_ttc_eur: 600,
    statut: 'cree',
    score_qualite: 45,
    est_conforme: false,
    alertes: ['Montant TVA incohérent', 'Numéro de SIRET manquant'],
    createdAt: serverTimestamp()
  });

  await addDoc(collection(db, 'lignes_releve'), {
    organisation_id,
    author_uid,
    date_operation: '2023-02-25',
    libelle: 'Virement Office Supplies Inc',
    montant: -300,
    statut: 'attente',
    piece_comptable: null
  });

  await addDoc(collection(db, 'lignes_releve'), {
    organisation_id,
    author_uid,
    date_operation: '2023-01-20',
    libelle: 'PRLV TechCorp SA',
    montant: -1200,
    statut: 'cree',
    piece_comptable: null
  });

  return [f1.id, f2.id, f3.id];
}
