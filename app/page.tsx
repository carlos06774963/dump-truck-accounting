'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function parseNet(bol: any) {
  const m = bol.notes?.match(/Net:\s*\$([0-9.]+)/)
  return m ? parseFloat(m[1]) : (bol.total_charges || 0)
}

export default function Dashboard() {
  const [stats, setStats] = useState({ totalInvoices: 0, totalRevenue: 0, totalExpenses: 0, unpaid: 0 })
  const [recent, setRecent] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const [{ data: bols }, { data: expenses }] = await Promise.all([
        supabase.from('bills_of_lading').select('*').order('created_at', { ascending: false }),
        supabase.from('expenses').select('amount'),
      ])
      if (bols) {
        setRecent(bols.slice(0, 5))
        setStats({
          totalInvoices: bols.length,
          totalRevenue: bols.reduce((s: number, b: any) => s + parseNet(b), 0),
          unpaid: bols.filter((b: any) => b.status !== 'paid').length,
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
        <Link href="/bols/new" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 rounded">
          + New Invoice
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card label="Invoices" value={stats.totalInvoices} />
        <Card label="Total Revenue" value={`$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
        <Card label="Total Expenses" value={`$${stats.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
        <Card label="Net Profit" value={`$${net.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} color={net >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      {/* Unpaid alert */}
      {stats.unpaid > 0 && (
        <Link href="/invoices" className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6 hover:bg-orange-100">
          <div>
            <p className="font-semibold text-orange-800">{stats.unpaid} unpaid invoice{stats.unpaid > 1 ? 's' : ''}</p>
            <p className="text-sm text-orange-600">Tap to view and record payments</p>
          </div>
          <span className="text-orange-400 text-xl">›</span>
        </Link>
      )}

      {/* Recent invoices */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-base">Recent Invoices</h2>
          <Link href="/invoices" className="text-sm text-yellow-600 font-medium">See all</Link>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">📄</p>
            <p className="font-medium">No invoices yet</p>
            <Link href="/bols/new" className="mt-2 inline-block text-sm text-yellow-600 font-semibold">+ Create first invoice</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recent.map((b) => {
              const net = parseNet(b)
              const isPaid = b.status === 'paid'
              return (
                <Link key={b.id} href={`/bols/${b.id}`} className="flex items-center justify-between px-4 py-4 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{b.principal_carrier_name || '—'}</p>
                    <p className="text-sm text-gray-400">{b.date} · #{b.bill_no || '—'}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                    <p className="font-bold text-gray-900">${net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${isPaid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {isPaid ? 'PAID' : (b.status || 'DRAFT').toUpperCase()}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ label, value, color = 'text-gray-900' }: { label: string; value: any; color?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
