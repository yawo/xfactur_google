import { db } from './src/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

async function checkFactures() {
  try {
    const snap = await getDocs(collection(db, 'factures'));
    console.log(`Found ${snap.size} invoices.`);
    snap.forEach(d => {
      console.log(`- ${d.id}: org=`, d.data().organisation_id, " author=", d.data().author_uid);
    });
  } catch (e) {
    console.error("Error:", e);
  }
}
checkFactures();
