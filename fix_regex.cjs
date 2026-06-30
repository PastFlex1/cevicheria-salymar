const fs = require('fs');
let s = fs.readFileSync('patch_app_productos.cjs', 'utf8');

const target = "const productosButton = \`$1\\n" +
"            <button\\n" +
"              onClick={() => setActiveTab(\\"Productos\\")}\\n" +
"              className={\`flex items-center gap-2 text-sm font-bold py-7 px-3 border-b-2 transition-colors whitespace-nowrap \\${activeTab === \\"Productos\\" ? \\"text-blue-600 border-blue-600\\" : \\"text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50\\"}\`}\\n" +
"            >\\n" +
"              <Package className=\\"w-4 h-4 md:w-5 md:h-5\\" />\\n" +
"              <span className=\\"hidden sm:inline\\">Productos</span>\\n" +
"            </button>\`;";

const replacement = "const productosButton = '$1\\n' +" +
" '            <button\\n' +" +
" '              onClick={() => setActiveTab(\\"Productos\\")}\\n' +" +
" '              className={\\`flex items-center gap-2 text-sm font-bold py-7 px-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === \\"Productos\\" ? \\"text-blue-600 border-blue-600\\" : \\"text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50\\"}\\`}\\n' +" +
" '            >\\n' +" +
" '              <Package className=\\"w-4 h-4 md:w-5 md:h-5\\" />\\n' +" +
" '              <span className=\\"hidden sm:inline\\">Productos</span>\\n' +" +
" '            </button>';";

s = s.replace(target, replacement);

s = s.replace('const inventarioBlockEnd = \`) : activeTab === "Facturación" ? (\`;', "const inventarioBlockEnd = ') : activeTab === \\"Facturación\\" ? (';");
s = s.replace('const productsBlock = \`) : activeTab === "Productos" ? (', "const productsBlock = ') : activeTab === \\"Productos\\" ? (\\n' +");
s = s.replace('              />\\n            ) : activeTab === "Facturación" ? (\`;', " '              />\\n' +\\n '            ) : activeTab === \\"Facturación\\" ? (';");

fs.writeFileSync('patch_app_productos.cjs', s);
