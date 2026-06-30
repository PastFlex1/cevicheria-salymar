const fs = require('fs');
let content = fs.readFileSync('patch_app_productos.cjs', 'utf8');
content = content.replace(/\\\`/g, '\`');
fs.writeFileSync('patch_app_productos.cjs', content);
