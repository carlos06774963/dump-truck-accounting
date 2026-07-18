'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const categories = ['Fuel', 'Parts', 'Mechanic', 'Maintenance', 'Tires', 'Insurance', 'Registration', 'Tolls', 'Wash', 'Permits', 'Materials', 'Other']

const empty = { date: new Date().toISOString().split('T')[0], category: 'Fuel', description: '', amount: '', truck_no: '' }

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [form, setForm] = useState<any>(empty)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false })
    setExpenses(data || [])
  }

  async function save() {
    setSaving(true)
    await supabase.from('expenses').insert({ ...form, amount: parseFloat(form.amount) || 0 })
    setForm(empty)
    setAdding(false)
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
    setAdding(true)
    try {
      const { compressImageToBase64 } = await import('@/lib/imageToJpeg')
      const imageBase64 = await compressImageToBase64(file)
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      })
      const data = await res.json()
      if (data.error) { alert('Scan failed: ' + data.error); setScanning(false); return }
      setForm((f: any) => ({ ...f, ...data, amount: String(data.amount || '') }))
      setScanning(false)
    } catch {
      setScanning(false)
      alert('Failed to scan image.')
    }
  }

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded flex items-center gap-1"
            disabled={scanning}
          >
            {scanning ? 'Scanning...' : '📷 Scan Receipt'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={handleScan} />
          <button
            onClick={() => setAdding(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 rounded"
          >
            + Add Manual
          </button>
        </div>
      </div>

      {scanning && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-blue-700 text-sm">
          Reading your receipt... about 10 seconds.
        </div>
      )}

      {adding && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold mb-3">New Expense</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Amount $</label>
              <input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">Truck #</label>
              <input className="input" value={form.truck_no} onChange={(e) => setForm({ ...form, truck_no: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} disabled={saving} className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded font-medium">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setAdding(false)} className="border border-gray-300 px-4 py-2 rounded">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Truck #</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{e.date}</td>
                <td className="px-4 py-3">
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{e.category}</span>
                </td>
                <td className="px-4 py-3">{e.description}</td>
                <td className="px-4 py-3">{e.truck_no}</td>
                <td className="px-4 py-3 font-medium text-red-600">-${(e.amount || 0).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => del(e.id)} className="text-gray-400 hover:text-red-600 text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t font-semibold">
              <td colSpan={4} className="px-4 py-3 text-right">Total</td>
              <td className="px-4 py-3 text-red-600">-${total.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        {expenses.length === 0 && <p className="p-6 text-gray-500 text-sm">No expenses yet.</p>}
      </div>
    </div>
  )
}
