const fs = require('fs');

let content = fs.readFileSync('src/components/KitchenDashboard.tsx', 'utf8');

const orderCardStart = `  const OrderCard = ({ order, currentStatus }: { order: Order, currentStatus: OrderStatus }) => (`;
const orderCardEnd = `    </motion.div>
  );`;

const startIdx = content.indexOf(orderCardStart);
const endIdx = content.indexOf(orderCardEnd) + orderCardEnd.length;

if (startIdx !== -1 && endIdx !== -1) {
  const orderCardCode = content.substring(startIdx, endIdx);
  // Remove from inside KitchenDashboard
  let newContent = content.substring(0, startIdx) + content.substring(endIdx);
  
  // Need to pass updateOrderStatus to OrderCard now since it's outside
  let newOrderCardCode = orderCardCode.replace(
    `const OrderCard = ({ order, currentStatus }: { order: Order, currentStatus: OrderStatus }) => (`,
    `const OrderCard = ({ order, currentStatus, updateOrderStatus }: { order: Order, currentStatus: OrderStatus, updateOrderStatus: (id: string, status: OrderStatus) => void }) => (`
  );
  
  // Replace <OrderCard key={order.id} order={order} currentStatus="pendiente" />
  // with <OrderCard key={order.id} order={order} currentStatus="pendiente" updateOrderStatus={updateOrderStatus} />
  newContent = newContent.replace(/<OrderCard key={order\.id} order=\{order\} currentStatus="([^"]+)" \/>/g, '<OrderCard key={order.id} order={order} currentStatus="$1" updateOrderStatus={updateOrderStatus} />');

  // Add the OrderCard component right above KitchenDashboard
  const dashboardStart = `export default function KitchenDashboard({`;
  newContent = newContent.replace(dashboardStart, newOrderCardCode + '\\n\\n' + dashboardStart);

  fs.writeFileSync('src/components/KitchenDashboard.tsx', newContent);
  console.log("Patched KitchenDashboard correctly");
} else {
  console.log("Could not find start or end index for OrderCard");
}
