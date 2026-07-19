'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const empty = { name: '', phone: '', address: '', city_state_zip: '', email: '', notes: '' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [form, setForm] = useState<any>(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data || [])
  }

  function startEdit(c: any) {
    setForm({ name: c.name || '', phone: c.phone || '', address: c.address || '', city_state_zip: c.city_state_zip || '', email: c.email || '', notes: c.notes || '' })
    setEditingId(c.id)
    setAdding(false)
  }

  function startAdd() {
    setForm(empty)
    setEditingId(null)
    setAdding(true)
  }

  function cancel() {
    setAdding(false)
    setEditingId(null)
    setForm(empty)
  }

  async function save() {
    if (!form.name.trim()) { alert('Name is required'); return }
    setSaving(true)
    if (editingId) {
      await supabase.from('customers').update(form).eq('id', editingId)
    } else {
      await supabase.from('customers').insert(form)
    }
    setSaving(false)
    cancel()
    load()
  }

  async function del(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return
    await supabase.from('customers').delete().eq('id', id)
    load()
  }

  const isOpen = adding || editingId !== null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button onClick={startAdd} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 rounded">
          + Add Customer
        </button>
      </div>

      {isOpen && (
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <h2 className="font-semibold mb-4">{editingId ? 'Edit Customer' : 'New Customer'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Efrain Cruz Trucking" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(818) 000-0000" />
            </div>
            <div>
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="label">City / State / Zip</label>
              <input className="input" value={form.city_state_zip} onChange={(e) => setForm({ ...form, city_state_zip: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. pays every Friday" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving} className="bg-yellow-500 hover:bg-yellow-600 text-black px-5 py-2 rounded font-semibold">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Customer'}
            </button>
            <button onClick={cancel} className="border border-gray-300 px-4 py-2 rounded">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                <td className="px-4 py-3 text-gray-600">{[c.address, c.city_state_zip].filter(Boolean).join(', ')}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{c.notes}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => startEdit(c)} className="text-blue-500 hover:text-blue-700 text-xs mr-3">Edit</button>
                  <button onClick={() => del(c.id, c.name)} className="text-gray-400 hover:text-red-600 text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <p className="p-6 text-gray-500 text-sm">No customers yet. Add your first one.</p>}
      </div>
    </div>
  )
}
