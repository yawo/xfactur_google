import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const facturesSnap = await getDocs(collection(db, 'factures'));
  const journalSnap = await getDocs(collection(db, 'journal'));
  const releveSnap = await getDocs(collection(db, 'lignes_releve'));

  const factures = facturesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const journals = journalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const releves = releveSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`Factures: ${factures.length}`);
  console.log(`Journals: ${journals.length}`);
  console.log(`Releves: ${releves.length}`);

  for (const f of factures) {
    if (f.emetteur_nom === 'LE BLOMET' || f.numero_facture === '973774') {
      console.log('Blomet facture:', f.id, f.statut, f.numero_facture);
      const fJournals = journals.filter(j => j.facture_id === f.id);
      console.log('  Journals:', fJournals.map(j => ({ id: j.id, statut: j.statut, piece: j.piece })));
      for (const j of fJournals) {
        const matchingReleve = releves.find(r => r.piece_comptable === j.piece);
        console.log('    Matching Releve:', matchingReleve ? { id: matchingReleve.id, statut: matchingReleve.statut } : 'None');
      }
    }
  }
  process.exit(0);
}

check().catch(console.error);
