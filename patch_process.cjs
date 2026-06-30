const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `  const processTransaction = async (e?: React.FormEvent) => {`;
const startIdx = content.indexOf(targetStr);

if (startIdx !== -1) {
  const newContent = `
  const saveOrder = (status: OrderStatus = "pendiente") => {
    if (cartItems.length === 0) return;

    if (editingOrderId) {
      setSalesNotes((prev) => 
        prev.map((order) => {
          if (order.id === editingOrderId) {
            return {
              ...order,
              items: [...cartItems],
              subtotal,
              tax,
              total,
              tableNumber,
              orderType,
              customerName: checkoutForm.businessName || "Cliente Final",
              status,
            };
          }
          return order;
        })
      );
    } else {
      const currentMaxId = salesNotes.reduce((max, note) => {
        const numId = parseInt(note.id.replace(/\\D/g, ""), 10);
        return !isNaN(numId) && numId > max ? numId : max;
      }, -1);
      const nextIdNum = currentMaxId + 1;
      const nextIdStr = nextIdNum.toString().padStart(6, "0");

      const newOrder: Order = {
        id: \`#\${nextIdStr}\`,
        items: [...cartItems],
        subtotal,
        tax,
        total,
        date: new Date().toISOString(),
        customerName: checkoutForm.businessName || "Cliente Final",
        tableNumber,
        orderType,
        status,
      };

      setSalesNotes([newOrder, ...salesNotes]);
    }

    setCartItems([]);
    setCheckoutForm({
      documentId: "",
      businessName: "",
      email: "",
      phone: "",
      address: "",
      paymentMethod: "Efectivo",
    });
    setTableNumber("");
    setOrderType("mesa");
    setEditingOrderId(null);
    setActiveTab("Lista de Pedidos");
  };

`;
  content = content.substring(0, startIdx) + newContent + content.substring(startIdx);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Patched correctly");
} else {
  console.log("Could not find start index.");
}
