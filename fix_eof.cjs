const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\\n');
lines.splice(3453); // keep only up to 3453 lines
fs.writeFileSync('src/App.tsx', lines.join('\\n'));
