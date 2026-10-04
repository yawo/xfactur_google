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

  content = content.replace(/\.map\((doc|d) => \(\{ id: (doc|d)\.id, \.\.\.\((doc|d)\.data\(\) as any\)\ \}\)\)\s*\n\s*;/g, 
    '.map($1 => ({ id: $1.id, ...($1.data() as any) }))\n        .filter((f: any) => f.organisation_id === user.uid || f.author_uid === user.uid);');
    
  // just in case we have it on the same line
  content = content.replace(/\.map\((doc|d) => \(\{ id: (doc|d)\.id, \.\.\.\((doc|d)\.data\(\) as any\)\ \}\)\);/g, 
    '.map($1 => ({ id: $1.id, ...($1.data() as any) })).filter((f: any) => f.organisation_id === user.uid || f.author_uid === user.uid);');
    
  fs.writeFileSync(file, content, 'utf8');
});

console.log('Filters added back correctly to Analytics and others');
