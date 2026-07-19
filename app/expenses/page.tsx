'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['Fuel', 'Parts', 'Mechanic', 'Maintenance', 'Tires', 'Insurance', 'Registration', 'Tolls', 'Wash', 'Permits', 'Materials', 'Other']

const empty = { date: new Date().toISOString().split('T')[0], category: 'Fuel', description: '', amount: '', truck_no: '1' }

function groupByMonth(items: any[]) {
  const groups: Record<string, any[]> = {}
  items.forEach((e) => {
    const key = e.date ? e.date.slice(0, 7) : 'Unknown'
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function monthLabel(key: string) {
  if (key === 'Unknown') return 'Unknown'
  const [y, m] = key.split('-')
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
}

const categoryIcon: Record<string, string> = {
  Fuel: '⛽', Parts: '🔧', Mechanic: '🛠', Maintenance: '⚙️', Tires: '🔄',
  Insurance: '🛡', Registration: '📋', Tolls: '🛣', Wash: '🪣', Permits: '📄', Materials: '🪨', Other: '📦',
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [form, setForm] = useState<any>(empty)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false })
    setExpenses(data || [])
  }

  function set(key: string, val: string) { setForm((f: any) => ({ ...f, [key]: val })) }

  async function save() {
    if (!form.amount) { alert('Enter an amount'); return }
    setSaving(true)
    await supabase.from('expenses').insert({ ...form, amount: parseFloat(form.amount) || 0 })
    setForm(empty)
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function del(id: string) {
    if (!confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id)
    load()
  }

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setShowForm(true)
    try {
      const { convertToJpeg } = await import('@/lib/imageToJpeg')
      const jpeg = await convertToJpeg(file)
      const path = 'receipt-' + Date.now() + '.jpg'
      const { error: upErr } = await supabase.storage.from('photoscanning').upload(path, jpeg, { contentType: 'image/jpeg', upsert: true })
      if (upErr) { alert('Upload failed: ' + upErr.message); setScanning(false); return }
      const { data: urlData } = supabase.storage.from('photoscanning').getPublicUrl(path)
      const res = await fetch('/api/scan-receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: urlData.publicUrl }) })
      const data = await res.json()
      supabase.storage.from('photoscanning').remove([path])
      if (data.error) { alert('Scan failed: ' + data.error); setScanning(false); return }
      setForm((f: any) => ({ ...f, ...data, amount: String(data.amount || '') }))
    } catch (e) { alert('Failed to scan image.') }
    setScanning(false)
  }

  const groups = groupByMonth(expenses)
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={scanning}
            className="text-sm border border-gray-300 rounded-xl px-3 py-2 font-medium hover:bg-gray-50">
            {scanning ? 'Scanning...' : '📷 Scan'}
          </button>
          <button onClick={() => { setForm(empty); setShowForm(true) }}
            className="w-9 h-9 bg-gray-900 text-white rounded-full flex items-center justify-center text-xl font-bold hover:bg-gray-700">+</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScan} />
      </div>

      {/* Total */}
      {expenses.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex justify-between items-center mb-5">
          <span className="text-sm text-red-700 font-medium">Total Expenses</span>
          <span className="font-bold text-red-700 text-lg">-${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      )}

      {/* Empty state */}
      {expenses.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">💸</p>
          <p className="font-medium">No expenses yet</p>
        </div>
      )}

      {/* Grouped list */}
      {groups.map(([key, items]) => {
        const monthTotal = items.reduce((s, e) => s + (e.amount || 0), 0)
        return (
          <div key={key} className="mb-6">
            <div className="flex justify-between items-baseline mb-2 px-1">
              <span className="font-bold text-base">{monthLabel(key)}</span>
              <span className="font-bold text-base text-red-600">-${monthTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {items.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-4 py-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0">{categoryIcon[e.category] || '📦'}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{e.category}{e.truck_no ? ` · Truck ${e.truck_no}` : ''}</p>
                      <p className="text-sm text-gray-400 truncate">{e.date}{e.description ? ` · ${e.description}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                    <p className="font-bold text-red-600">-${(e.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <button onClick={() => del(e.id)} className="text-gray-300 hover:text-red-500 text-lg leading-none">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Slide-up form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-4"><div className="w-10 h-1 bg-gray-300 rounded-full" /></div>
            <div className="flex justify-between items-center mb-5">
              <button onClick={() => setShowForm(false)} className="text-gray-400">Cancel</button>
              <h2 className="font-bold text-base">New Expense</h2>
              <button onClick={save} disabled={saving} className="text-green-600 font-bold">{saving ? '...' : 'Save'}</button>
            </div>

            {scanning && <p className="text-blue-600 text-sm text-center mb-4">Reading receipt...</p>}

            <div className="space-y-4">
              {/* Category pills */}
              <div>
                <label className="label">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button key={c} onClick={() => set('category', c)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${form.category === c ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                      {categoryIcon[c]} {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
                </div>
                <div>
                  <label className="label">Truck #</label>
                  <input className="input" value={form.truck_no} onChange={(e) => set('truck_no', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="label">Amount $</label>
                <input type="number" className="input text-xl font-bold" value={form.amount}
                  onChange={(e) => set('amount', e.target.value)} placeholder="0.00" step="0.01" />
              </div>

              <div>
                <label className="label">Description (optional)</label>
                <input className="input" value={form.description} onChange={(e) => set('description', e.target.value)}
                  placeholder="e.g. Diesel at Arco" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
