import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function fix() {
  const facturesSnap = await getDocs(collection(db, 'factures'));
  const journalSnap = await getDocs(collection(db, 'journal'));
  const releveSnap = await getDocs(collection(db, 'lignes_releve'));

  const factures = facturesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const journals = journalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const releves = releveSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`Found ${factures.length} factures, ${journals.length} journals, ${releves.length} releves.`);

  let fixed = 0;
  for (const r of releves) {
    if (r.statut === 'reconcilie' && r.piece_comptable) {
      const matchingJournals = journals.filter(j => j.piece === r.piece_comptable);
      for (const j of matchingJournals) {
        if (j.statut !== 'reconcilie') {
          console.log(`Fixing journal ${j.id} to reconcilie`);
          await updateDoc(doc(db, 'journal', j.id), { statut: 'reconcilie' });
        }
        if (j.facture_id) {
          const f = factures.find(f => f.id === j.facture_id);
          if (f && f.statut !== 'rapproche') {
            console.log(`Fixing facture ${f.id} to rapproche`);
            await updateDoc(doc(db, 'factures', f.id), { statut: 'rapproche' });
            fixed++;
          }
        }
      }
    }
  }
  console.log(`Fixed ${fixed} factures.`);
  process.exit(0);
}

fix().catch(console.error);
