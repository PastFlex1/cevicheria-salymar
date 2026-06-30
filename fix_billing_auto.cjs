const fs = require('fs');
let content = fs.readFileSync('src/components/BillingDashboard.tsx', 'utf8');

const targetStr = `addInvoice(newInvoice);`;
const replacementStr = `
    let finalClientId = newInvoice.clientId;
    if (!finalClientId && newInvoice.ruc && newInvoice.ruc !== "9999999999999") {
        // Create new customer
        const newCustomer = {
            id: "CUST-" + Date.now(),
            name: newInvoice.businessName || "Cliente",
            documentType: newInvoice.ruc.length === 13 ? "RUC" : "Cédula",
            documentNumber: newInvoice.ruc,
            phone: newInvoice.clientPhone || "",
            email: newInvoice.clientEmail || "",
            address: newInvoice.clientAddress || "",
            status: "activo" as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            totalPurchases: 0,
            numberOfPurchases: 0
        };
        setCustomers(prev => [newCustomer, ...prev]);
        finalClientId = newCustomer.id;
        newInvoice.clientId = finalClientId;
    }

    addInvoice(newInvoice);`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/BillingDashboard.tsx', content);
console.log("Client auto-create added");
