'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

function parseNet(bol: any) {
  const m = bol?.notes?.match(/Net:\s*\$([0-9.]+)/)
  return m ? parseFloat(m[1]) : (bol?.total_charges || 0)
}
function parseMaterial(bol: any) {
  const m = bol?.notes?.match(/Material:\s*([^|]+)/)
  return m ? m[1].trim() : ''
}
function parseCommission(bol: any) {
  const m = bol?.notes?.match(/Commission:\s*([\d.]+)%\s*\(\$([0-9.]+)\)/)
  return m ? { pct: m[1], amount: parseFloat(m[2]) } : null
}

// ── Payment Modal (same two-screen Joist style) ────────────────────────────
function NewPaymentForm({ net, outstanding, onBack, onSave }: {
  net: number; outstanding: number; onBack: () => void; onSave: (amt: number, method: string, date: string, notes: string) => void
}) {
  const [mode, setMode] = useState<'$' | '%' | 'full'>('$')
  const [rawAmount, setRawAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const resolvedAmount = mode === 'full' ? outstanding
    : mode === '%' ? (parseFloat(rawAmount) || 0) / 100 * outstanding
    : parseFloat(rawAmount) || 0

  async function handleSave() {
    if (resolvedAmount <= 0) { alert('Enter an amount'); return }
    setSaving(true)
    await onSave(resolvedAmount, method, date, notes)
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b bg-white">
        <button onClick={onBack} className="text-green-600 font-semibold text-base">‹ Back</button>
        <span className="font-bold text-base">New Payment</span>
        <button onClick={handleSave} disabled={saving} className="text-green-600 font-semibold text-base">{saving ? '...' : 'Save'}</button>
      </div>
      <div className="flex-1 overflow-y-auto bg-white px-5 pt-6 pb-10">
        <div className="text-center mb-1">
          <p className="text-5xl font-light text-gray-300">
            ${mode === 'full' ? outstanding.toFixed(2) : mode === '%' ? ((parseFloat(rawAmount)||0)/100*outstanding).toFixed(2) : (rawAmount || '0.00')}
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wide mt-2">Outstanding: ${outstanding.toFixed(2)}</p>
        </div>
        <div className="flex border border-gray-300 rounded-lg overflow-hidden mt-5 mb-6">
          {(['$', '%', 'full'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setRawAmount('') }}
              className={`flex-1 py-2.5 text-sm font-semibold border-r last:border-r-0 border-gray-300 ${mode === m ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-500'}`}>
              {m === 'full' ? 'Full' : m}
            </button>
          ))}
        </div>
        {mode !== 'full' && (
          <div className="mb-6">
            <input type="number" className="w-full border-b-2 border-gray-200 focus:border-green-500 outline-none text-2xl font-semibold py-2 text-center"
              placeholder={mode === '$' ? '0.00' : '0'} value={rawAmount} onChange={(e) => setRawAmount(e.target.value)} step="0.01" autoFocus />
            {mode === '%' && rawAmount && <p className="text-center text-gray-400 text-sm mt-1">= ${((parseFloat(rawAmount)||0)/100*outstanding).toFixed(2)}</p>}
          </div>
        )}
        <div className="flex justify-between items-center py-4 border-b border-gray-100">
          <span className="font-semibold">Payment Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-gray-400 border-none outline-none bg-transparent text-right" />
        </div>
        <div className="pt-4">
          <p className="font-semibold mb-3">Payment Method</p>
          {['Cash', 'Credit', 'Check', 'Bank Transfer'].map((m) => {
            const val = m.toLowerCase().replace(' ', '_')
            return (
              <button key={m} onClick={() => setMethod(val)} className="flex items-center gap-3 w-full py-3 border-b border-gray-100 last:border-0">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method === val ? 'border-green-600' : 'border-gray-300'}`}>
                  {method === val && <div className="w-2.5 h-2.5 rounded-full bg-green-600" />}
                </div>
                <span className="text-base">{m}</span>
              </button>
            )
          })}
        </div>
        <input className="w-full border-b border-gray-200 py-2 outline-none text-sm text-gray-600 placeholder-gray-300 mt-4"
          placeholder="Notes (e.g. Check #1042)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </div>
  )
}

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
          <NewPaymentForm net={net} outstanding={outstanding} onBack={() => setScreen('overview')} onSave={handleSave} />
        ) : (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <button onClick={onClose} className="text-green-600 font-semibold">Close</button>
              <span className="font-bold text-base">Record Payment</span>
              <button onClick={() => setScreen('new')} className="text-green-600 font-bold text-2xl leading-none">+</button>
            </div>
            <div className="bg-gray-50 px-5 pt-4 pb-4">
              <div className="flex justify-between mb-2">
                <span className="font-bold text-sm">PAID</span>
                <span className="font-bold text-sm">DUE ${outstanding.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden mb-3">
                <div className="bg-green-500 h-full rounded-full" style={{ width: `${Math.min(100, (paidSoFar / net) * 100)}%` }} />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-500">
                  USD ${paidSoFar.toFixed(2)} of ${net.toFixed(2)}
                </div>
              </div>
              <button onClick={() => setScreen('new')} className="w-full border-2 border-green-600 text-green-600 font-bold py-3 rounded-lg">
                Record New Payment
              </button>
            </div>
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

// ── Main detail page ───────────────────────────────────────────────────────────
export default function BolDetailPage() {
  const { id } = useParams()
  const [bol, setBol] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from('bills_of_lading').select('*').eq('id', id).single(),
      supabase.from('payments').select('*').eq('bol_id', id),
    ])
    setBol(b)
    setPayments(p || [])
    setLoading(false)
  }

  async function deleteBol() {
    if (!confirm('Delete this ticket?')) return
    await supabase.from('payments').delete().eq('bol_id', id)
    await supabase.from('bol_loads').delete().eq('bol_id', id)
    await supabase.from('bills_of_lading').delete().eq('id', id)
    window.location.href = '/bols'
  }

  function sendInvoice() {
    const url = window.location.origin + '/invoice/' + id
    if (navigator.share) {
      navigator.share({ title: 'Invoice #' + (bol.bill_no || ''), url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return <p className="p-4 text-gray-500">Loading...</p>
  if (!bol) return <p className="p-4 text-gray-500">Not found.</p>

  const net = parseNet(bol)
  const material = parseMaterial(bol)
  const commission = parseCommission(bol)
  const paidSoFar = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const outstanding = Math.max(0, net - paidSoFar)
  const numLoads = parseFloat(bol.num_loads) || 1
  const rate = parseFloat(bol.rate) || 0

  return (
    <div className="max-w-lg mx-auto">
      {/* Back + title */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/bols" className="text-green-600 font-semibold flex items-center gap-1">‹ Tickets</Link>
        <span className="font-bold text-base">#{bol.bill_no || '—'}</span>
        <button onClick={deleteBol} className="text-red-400 text-sm font-medium">Delete</button>
      </div>

      {/* Action bar — SEND / PAYMENTS */}
      <div className="flex border-b border-gray-200 mb-5">
        <button onClick={sendInvoice} className="flex-1 flex flex-col items-center py-3 gap-1 text-gray-600 hover:bg-gray-50">
          <span className="text-xl">📤</span>
          <span className="text-xs font-semibold tracking-wide">{copied ? 'COPIED!' : 'SEND'}</span>
        </button>
        <button onClick={() => setShowPayment(true)} className="flex-1 flex flex-col items-center py-3 gap-1 text-gray-600 hover:bg-gray-50 border-l border-gray-200">
          <span className="text-xl">💳</span>
          <span className="text-xs font-semibold tracking-wide">PAYMENTS</span>
        </button>
      </div>

      {/* Invoice card */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">

        {/* Status */}
        <div className="flex justify-between items-center">
          <span className={`text-xs font-bold px-2 py-1 rounded ${
            bol.status === 'paid' ? 'bg-green-100 text-green-700' :
            bol.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-500'}`}>
            {bol.status?.toUpperCase() || 'DRAFT'}
          </span>
          {bol.viewed_at && (
            <p className="text-xs text-blue-500">👁 Viewed {new Date(bol.viewed_at).toLocaleDateString()}</p>
          )}
        </div>

        {/* Key fields */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-400 text-xs">Customer</p><p className="font-semibold">{bol.principal_carrier_name || '—'}</p></div>
          <div><p className="text-gray-400 text-xs">Date</p><p className="font-medium">{bol.date}</p></div>
          <div><p className="text-gray-400 text-xs">Truck #</p><p className="font-medium">{bol.truck_no || '—'}</p></div>
          <div><p className="text-gray-400 text-xs">Material</p><p className="font-medium">{material || '—'}</p></div>
          {bol.shipper && <div><p className="text-gray-400 text-xs">Shipper</p><p className="font-medium">{bol.shipper}</p></div>}
          {bol.shipper_address && <div className="col-span-2"><p className="text-gray-400 text-xs">Address</p><p className="font-medium">{bol.shipper_address}</p></div>}
        </div>

        {/* Line items */}
        <div className="border-t pt-4">
          <div className="flex justify-between text-sm py-1">
            <span className="text-gray-500">{numLoads} load{numLoads !== 1 ? 's' : ''} × ${rate.toFixed(2)}</span>
            <span className="font-medium">${(bol.total_charges || 0).toFixed(2)}</span>
          </div>
          {commission && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Commission ({commission.pct}%)</span>
              <span className="text-red-500">-${commission.amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-3 mt-1">
            <span>Net</span>
            <span className="text-gray-900">${net.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment summary */}
        {paidSoFar > 0 && (
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Paid</span>
              <span className="text-green-600 font-semibold">${paidSoFar.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Outstanding</span>
              <span className={`font-bold ${outstanding > 0 ? 'text-orange-500' : 'text-green-600'}`}>${outstanding.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (paidSoFar / net) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {showPayment && (
        <PaymentModal bol={bol} payments={payments} onClose={() => setShowPayment(false)} onSaved={() => { setShowPayment(false); load() }} />
      )}
    </div>
  )
}
