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

  // Add back the filters!
  // Look for .map(d => ({ id: d.id, ...(d.data() as any) }))
  
  content = content.replace(/\.map\(([^)]+)\)\s*;/g, '.map($1)\n        .filter((f: any) => f.organisation_id === user.uid || f.author_uid === user.uid);');
  content = content.replace(/\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) as any \}\)\)\s*;/g, '.map(doc => ({ id: doc.id, ...doc.data() as any }))\n        .filter(f => f.organisation_id === user.uid || f.author_uid === user.uid);');
  content = content.replace(/\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) as any \}\)\)\s*;/g, '.map(d => ({ id: d.id, ...d.data() as any }))\n        .filter(f => f.organisation_id === user.uid || f.author_uid === user.uid);');
  content = content.replace(/\.map\(d => d\.data\(\)\)\s*/g, '.map(d => d.data() as any)\n        .filter(f => f.organisation_id === user.uid || f.author_uid === user.uid)\n        ');

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Filters added back');
