const tar = require('./node_modules/tar');
const fs = require('fs');
const path = require('path');
const src = '.next/standalone';

function walkSync(dir, base, list) {
  list = list || [];
  var entries = fs.readdirSync(dir, {withFileTypes: true});
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var full = path.join(dir, e.name);
    var rel  = path.posix.join(base, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) walkSync(full, rel, list);
    else list.push(rel);
  }
  return list;
}

var files = walkSync(src, '');
console.log('Packing ' + files.length + ' files...');
tar.create({ gzip: true, file: 'deploy.tar.gz', cwd: src }, files, function(err) {
  if (err) { console.error(err); process.exit(1); }
  else console.log('done');
});
