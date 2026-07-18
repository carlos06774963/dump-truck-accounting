'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ReportsPage() {
  const [bols, setBols] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    Promise.all([
      supabase.from('bills_of_lading').select('*'),
      supabase.from('expenses').select('*'),
    ]).then(([{ data: b }, { data: e }]) => {
      setBols(b || [])
      setExpenses(e || [])
    })
  }, [])

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0')
    const label = new Date(year, i).toLocaleString('default', { month: 'short' })
    const bolsInMonth = bols.filter((b) => b.date?.startsWith(`${year}-${m}`) || b.date?.includes(`/${m}/`) || b.date?.includes(`${m}/`))
    const expInMonth = expenses.filter((e) => e.date?.startsWith(`${year}-${m}`))
    const revenue = bolsInMonth.reduce((s, b) => s + (b.total_charges || 0), 0)
    const expense = expInMonth.reduce((s, e) => s + (e.amount || 0), 0)
    return { label, revenue, expense, net: revenue - expense, loads: bolsInMonth.length }
  })

  const totalRev = months.reduce((s, m) => s + m.revenue, 0)
  const totalExp = months.reduce((s, m) => s + m.expense, 0)
  const totalNet = totalRev - totalExp

  // By customer
  const byCustomer: Record<string, number> = {}
  bols.forEach((b) => {
    if (b.principal_carrier_name) {
      byCustomer[b.principal_carrier_name] = (byCustomer[b.principal_carrier_name] || 0) + (b.total_charges || 0)
    }
  })
  const customerList = Object.entries(byCustomer).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-xs text-gray-500">Total Revenue {year}</p>
          <p className="text-2xl font-bold text-green-600">${totalRev.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-xs text-gray-500">Total Expenses {year}</p>
          <p className="text-2xl font-bold text-red-600">${totalExp.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-xs text-gray-500">Net Profit {year}</p>
          <p className={`text-2xl font-bold ${totalNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>${totalNet.toLocaleString()}</p>
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <h2 className="font-semibold px-4 py-3 border-b">Monthly Breakdown</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Month</th>
              <th className="px-4 py-2">BOLs</th>
              <th className="px-4 py-2">Revenue</th>
              <th className="px-4 py-2">Expenses</th>
              <th className="px-4 py-2">Net</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.label} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{m.label}</td>
                <td className="px-4 py-2">{m.loads}</td>
                <td className="px-4 py-2 text-green-600">${m.revenue.toLocaleString()}</td>
                <td className="px-4 py-2 text-red-600">${m.expense.toLocaleString()}</td>
                <td className={`px-4 py-2 font-semibold ${m.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>${m.net.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* By Customer */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="font-semibold px-4 py-3 border-b">Revenue by Customer</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {customerList.map(([name, total]) => (
              <tr key={name} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{name}</td>
                <td className="px-4 py-2 font-semibold text-green-700">${total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customerList.length === 0 && <p className="p-4 text-sm text-gray-500">No data yet.</p>}
      </div>
    </div>
  )
}
