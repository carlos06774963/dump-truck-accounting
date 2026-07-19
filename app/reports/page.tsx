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

  // Parse commission from notes field: "Material: X | Commission: 8% ($Y) | Net: $Z"
  function parseNet(bol: any) {
    if (bol.notes) {
      const m = bol.notes.match(/Net:\s*\$([0-9.]+)/)
      if (m) return parseFloat(m[1])
    }
    return bol.total_charges || 0
  }

  function parseCommission(bol: any) {
    if (bol.notes) {
      const m = bol.notes.match(/Commission:.*?\(\$([0-9.]+)\)/)
      if (m) return parseFloat(m[1])
    }
    return 0
  }

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0')
    const label = new Date(year, i).toLocaleString('default', { month: 'short' })
    const bolsInMonth = bols.filter((b) => b.date?.startsWith(`${year}-${m}`))
    const expInMonth = expenses.filter((e) => e.date?.startsWith(`${year}-${m}`))
    const gross = bolsInMonth.reduce((s, b) => s + (b.total_charges || 0), 0)
    const commission = bolsInMonth.reduce((s, b) => s + parseCommission(b), 0)
    const net = bolsInMonth.reduce((s, b) => s + parseNet(b), 0)
    const expense = expInMonth.reduce((s, e) => s + (e.amount || 0), 0)
    return { label, gross, commission, net, expense, profit: net - expense, loads: bolsInMonth.length }
  })

  const totalGross = months.reduce((s, m) => s + m.gross, 0)
  const totalCommission = months.reduce((s, m) => s + m.commission, 0)
  const totalNet = months.reduce((s, m) => s + m.net, 0)
  const totalExp = months.reduce((s, m) => s + m.expense, 0)
  const totalProfit = totalNet - totalExp

  // By customer
  const byCustomer: Record<string, { gross: number; commission: number; net: number; loads: number }> = {}
  bols.forEach((b) => {
    const name = b.principal_carrier_name || 'Unknown'
    if (!byCustomer[name]) byCustomer[name] = { gross: 0, commission: 0, net: 0, loads: 0 }
    byCustomer[name].gross += b.total_charges || 0
    byCustomer[name].commission += parseCommission(b)
    byCustomer[name].net += parseNet(b)
    byCustomer[name].loads += 1
  })
  const customerList = Object.entries(byCustomer).sort((a, b) => b[1].gross - a[1].gross)

  // By material
  const byMaterial: Record<string, { loads: number; gross: number }> = {}
  bols.forEach((b) => {
    const m = b.notes?.match(/Material:\s*([^|]+)/)
    const mat = m ? m[1].trim() : 'Unknown'
    if (!byMaterial[mat]) byMaterial[mat] = { loads: 0, gross: 0 }
    byMaterial[mat].loads += 1
    byMaterial[mat].gross += b.total_charges || 0
  })
  const materialList = Object.entries(byMaterial).sort((a, b) => b[1].loads - a[1].loads)

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Gross Revenue</p>
          <p className="text-xl font-bold text-green-600">${totalGross.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Commission Paid</p>
          <p className="text-xl font-bold text-orange-500">-${totalCommission.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Net Revenue</p>
          <p className="text-xl font-bold text-blue-600">${totalNet.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Expenses</p>
          <p className="text-xl font-bold text-red-600">-${totalExp.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6 flex justify-between items-center">
        <span className="font-semibold text-gray-700">Net Profit {year}</span>
        <span className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>${totalProfit.toLocaleString()}</span>
      </div>

      {/* Monthly breakdown */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <h2 className="font-semibold px-4 py-3 border-b">Monthly Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-2">Month</th>
                <th className="px-4 py-2">Tickets</th>
                <th className="px-4 py-2">Gross</th>
                <th className="px-4 py-2">Commission</th>
                <th className="px-4 py-2">Net Rev.</th>
                <th className="px-4 py-2">Expenses</th>
                <th className="px-4 py-2">Profit</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.label} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{m.label}</td>
                  <td className="px-4 py-2 text-gray-500">{m.loads}</td>
                  <td className="px-4 py-2 text-green-600">${m.gross.toLocaleString()}</td>
                  <td className="px-4 py-2 text-orange-500">{m.commission > 0 ? `-$${m.commission.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-2 text-blue-600">${m.net.toLocaleString()}</td>
                  <td className="px-4 py-2 text-red-500">{m.expense > 0 ? `-$${m.expense.toLocaleString()}` : '—'}</td>
                  <td className={`px-4 py-2 font-semibold ${m.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>${m.profit.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* By Customer */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <h2 className="font-semibold px-4 py-3 border-b">Revenue by Carrier</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500 text-xs uppercase">
              <th className="px-4 py-2">Carrier</th>
              <th className="px-4 py-2">Tickets</th>
              <th className="px-4 py-2">Gross</th>
              <th className="px-4 py-2">Commission</th>
              <th className="px-4 py-2">Net</th>
            </tr>
          </thead>
          <tbody>
            {customerList.map(([name, d]) => (
              <tr key={name} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{name}</td>
                <td className="px-4 py-2 text-gray-500">{d.loads}</td>
                <td className="px-4 py-2 text-green-600">${d.gross.toLocaleString()}</td>
                <td className="px-4 py-2 text-orange-500">{d.commission > 0 ? `-$${d.commission.toFixed(0)}` : '—'}</td>
                <td className="px-4 py-2 font-semibold text-blue-600">${d.net.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customerList.length === 0 && <p className="p-4 text-sm text-gray-500">No tickets yet.</p>}
      </div>

      {/* By Material */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="font-semibold px-4 py-3 border-b">Revenue by Material</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500 text-xs uppercase">
              <th className="px-4 py-2">Material</th>
              <th className="px-4 py-2">Loads</th>
              <th className="px-4 py-2">Gross Revenue</th>
            </tr>
          </thead>
          <tbody>
            {materialList.map(([mat, d]) => (
              <tr key={mat} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{mat}</td>
                <td className="px-4 py-2 text-gray-500">{d.loads}</td>
                <td className="px-4 py-2 text-green-600">${d.gross.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {materialList.length === 0 && <p className="p-4 text-sm text-gray-500">No tickets yet.</p>}
      </div>
    </div>
  )
}
