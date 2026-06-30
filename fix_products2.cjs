const fs = require('fs');
let c = fs.readFileSync('src/components/ProductsDashboard.tsx', 'utf8');
c = c.split('\\\\`').join('`');
c = c.split('\\\\$').join('$');
fs.writeFileSync('src/components/ProductsDashboard.tsx', c);
