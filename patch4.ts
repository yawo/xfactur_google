import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walkDir(file));
        } else { 
            if (file.endsWith('.tsx')) {
               results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir('src/pages');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Dashboard.tsx, line 166:
  // releveSnap.docs.map(d => d.data()).forEach(...)
  content = content.replace(/\.map\(d => d\.data\(\)\)\s*\n\s*\.forEach\(/g, '.map(d => d.data() as any)\n          .filter(f => f.organisation_id === user.uid || f.author_uid === user.uid)\n          .forEach(');
  
  // Others:
  // .map(doc => ({ id: doc.id, ...doc.data() as any }))
  //         ;
  content = content.replace(/\.map\((doc|d) => \(\{ id: (doc|d)\.id, \.\.\.(doc|d)\.data\(\) as any \}\)\)\s*\n\s*;/g, 
    '.map($1 => ({ id: $1.id, ...$1.data() as any }))\n        .filter((f: any) => f.organisation_id === user.uid || f.author_uid === user.uid);');
  
  // also some are .map(d => ({ id: d.id, ...d.data() as any })) without newlines before ; if any?
  
  // Ingentions.tsx:
  // const facturesData = snapshot.docs
  //      .map(doc => ({ id: doc.id, ...doc.data() as any }))
  //      ;
  // This will be caught by the regex above.
  
  // Conformite & TVA:
  // const docs = snapshot.docs
  //   .map(d => ({ id: d.id, ...d.data() as any }))
  //   ;
  
  // Let's also check Factures.tsx
  // const myFactures = facturesSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  content = content.replace(/const myFactures = facturesSnap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) as any \}\)\);/g, 
    'const myFactures = facturesSnap.docs.map(d => ({ id: d.id, ...d.data() as any })).filter((f: any) => f.organisation_id === user.uid || f.author_uid === user.uid);');
    
  content = content.replace(/const journals = journalSnap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) as any \}\)\);/g, 
    'const journals = journalSnap.docs.map(d => ({ id: d.id, ...d.data() as any })).filter((f: any) => f.organisation_id === user.uid || f.author_uid === user.uid);');

  content = content.replace(/const releves = releveSnap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) as any \}\)\);/g, 
    'const releves = releveSnap.docs.map(d => ({ id: d.id, ...d.data() as any })).filter((f: any) => f.organisation_id === user.uid || f.author_uid === user.uid);');


  fs.writeFileSync(file, content, 'utf8');
});

console.log('Filters added back carefully');
