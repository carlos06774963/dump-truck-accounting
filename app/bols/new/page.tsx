'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const MATERIALS = ['Dirt', 'Gravel', 'Asphalt', 'Concrete', 'Mix Material']

const defaultForm = {
  bill_no: '',
  date: new Date().toISOString().split('T')[0],
  truck_no: '1',
  principal_carrier_name: '',
  shipper: '',
  shipper_address: '',
  material: 'Gravel',
  custom_material: '',
  num_loads: '1',
  rate: '',
  commission_pct: '8',
}

export default function NewBolPage() {
  const [form, setForm] = useState<any>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [bolPhoto, setBolPhoto] = useState<File | null>(null)
  const [bolPhotoPreview, setBolPhotoPreview] = useState<string | null>(null)
  const [carriers, setCarriers] = useState<any[]>([])

  useEffect(() => {
    supabase.from('customers').select('id,name').order('name').then(({ data }) => setCarriers(data || []))
  }, [])

  function set(key: string, val: string) {
    setForm((f: any) => ({ ...f, [key]: val }))
  }

  const numLoads = parseFloat(form.num_loads) || 0
  const rate = parseFloat(form.rate) || 0
  const total = numLoads * rate
  const commissionPct = parseFloat(form.commission_pct) || 0
  const commission = total * (commissionPct / 100)
  const net = total - commission
  const material = form.material === 'Other' ? form.custom_material : form.material

  function toIsoDate(val: string): string {
    if (!val) return ''
    // already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
    // MM/DD/YYYY → YYYY-MM-DD
    const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`
    return val
  }

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    try {
      const { convertToJpeg } = await import('@/lib/imageToJpeg')
      const jpeg = await convertToJpeg(file)
      const path = 'bol-' + Date.now() + '.jpg'
      const { error: upErr } = await supabase.storage.from('photoscanning').upload(path, jpeg, { contentType: 'image/jpeg', upsert: true })
      if (upErr) { alert('Upload failed: ' + upErr.message); setScanning(false); return }
      const { data: urlData } = supabase.storage.from('photoscanning').getPublicUrl(path)
      const res = await fetch('/api/scan-bol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: urlData.publicUrl }),
      })
      const data = await res.json()
      supabase.storage.from('photoscanning').remove([path]).catch(() => {})
      if (data.error) { setScanning(false); return }
      const loads = Array.isArray(data.loads) ? data.loads.length : (typeof data.loads === 'number' ? data.loads : null)
      setForm((f: any) => ({
        ...f,
        bill_no: data.bill_no || f.bill_no,
        date: toIsoDate(data.date) || f.date,
        truck_no: data.truck_no || f.truck_no,
        principal_carrier_name: data.principal_carrier_name || f.principal_carrier_name,
        shipper: data.shipper || f.shipper,
        shipper_address: data.shipper_address || f.shipper_address,
        rate: data.rate ? String(data.rate) : f.rate,
        num_loads: loads ? String(loads) : f.num_loads,
      }))
      setScanning(false)
    } catch (err) {
      setScanning(false)
    }
  }

  function handleBolPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBolPhoto(file)
    setBolPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSave(status: string) {
    setSaving(true)
    const { data: bol, error } = await supabase
      .from('bills_of_lading')
      .insert({
        bill_no: form.bill_no,
        date: form.date,
        truck_no: form.truck_no,
        principal_carrier_name: form.principal_carrier_name,
        underlying_carrier: 'Precision Care',
        shipper: form.shipper,
        shipper_address: form.shipper_address,
        billing_method: 'PER LOAD',
        rate: rate,
        total_charges: total,
        notes: `Material: ${material} | Commission: ${commissionPct}% ($${commission.toFixed(2)}) | Net: $${net.toFixed(2)}${bolPhoto ? ' | has_photo:true' : ''}`,
        status,
      })
      .select()
      .single()

    if (error) { alert('Error: ' + error.message); setSaving(false); return }

    const loadRows = Array.from({ length: numLoads }, (_, i) => ({
      bol_id: bol.id,
      row_number: i + 1,
      commodity: material,
      weight: '',
      tag_no: '',
    }))
    if (loadRows.length) await supabase.from('bol_loads').insert(loadRows)

    if (bolPhoto) {
      const path = 'bol-doc-' + bol.id + '.jpg'
      await supabase.storage.from('photoscanning').upload(path, bolPhoto, { upsert: true })
    }

    window.location.href = '/bols/' + bol.id
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">New Ticket</h1>
        <div>
          <button
            onClick={() => document.getElementById('scan-input')?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"
            disabled={scanning}
          >
            {scanning ? 'Scanning...' : '📷 Scan'}
          </button>
          <input id="scan-input" type="file" accept="image/*" className="hidden" onChange={handleScan} />
        </div>
      </div>

      {scanning && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-blue-700 text-sm">
          Reading ticket... about 15 seconds.
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-5 space-y-4">

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Ticket #</label>
            <input className="input" value={form.bill_no} onChange={(e) => set('bill_no', e.target.value)} placeholder="e.g. 10452" />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Truck #</label>
          <input className="input" value={form.truck_no} onChange={(e) => set('truck_no', e.target.value)} />
        </div>

        <div>
          <label className="label">Customer <span className="text-gray-400 font-normal text-xs">principal carrier</span></label>
          <select className="input" value={form.principal_carrier_name} onChange={(e) => set('principal_carrier_name', e.target.value)}>
            <option value="">— Select carrier —</option>
            {carriers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            <option value="__other__">Other (type below)</option>
          </select>
          {form.principal_carrier_name === '__other__' && (
            <input className="input mt-2" placeholder="Type carrier name" onChange={(e) => set('principal_carrier_name', e.target.value)} />
          )}
        </div>

        <div>
          <label className="label">Shipper</label>
          <input className="input" value={form.shipper} onChange={(e) => set('shipper', e.target.value)} />
        </div>

        <div>
          <label className="label">Address</label>
          <input className="input" value={form.shipper_address} onChange={(e) => set('shipper_address', e.target.value)} />
        </div>

        <div>
          <label className="label">Material</label>
          <select className="input" value={form.material} onChange={(e) => set('material', e.target.value)}>
            {MATERIALS.map((m) => <option key={m}>{m}</option>)}
            <option value="Other">Other / New material...</option>
          </select>
          {form.material === 'Other' && (
            <input className="input mt-2" placeholder="Type material name" value={form.custom_material} onChange={(e) => set('custom_material', e.target.value)} />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label"># of Loads</label>
            <input type="number" className="input" value={form.num_loads} onChange={(e) => set('num_loads', e.target.value)} min="1" />
          </div>
          <div>
            <label className="label">Price per Load $</label>
            <input type="number" className="input" value={form.rate} onChange={(e) => set('rate', e.target.value)} placeholder="0.00" />
          </div>
        </div>

        {/* Calculated summary */}
        <div className="bg-gray-50 rounded p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total ({numLoads} loads × ${rate.toFixed(2)})</span>
            <span className="font-semibold">${total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Commission</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="w-16 border rounded px-2 py-1 text-right text-sm"
                value={form.commission_pct}
                onChange={(e) => set('commission_pct', e.target.value)}
              />
              <span className="text-gray-500">%</span>
              <span className="font-semibold text-red-600">-${commission.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex justify-between border-t pt-2 font-bold text-base">
            <span>Net</span>
            <span className="text-green-700">${net.toFixed(2)}</span>
          </div>
        </div>

        {/* Attach BOL photo */}
        <div>
          <label className="label">Attach Physical BOL Photo</label>
          <div
            onClick={() => document.getElementById('bol-photo-input')?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-yellow-400 transition-colors"
          >
            {bolPhotoPreview ? (
              <img src={bolPhotoPreview} alt="BOL" className="max-h-48 mx-auto rounded object-contain" />
            ) : (
              <div className="text-gray-400 text-sm">
                <div className="text-2xl mb-1">📄</div>
                Tap to take photo or choose from library
              </div>
            )}
          </div>
          <input id="bol-photo-input" type="file" accept="image/*" className="hidden" onChange={handleBolPhoto} />
          {bolPhoto && <p className="text-xs text-green-600 mt-1">Photo ready — will be saved with this ticket</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="border border-gray-300 hover:bg-gray-50 px-5 py-2 rounded font-medium"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave('submitted')}
            disabled={saving}
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-5 py-2 rounded font-semibold flex-1"
          >
            {saving ? 'Saving...' : 'Save & Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
