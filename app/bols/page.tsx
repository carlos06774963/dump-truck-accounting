'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function parseNet(bol: any) {
  const m = bol.notes?.match(/Net:\s*\$([0-9.]+)/)
  return m ? parseFloat(m[1]) : (bol.total_charges || 0)
}

function parseMaterial(bol: any) {
  const m = bol.notes?.match(/Material:\s*([^|]+)/)
  return m ? m[1].trim() : ''
}

function groupByMonth(bols: any[]) {
  const groups: Record<string, any[]> = {}
  bols.forEach((b) => {
    const key = b.date ? b.date.slice(0, 7) : 'Unknown'
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function monthLabel(key: string) {
  if (key === 'Unknown') return 'Unknown'
  const [y, m] = key.split('-')
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}

export default function BolsPage() {
  const [bols, setBols] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('bills_of_lading').select('*').order('date', { ascending: false })
      .then(({ data }) => { setBols(data || []); setLoading(false) })
  }, [])

  const filtered = bols.filter((b) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (b.principal_carrier_name || '').toLowerCase().includes(q) ||
      (b.bill_no || '').toLowerCase().includes(q)
  })

  const groups = groupByMonth(filtered)

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <Link href="/bols/new"
          className="w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-gray-700">+</Link>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-3 text-sm outline-none"
          placeholder="Search tickets" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading && <p className="text-center text-gray-400 py-10">Loading...</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🚛</p>
          <p className="font-medium">No tickets yet</p>
          <Link href="/bols/new" className="mt-3 inline-block text-sm text-green-600 font-semibold">+ Create first ticket</Link>
        </div>
      )}

      {groups.map(([key, items]) => {
        const monthTotal = items.reduce((s, b) => s + parseNet(b), 0)
        return (
          <div key={key} className="mb-6">
            <div className="flex justify-between items-baseline mb-2 px-1">
              <span className="font-bold text-base">{monthLabel(key)}</span>
              <span className="font-bold text-base">${monthTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {items.map((b) => {
                const net = parseNet(b)
                const material = parseMaterial(b)
                return (
                  <Link key={b.id} href={`/bols/${b.id}`}
                    className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 active:bg-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{b.principal_carrier_name || 'No Carrier'}</p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {b.date} · #{b.bill_no || '—'}
                        {material ? ` · ${material}` : ''}
                        {b.truck_no ? ` · Truck ${b.truck_no}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">${net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
                        b.status === 'paid' ? 'bg-green-100 text-green-700' :
                        b.status === 'submitted' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-500'}`}>
                        {(b.status || 'draft').toUpperCase()}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
