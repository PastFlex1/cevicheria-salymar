const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf8').split('\\n');
console.log("Total lines:", lines.length);
if (lines[lines.length - 1].includes('useEffect')) {
    console.log("Last line has useEffect!");
    lines.pop(); // remove last line completely!
}
fs.writeFileSync('src/App.tsx', lines.join('\\n'));
console.log("File saved with lines:", lines.length);
