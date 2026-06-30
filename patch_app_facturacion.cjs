const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add BillingDashboard import
if (!content.includes('import BillingDashboard')) {
  content = content.replace(
    'import OrdersManager from "./components/OrdersManager";',
    'import OrdersManager from "./components/OrdersManager";\\nimport BillingDashboard from "./components/BillingDashboard";'
  );
}

// 2. Add billingOrder state
if (!content.includes('const [billingOrder, setBillingOrder]')) {
  content = content.replace(
    'const [activeTab, setActiveTab] = useState<string>("Dashboard");',
    'const [activeTab, setActiveTab] = useState<string>("Dashboard");\\n  const [billingOrder, setBillingOrder] = useState<Order | null>(null);'
  );
}

// 3. Replace Facturas block
const oldFacturasBlockStart = ') : activeTab === "Facturas" ? (';
const oldFacturasBlockEnd = ') : activeTab === "Inventario" ? (';

const startIdx = content.indexOf(oldFacturasBlockStart);
const endIdx = content.indexOf(oldFacturasBlockEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const newFacturacionBlock = ') : activeTab === "Facturación" ? (\\n              <BillingDashboard\\n                salesNotes={salesNotes}\\n                updateOrder={(updated) => {\\n                  setSalesNotes(prev => prev.map(o => o.id === updated.id ? updated : o));\\n                }}\\n                addInvoice={(invoice) => {\\n                  setSalesNotes(prev => [invoice, ...prev]);\\n                }}\\n                menuItems={[...inventoryItems, ...comidasItems, ...bebidasItems, ...comboItems]}\\n                initialOrderToBill={billingOrder}\\n                onClearInitialOrder={() => setBillingOrder(null)}\\n              />\\n            ';
  content = content.substring(0, startIdx) + newFacturacionBlock + content.substring(endIdx);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Patched App.tsx successfully");
} else {
  console.log("Could not find Facturas block");
}
