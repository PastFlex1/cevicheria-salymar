const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const startStr = `            ) : activeTab === "Lista de Pedidos" ? (`;
const endStr = `            ) : activeTab === "Notas de Venta" ? (`;

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const patchContent = `            ) : activeTab === "Lista de Pedidos" ? (
              <OrdersManager
                salesNotes={salesNotes}
                updateOrderStatus={updateOrderStatus}
                editOrder={editOrder}
                checkoutOrder={checkoutOrder}
              />
            ) : activeTab === "Cocina" ? (
              <KitchenDashboard
                salesNotes={salesNotes}
                updateOrderStatus={updateOrderStatus}
              />
`;
  content = content.substring(0, startIdx) + patchContent + content.substring(endIdx);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Patched correctly");
} else {
  console.log("Could not find start or end index.");
}
