const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace , where('organisation_id', '==', user.uid)
  content = content.replace(/,\s*where\('organisation_id',\s*'==',\s*user\.uid\)/g, '');
  // Replace where('organisation_id', '==', user.uid),
  content = content.replace(/where\('organisation_id',\s*'==',\s*user\.uid\),\s*/g, '');
  // Replace where('organisation_id', '==', user.uid) where it's the only argument after collection (we need to remove the preceding comma)
  content = content.replace(/collection\([^)]+\),\s*where\('organisation_id',\s*'==',\s*user\.uid\)/g, match => {
    return match.split(',')[0];
  });
  
  // Also clean up factures query in Factures.tsx
  
  fs.writeFileSync(file, content, 'utf8');
});

console.log('Queries updated');
