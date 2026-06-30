const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `    // Generate sequential ID starting from 000000
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
      tableNumber: tableNumber || "Barra",
      status: "paid",
      documentType,
      ruc: documentType === "factura" ? checkoutForm.documentId : undefined,
      businessName:
        documentType === "factura" ? checkoutForm.businessName : undefined,
      paymentMethod: checkoutForm.paymentMethod,
    };

    updateInventory(cartItems, false);
    setSalesNotes([newOrder, ...salesNotes]);`;

const replacementStr = `    updateInventory(cartItems, false);
    
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
              customerName: checkoutForm.businessName || "Cliente Final",
              tableNumber: tableNumber || "Barra",
              status: "paid",
              documentType,
              ruc: documentType === "factura" ? checkoutForm.documentId : undefined,
              businessName:
                documentType === "factura" ? checkoutForm.businessName : undefined,
              paymentMethod: checkoutForm.paymentMethod,
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
        tableNumber: tableNumber || "Barra",
        status: "paid",
        documentType,
        ruc: documentType === "factura" ? checkoutForm.documentId : undefined,
        businessName:
          documentType === "factura" ? checkoutForm.businessName : undefined,
        paymentMethod: checkoutForm.paymentMethod,
      };
      
      setSalesNotes([newOrder, ...salesNotes]);
    }`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Patched processTransaction");
} else {
  console.log("target string not found for processTransaction update");
}
