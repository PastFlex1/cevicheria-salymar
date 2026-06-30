const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The file has literal '\\n' which is breaking the build
content = content.replace(/\\\\n/g, '\\n');

let lines = content.split('\\n');
const endOfFileIndex = lines.findIndex(l => l.includes('export default App;'));
if (endOfFileIndex !== -1) {
    lines.splice(endOfFileIndex + 1);
} else {
    // try to find the last `  );\\n}`
    const lastClosing = lines.lastIndexOf('}');
    if (lastClosing !== -1) {
       lines.splice(lastClosing + 1);
    }
}
fs.writeFileSync('src/App.tsx', lines.join('\\n'));
