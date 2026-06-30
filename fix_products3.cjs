const fs = require('fs');
let c = fs.readFileSync('src/components/ProductsDashboard.tsx', 'utf8');

c = c.replace(/\\\\`/g, '`');
c = c.replace(/\\\\\$/g, '$');

// just to be completely sure:
c = c.replace('id: \\\\`PROD-\\\\\${Date.now()}\\\\`,', 'id: `PROD-${Date.now()}`,');
c = c.replace('id: \\\\`CAT-\\\\\${Date.now()}\\\\`,', 'id: `CAT-${Date.now()}`,');

fs.writeFileSync('src/components/ProductsDashboard.tsx', c);
