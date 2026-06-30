const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\\n');
lines = lines.filter(l => !l.includes('Migrate legacy inventory to new products module') && !l.includes('let nextCats = [...menuCategories];') && !l.includes('setMenuCategories(nextCats);'));

// let's just make sure the very end of the file is correct.
const endOfFileIndex = lines.findIndex(l => l.includes('export default App;'));
if (endOfFileIndex !== -1) {
    lines.splice(endOfFileIndex + 1); // remove everything after export default App;
}

fs.writeFileSync('src/App.tsx', lines.join('\\n'));
