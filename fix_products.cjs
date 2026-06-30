const fs = require('fs');
let c = fs.readFileSync('src/components/ProductsDashboard.tsx', 'utf8');
// remove backslashes before backticks and before dollar signs if they are messed up
c = c.replace(/\\\\`/g, '`');
c = c.replace(/\\\\\$/g, '$');
fs.writeFileSync('src/components/ProductsDashboard.tsx', c);
console.log("Fixed backticks in ProductsDashboard.tsx");
