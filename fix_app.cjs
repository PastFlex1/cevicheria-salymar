const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update processTransaction and addOrder to save phone and address
content = content.replace(
  `customerName: checkoutForm.businessName || "Cliente Final",`,
  `customerName: checkoutForm.businessName || "Cliente Final",
              clientPhone: checkoutForm.phone,
              clientAddress: checkoutForm.address,`
);
// replace multiple occurrences if they exist.
content = content.split(`customerName: checkoutForm.businessName || "Cliente Final",`).join(`customerName: checkoutForm.businessName || "Cliente Final",\n              clientPhone: checkoutForm.phone,\n              clientAddress: checkoutForm.address,`);

fs.writeFileSync('src/App.tsx', content);
console.log("Order saving updated");
