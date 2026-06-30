const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');
let lines = c.split(String.fromCharCode(10)); // split by actual newline \n
console.log("Total actual lines:", lines.length);

while(lines.length > 0 && (lines[lines.length - 1].trim() === '' || lines[lines.length - 1].includes('useEffect') || lines[lines.length - 1].includes('Migrate legacy'))) {
    console.log("Removing bad line at end");
    lines.pop();
}
// Now lines should end at `}`
fs.writeFileSync('src/App.tsx', lines.join(String.fromCharCode(10)));
console.log("Saved with lines:", lines.length);
