const fs = require('fs');
let s = fs.readFileSync('patch_app_productos.cjs', 'utf8');
s = s.replace(/\\\`/g, '\`');
fs.writeFileSync('patch_app_productos.cjs', s);
