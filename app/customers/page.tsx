'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const empty = { name: '', address: '', city_state_zip: '', phone: '' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [form, setForm] = useState<any>(empty)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data || [])
  }

  async function save() {
    setSaving(true)
    await supabase.from('customers').insert(form)
    setForm(empty)
    setAdding(false)
    setSaving(false)
    load()
  }

  async function del(id: string) {
    if (!confirm('Delete this customer?')) return
    await supabase.from('customers').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <button onClick={() => setAdding(true)} className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 rounded">
          + Add Customer
        </button>
      </div>

      {adding && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold mb-3">New Customer (Principal Carrier)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">Address</label><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><label className="label">City/State/Zip</label><input className="input" value={form.city_state_zip} onChange={(e) => setForm({ ...form, city_state_zip: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} disabled={saving} className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded font-medium">{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setAdding(false)} className="border border-gray-300 px-4 py-2 rounded">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3">{c.address} {c.city_state_zip}</td>
                <td className="px-4 py-3">
                  <button onClick={() => del(c.id)} className="text-gray-400 hover:text-red-600 text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <p className="p-6 text-gray-500 text-sm">No customers yet.</p>}
      </div>
    </div>
  )
}
