'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalBols: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    unpaidBols: 0,
  })
  const [recentBols, setRecentBols] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const [{ data: bols }, { data: expenses }] = await Promise.all([
        supabase.from('bills_of_lading').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('amount'),
      ])
      if (bols) {
        setRecentBols(bols.slice(0, 5))
        setStats({
          totalBols: bols.length,
          totalRevenue: bols.reduce((s: number, b: any) => s + (b.total_charges || 0), 0),
          unpaidBols: bols.filter((b: any) => b.status !== 'paid').length,
          totalExpenses: expenses?.reduce((s: number, e: any) => s + (e.amount || 0), 0) ?? 0,
        })
      }
    }
    load()
  }, [])

  const net = stats.totalRevenue - stats.totalExpenses

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/bols/new"
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 rounded"
        >
          + New Bill of Lading
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card label="Total BOLs" value={stats.totalBols} />
        <Card label="Total Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} />
        <Card label="Total Expenses" value={`$${stats.totalExpenses.toLocaleString()}`} />
        <Card
          label="Net Profit"
          value={`$${net.toLocaleString()}`}
          color={net >= 0 ? 'text-green-600' : 'text-red-600'}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-lg mb-3">Recent Bills of Lading</h2>
        {recentBols.length === 0 ? (
          <p className="text-gray-500 text-sm">No bills of lading yet. Create your first one!</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Bill No.</th>
                <th className="pb-2">Date</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBols.map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2">
                    <Link href={`/bols/${b.id}`} className="text-blue-600 hover:underline">
                      {b.bill_no}
                    </Link>
                  </td>
                  <td className="py-2">{b.date}</td>
                  <td className="py-2">{b.principal_carrier_name}</td>
                  <td className="py-2">${(b.total_charges || 0).toLocaleString()}</td>
                  <td className="py-2">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Card({ label, value, color = 'text-gray-900' }: { label: string; value: any; color?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.draft}`}>
      {status}
    </span>
  )
}
