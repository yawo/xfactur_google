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
  
  // Replace: , where('organisation_id', '==', user.uid)
  content = content.replace(/,\s*where\('organisation_id',\s*'==',\s*user\.uid\)/g, '');
  
  // Replace: where('organisation_id', '==', user.uid),
  content = content.replace(/where\('organisation_id',\s*'==',\s*user\.uid\),\s*/g, '');
  
  // And the one that replaced inside query() alone
  content = content.replace(/query\([^)]+\)/g, (match) => {
      // Just in case it's something like query(collection(db, 'factures')) we leave it
      return match;
  });

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Queries patched');
