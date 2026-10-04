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

  content = content.replace(/\.filter\(\([^)]+\) => [^\)]+\.organisation_id === user\.uid \|\| [^\)]+\.author_uid === user\.uid\)/g, '');
  content = content.replace(/\.filter\(f => f\.organisation_id === user\.uid \|\| f\.author_uid === user\.uid\)/g, '');
  content = content.replace(/\.filter\(\(f: any\) => f\.organisation_id === user\.uid \|\| f\.author_uid === user\.uid\)/g, '');

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Filters removed once again!');
