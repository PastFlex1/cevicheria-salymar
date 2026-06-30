const fs = require('fs');
let content = fs.readFileSync('src/components/ReportsDashboard.tsx', 'utf8');

const importStr = `import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";`;

const newImportStr = `import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";`;

if (content.includes(importStr)) {
  content = content.replace(importStr, newImportStr);
} else {
  // If we can't find it exactly, just append it to the recharts imports
  if (!content.includes('LineChart')) {
     content = content.replace('PieChart,', 'PieChart,\n  LineChart,\n  Line,');
  }
}

const dataStr = `// Export to Excel`;

const newDataStr = `// Profit and Loss Data
  const profitAndLossData = useMemo(() => {
    const dataByDate: Record<string, { date: string; ingresos: number; egresos: number; utilidad: number; timestamp: number }> = {};
    
    validSales.forEach(o => {
      const dateStr = new Date(o.date).toLocaleDateString();
      if (!dataByDate[dateStr]) {
        dataByDate[dateStr] = { date: dateStr, ingresos: 0, egresos: 0, utilidad: 0, timestamp: new Date(new Date(o.date).setHours(0,0,0,0)).getTime() };
      }
      dataByDate[dateStr].ingresos += (Number(o.total) || 0);
    });

    filteredExpenses.forEach(e => {
      const dateStr = new Date(e.date).toLocaleDateString();
      if (!dataByDate[dateStr]) {
        dataByDate[dateStr] = { date: dateStr, ingresos: 0, egresos: 0, utilidad: 0, timestamp: new Date(new Date(e.date).setHours(0,0,0,0)).getTime() };
      }
      dataByDate[dateStr].egresos += (Number(e.amount) || 0);
    });

    Object.values(dataByDate).forEach(d => {
      d.utilidad = d.ingresos - d.egresos;
    });

    return Object.values(dataByDate).sort((a, b) => a.timestamp - b.timestamp);
  }, [validSales, filteredExpenses]);

  // Export to Excel`;

if (!content.includes('profitAndLossData = useMemo')) {
  content = content.replace(dataStr, newDataStr);
}


fs.writeFileSync('src/components/ReportsDashboard.tsx', content);
console.log("Profit and loss data inserted");
