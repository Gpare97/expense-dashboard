import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Upload } from 'lucide-react';

const CATEGORIES = {
  GROCERY: { name: 'Grocery', keywords: ['supermarket', 'grocery', 'market', 'food', 'carrefour', 'auchan', 'lidl', 'aldi'] },
  RENT: { name: 'Rent', keywords: ['rent', 'house', 'apartment', 'lease', 'housing'] },
  SALARY: { name: 'Salary', keywords: ['salary', 'wage', 'payroll', 'stipend'] },
  TRANSPORTATION: { name: 'Transportation', keywords: ['uber', 'taxi', 'train', 'bus', 'metro', 'fuel', 'gas'] },
  RESTAURANT: { name: 'Restaurant', keywords: ['restaurant', 'cafe', 'bar', 'dining'] },
};

const CATEGORY_COLORS = {
  Grocery: '#4CAF50',
  Rent: '#2196F3',
  Salary: '#9C27B0',
  Transportation: '#FF9800',
  Restaurant: '#F44336',
  Uncategorized: '#757575'
};

const ExpenseDashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [monthlyTotals, setMonthlyTotals] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryTotals, setCategoryTotals] = useState([]);

  const cleanDescription = (desc) => {
    if (!desc) return '';
    
    desc = desc.replace(/N\.carta:?\s*\*+\d+/gi, '')
              .replace(/carta\s+\d+/gi, '')
              .replace(/data:?\s*(\d{2}\/\d{2}\/\d{2,4})?/gi, '')
              .replace(/ora:?\s*\d{2}[:.]\d{2}/gi, '')
              .replace(/\d{2}[:.]\d{2}/g, '')
              .replace(/apple\s+pay/gi, '')
              .replace(/google\s+pay/gi, '')
              .replace(/pagamento\s+pos/gi, '')
              .replace(/addebito\s+carta/gi, '')
              .replace(/bonifico/gi, '')
              .replace(/pagamento/gi, '')
              .replace(/prelievo/gi, '')
              .replace(/\b[A-Z0-9]{6,}\b/g, '')
              .replace(/rif\.\s*\w+/gi, '')
              .replace(/id\s*\w+/gi, '')
              .replace(/\s+/g, ' ')
              .replace(/\s*[,;]\s*/g, ', ')
              .replace(/\s*[-:]\s*/g, ' ')
              .trim();
    
    return desc;
  };

  const formatDate = (dateStr) => {
    try {
      const [day, month, year] = dateStr.split('/');
      const fullYear = year.length === 2 ? '20' + year : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } catch (e) {
      return dateStr;
    }
  };

  const suggestCategory = (description) => {
    description = description.toLowerCase();
    for (const [category, data] of Object.entries(CATEGORIES)) {
      if (data.keywords.some(keyword => description.includes(keyword.toLowerCase()))) {
        return data.name;
      }
    }
    return 'Uncategorized';
  };

  const handleCategoryChange = (transactionIndex, newCategory) => {
    const updatedTransactions = [...transactions];
    updatedTransactions[transactionIndex] = {
      ...updatedTransactions[transactionIndex],
      category: newCategory
    };
    setTransactions(updatedTransactions);
    calculateCategoryTotals(updatedTransactions);
  };

  const calculateCategoryTotals = (data) => {
    const totals = {};
    data.forEach(t => {
      if (t.amount < 0) {
        const category = t.category || 'Uncategorized';
        totals[category] = (totals[category] || 0) + Math.abs(t.amount);
      }
    });

    const categoryData = Object.entries(totals).map(([category, amount]) => ({
      category,
      amount
    }));

    setCategoryTotals(categoryData);
  };

  const processCSV = (csvText) => {
    const lines = csvText.split(/\r?\n/);
    const headers = lines[0].split(';');
    
    const dateIdx = headers.findIndex(h => h.includes('DATA CONT'));
    const descIdx = headers.findIndex(h => h.includes('DESCRIZIONE'));
    const amountIdx = headers.findIndex(h => h.includes('IMPORTO'));

    if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
      alert('CSV format not recognized. Please ensure it contains DATA CONT., DESCRIZIONE, and IMPORTO columns.');
      return;
    }

    const processed = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const columns = line.split(';');
        if (columns.length <= 1) return null;

        const description = cleanDescription(columns[descIdx]);
        const amountStr = columns[amountIdx]
          .replace('€', '')
          .replace(/,/g, '')
          .trim();
        
        const amount = parseFloat(amountStr);
        
        return {
          date: formatDate(columns[dateIdx].trim()),
          description: description,
          amount: amount,
          type: amount < 0 ? 'expense' : 'income',
          category: suggestCategory(description)
        };
      })
      .filter(t => t !== null && !isNaN(t.amount));

    const sortedTransactions = processed.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    setTransactions(sortedTransactions);
    calculateSummary(sortedTransactions);
    calculateMonthlyTotals(sortedTransactions);
    calculateCategoryTotals(sortedTransactions);
  };

  // Added the missing handleFileUpload function
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => processCSV(e.target.result);
      reader.readAsText(file, 'UTF-8');
    }
  };

  const calculateSummary = (data) => {
    const expenses = data.filter(t => t.amount < 0);
    const income = data.filter(t => t.amount > 0);

    setSummary({
      totalExpenses: Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0)),
      totalIncome: income.reduce((sum, t) => sum + t.amount, 0),
      averageExpense: expenses.length ? Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0) / expenses.length) : 0,
      transactionCount: data.length
    });
  };

  const calculateMonthlyTotals = (data) => {
    const totals = {};
    data.forEach(t => {
      const month = t.date.substring(0, 7);
      totals[month] = (totals[month] || 0) + t.amount;
    });

    const monthlyData = Object.entries(totals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month,
        expenses: Math.abs(Math.min(amount, 0)),
        income: Math.max(amount, 0)
      }));

    setMonthlyTotals(monthlyData);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount).replace('EUR', '€');
  };

  const getFilteredTransactions = () => {
    if (selectedCategory === 'all') return transactions;
    if (selectedCategory === 'uncategorized') {
      return transactions.filter(t => !t.category || t.category === 'Uncategorized');
    }
    return transactions.filter(t => t.category === selectedCategory);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Expense Analysis Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center w-full p-4 border-2 border-dashed rounded-lg">
            <label className="flex flex-col items-center cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400" />
              <span className="mt-2 text-sm">Upload your bank statement CSV</span>
              <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            </label>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(summary.totalExpenses)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">{formatCurrency(summary.totalIncome)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Average Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-700">{formatCurrency(summary.averageExpense)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-700">{summary.transactionCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {categoryTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryTotals}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  label={({ category, percent }) => 
                    `${category} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {categoryTotals.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.Uncategorized}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Transactions</CardTitle>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {Object.values(CATEGORIES).map(cat => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-right p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredTransactions().map((t, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{t.date}</td>
                      <td className="p-2">{t.description}</td>
                      <td className="p-2">
                        <Select 
                          value={t.category || 'Uncategorized'} 
                          onValueChange={(value) => handleCategoryChange(i, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(CATEGORIES).map(cat => (
                              <SelectItem key={cat.name} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                            <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className={`p-2 text-right ${t.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExpenseDashboard;
