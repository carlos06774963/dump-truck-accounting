'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function getAgeDays(dateStr: string) {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function parseNet(bol: any) {
  const m = bol.notes?.match(/Net:\s*\$([0-9.]+)/)
  return m ? parseFloat(m[1]) : (bol.total_charges || 0)
}

function statusLabel(bol: any, paidSoFar: number) {
  if (bol.status === 'paid') return { text: 'PAID', color: 'bg-green-100 text-green-700' }
  if (paidSoFar > 0) return { text: 'PARTIAL', color: 'bg-orange-100 text-orange-700' }
  if (bol.viewed_at) return { text: 'VIEWED', color: 'bg-blue-100 text-blue-700' }
  if (bol.status === 'submitted') return { text: 'SENT', color: 'bg-gray-100 text-gray-500' }
  return { text: 'DRAFT', color: 'bg-gray-100 text-gray-500' }
}

// ── New Payment form (second screen) ──────────────────────────────────────────
function NewPaymentForm({ net, outstanding, onBack, onSave }: {
  net: number; outstanding: number; onBack: () => void; onSave: (amt: number, method: string, date: string, notes: string) => void
}) {
  const [mode, setMode] = useState<'$' | '%' | 'full'>('$')
  const [rawAmount, setRawAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const displayAmount = mode === 'full'
    ? outstanding.toFixed(2)
    : mode === '%'
    ? ((parseFloat(rawAmount) || 0) / 100 * outstanding).toFixed(2)
    : rawAmount

  const resolvedAmount = mode === 'full'
    ? outstanding
    : mode === '%'
    ? (parseFloat(rawAmount) || 0) / 100 * outstanding
    : parseFloat(rawAmount) || 0

  const methods = ['Cash', 'Credit', 'Check', 'Bank Transfer']

  async function handleSave() {
    if (resolvedAmount <= 0) { alert('Enter an amount'); return }
    setSaving(true)
    await onSave(resolvedAmount, method, date, notes)
    setSaving(false)
  }

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
        <button onClick={onBack} className="text-green-600 font-semibold text-base flex items-center gap-1">
          <span>‹</span> Back
        </button>
        <span className="font-bold text-base">New Payment</span>
        <button onClick={handleSave} disabled={saving} className="text-green-600 font-semibold text-base">
          {saving ? '...' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-5 pt-6 pb-10">
        {/* Big amount display */}
        <div className="text-center mb-1">
          <p className="text-5xl font-light text-gray-300">
            ${mode === 'full' ? outstanding.toFixed(2) : (mode === '%' ? ((parseFloat(rawAmount)||0)/100*outstanding).toFixed(2) : (rawAmount || '0.00'))}
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wide mt-2">Outstanding: ${outstanding.toFixed(2)}</p>
        </div>

        {/* $ / % / Full toggle */}
        <div className="flex border border-gray-300 rounded-lg overflow-hidden mt-5 mb-6">
          {(['$', '%', 'full'] as const).map((m, i) => (
            <button key={m} onClick={() => { setMode(m); setRawAmount('') }}
              className={`flex-1 py-2.5 text-sm font-semibold border-r last:border-r-0 border-gray-300 transition-colors ${mode === m ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-500'}`}>
              {m === 'full' ? 'Full' : m}
            </button>
          ))}
        </div>

        {/* Amount input (hidden for "full") */}
        {mode !== 'full' && (
          <div className="mb-6">
            <input
              type="number"
              className="w-full border-b-2 border-gray-200 focus:border-green-500 outline-none text-2xl font-semibold py-2 text-center"
              placeholder={mode === '$' ? '0.00' : '0'}
              value={rawAmount}
              onChange={(e) => setRawAmount(e.target.value)}
              step="0.01"
              autoFocus
            />
            {mode === '%' && rawAmount && (
              <p className="text-center text-gray-400 text-sm mt-1">= ${((parseFloat(rawAmount)||0)/100*outstanding).toFixed(2)}</p>
            )}
          </div>
        )}

        {/* Payment Date */}
        <div className="flex justify-between items-center py-4 border-b border-gray-100">
          <span className="font-semibold text-base">Payment Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="text-gray-400 text-base text-right border-none outline-none bg-transparent" />
        </div>

        {/* Payment Method */}
        <div className="pt-4">
          <p className="font-semibold text-base mb-3">Payment Method</p>
          {methods.map((m) => {
            const val = m.toLowerCase().replace(' ', '_')
            return (
              <button key={m} onClick={() => setMethod(val)}
                className="flex items-center gap-3 w-full py-3 border-b border-gray-100 last:border-0">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${method === val ? 'border-green-600' : 'border-gray-300'}`}>
                  {method === val && <div className="w-2.5 h-2.5 rounded-full bg-green-600" />}
                </div>
                <span className="text-base text-gray-800">{m}</span>
              </button>
            )
          })}
        </div>

        {/* Notes */}
        <div className="mt-4">
          <input className="w-full border-b border-gray-200 py-2 outline-none text-sm text-gray-600 placeholder-gray-300"
            placeholder="Notes (e.g. Check #1042)"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </div>
  )
}

// ── Payment overview (first screen) ───────────────────────────────────────────
function PaymentModal({ bol, payments, onClose, onSaved }: {
  bol: any; payments: any[]; onClose: () => void; onSaved: () => void
}) {
  const net = parseNet(bol)
  const paidSoFar = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const outstanding = Math.max(0, net - paidSoFar)
  const [screen, setScreen] = useState<'overview' | 'new'>('overview')

  async function handleSave(amt: number, method: string, date: string, notes: string) {
    await supabase.from('payments').insert({ bol_id: bol.id, amount: amt, method, payment_date: date, notes })
    if (paidSoFar + amt >= net) {
      await supabase.from('bills_of_lading').update({ status: 'paid' }).eq('id', bol.id)
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={screen === 'overview' ? onClose : undefined}>
      <div className="bg-white w-full max-w-lg rounded-t-2xl overflow-hidden" style={{ maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>

        {screen === 'new' ? (
          <NewPaymentForm
            net={net}
            outstanding={outstanding}
            onBack={() => setScreen('overview')}
            onSave={handleSave}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <button onClick={onClose} className="text-green-600 font-semibold text-base">Close</button>
              <span className="font-bold text-base">Record Payment</span>
              <button onClick={() => setScreen('new')} className="text-green-600 font-bold text-2xl leading-none">+</button>
            </div>

            {/* PAID / DUE summary */}
            <div className="bg-gray-50 px-5 pt-4 pb-4">
              <div className="flex justify-between mb-2">
                <span className="font-bold text-sm text-gray-900">PAID</span>
                <span className="font-bold text-sm text-gray-900">DUE ${outstanding.toFixed(2)}</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden mb-3">
                <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (paidSoFar / net) * 100)}%` }} />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-500">
                  USD ${paidSoFar.toFixed(2)} of ${net.toFixed(2)}
                </div>
              </div>
              {/* Record New Payment button */}
              <button onClick={() => setScreen('new')}
                className="w-full border-2 border-green-600 text-green-600 font-bold py-3 rounded-lg text-base hover:bg-green-50 transition-colors">
                Record New Payment
              </button>
            </div>

            {/* Payment history or empty state */}
            <div className="overflow-y-auto" style={{ maxHeight: '45vh' }}>
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-2xl font-bold">$</span>
                  </div>
                  <p className="font-semibold text-gray-400 text-lg">No Payments Recorded</p>
                  <p className="text-gray-400 text-sm mt-1">A list of recorded payments<br />will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {payments.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center px-5 py-4">
                      <div>
                        <p className="font-semibold capitalize">{p.method.replace('_', ' ')}</p>
                        <p className="text-gray-400 text-sm">{p.payment_date}{p.notes ? ` · ${p.notes}` : ''}</p>
                      </div>
                      <p className="font-bold text-green-700 text-lg">${Number(p.amount).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Invoice list ───────────────────────────────────────────────────────────────
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

export default function InvoicesPage() {
  const [bols, setBols] = useState<any[]>([])
  const [allPayments, setAllPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'paid'>('active')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from('bills_of_lading').select('*').order('date', { ascending: false }),
      supabase.from('payments').select('*'),
    ])
    setBols(b || [])
    setAllPayments(p || [])
    setLoading(false)
  }

  function paymentsFor(id: string) { return allPayments.filter((p) => p.bol_id === id) }

  const filtered = bols.filter((b) => {
    const isActive = b.status !== 'paid'
    if (tab === 'active' && !isActive) return false
    if (tab === 'paid' && isActive) return false
    if (search) {
      const q = search.toLowerCase()
      return (b.principal_carrier_name || '').toLowerCase().includes(q) ||
        (b.bill_no || '').toLowerCase().includes(q)
    }
    return true
  })

  const groups = groupByMonth(filtered)

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <a href="/bols/new" className="w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-gray-700">+</a>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-3 text-sm outline-none"
          placeholder="Search all invoices" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Active / Paid tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        {(['active', 'paid'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            {t === 'active' ? 'Active' : 'Paid'}
          </button>
        ))}
      </div>

      {/* Groups */}
      {groups.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📄</p>
          <p className="font-medium">{tab === 'active' ? 'No active invoices' : 'No paid invoices yet'}</p>
        </div>
      )}

      {groups.map(([key, items]) => {
        const groupTotal = items.reduce((s, b) => {
          const p = paymentsFor(b.id).reduce((a: number, x: any) => a + Number(x.amount || 0), 0)
          return s + (tab === 'active' ? Math.max(0, parseNet(b) - p) : parseNet(b))
        }, 0)

        return (
          <div key={key} className="mb-6">
            <div className="flex justify-between items-baseline mb-2 px-1">
              <span className="font-bold text-base">{monthLabel(key)}</span>
              <span className="font-bold text-base">${groupTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {items.map((b) => {
                const pmts = paymentsFor(b.id)
                const paidSoFar = pmts.reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
                const net = parseNet(b)
                const status = statusLabel(b, paidSoFar)
                const days = getAgeDays(b.date)

                return (
                  <div key={b.id}
                    className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                    onClick={() => setSelected(b)}>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{b.principal_carrier_name || 'No Carrier'}</p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {b.date} · #{b.bill_no || '—'}
                        {tab === 'active' && days > 30 && (
                          <span className={`ml-2 text-xs font-medium ${days > 60 ? 'text-red-500' : 'text-yellow-500'}`}>
                            {days > 60 ? '⚠ Overdue' : `${days}d`}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">${net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        {paidSoFar > 0 && b.status !== 'paid' && (
                          <p className="text-xs text-orange-500">Due ${Math.max(0, net - paidSoFar).toFixed(2)}</p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {selected && (
        <PaymentModal
          bol={selected}
          payments={paymentsFor(selected.id)}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load() }}
        />
      )}
    </div>
  )
}
