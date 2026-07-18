'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const emptyLoad = () => ({
  row_number: 1,
  tag_no: '',
  weight: '',
  commodity: '',
  loading_arrive: '',
  loading_depart: '',
  unloading_arrive: '',
  unloading_depart: '',
  standby_time: '',
  breakdown_reason: '',
})

const defaultForm = {
  bill_no: '',
  date: new Date().toLocaleDateString('en-US'),
  principal_carrier_name: '',
  underlying_carrier: 'Precision Care',
  underlying_address: '',
  underlying_phone: '',
  job_no: '',
  broker_no: '',
  truck_no: '',
  trailer_no: '',
  ca_no: '',
  shipper: '',
  shipper_address: '',
  shipper_city_state_zip: '',
  receiver: '',
  receiver_address: '',
  receiver_city_state_zip: '',
  point_of_origin: '',
  point_of_destination: '',
  equipment_type: '',
  billing_method: 'PER LOAD',
  rate: '',
  total_charges: '',
  notes: '',
  status: 'draft',
}

export default function NewBolPage() {
  const router = useRouter()
  const [form, setForm] = useState<any>(defaultForm)
  const [loads, setLoads] = useState([{ ...emptyLoad(), row_number: 1 }])
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function setField(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }))
  }

  function setLoad(i: number, key: string, value: string) {
    setLoads((ls) => ls.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)))
  }

  function addLoad() {
    setLoads((ls) => [...ls, { ...emptyLoad(), row_number: ls.length + 1 }])
  }

  function removeLoad(i: number) {
    setLoads((ls) => ls.filter((_, idx) => idx !== i))
  }

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    try {
      const { compressImageToBase64 } = await import('@/lib/imageToJpeg')
      const imageBase64 = await compressImageToBase64(file)
      const res = await fetch('/api/scan-bol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      })
      const data = await res.json()
      if (data.error) { alert('Scan failed: ' + data.error); setScanning(false); return }
      const { loads: scannedLoads, ...rest } = data
      setForm((f: any) => ({ ...f, ...rest }))
      if (scannedLoads?.length) setLoads(scannedLoads)
      setScanning(false)
    } catch {
      setScanning(false)
      alert('Failed to scan image.')
    }
  }

  async function handleSave(status: string) {
    setSaving(true)
    const { data: bol, error } = await supabase
      .from('bills_of_lading')
      .insert({
        ...form,
        status,
        rate: parseFloat(form.rate) || 0,
        total_charges: parseFloat(form.total_charges) || 0,
      })
      .select()
      .single()

    if (error) { alert('Error: ' + error.message); setSaving(false); return }

    const loadRows = loads
      .filter((l) => l.commodity || l.weight || l.tag_no)
      .map((l, i) => ({ ...l, bol_id: bol.id, row_number: i + 1 }))

    if (loadRows.length) {
      await supabase.from('bol_loads').insert(loadRows)
    }

    router.push(`/bols/${bol.id}`)
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">New Bill of Lading</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium flex items-center gap-2"
            disabled={scanning}
          >
            {scanning ? 'Scanning...' : '📷 Scan Photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={handleScan} />
        </div>
      </div>

      {scanning && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4 text-blue-700 text-sm">
          Reading your bill of lading... this takes about 10 seconds.
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Bill No.</label>
            <input className="input" value={form.bill_no} onChange={(e) => setField('bill_no', e.target.value)} />
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" value={form.date} onChange={(e) => setField('date', e.target.value)} />
          </div>
          <div>
            <label className="label">Job #</label>
            <input className="input" value={form.job_no} onChange={(e) => setField('job_no', e.target.value)} />
          </div>
          <div>
            <label className="label">Truck #</label>
            <input className="input" value={form.truck_no} onChange={(e) => setField('truck_no', e.target.value)} />
          </div>
        </div>

        {/* Carriers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Principal Carrier (Customer)</label>
            <input className="input font-medium" value={form.principal_carrier_name} onChange={(e) => setField('principal_carrier_name', e.target.value)} placeholder="Who you bill to" />
          </div>
          <div>
            <label className="label">Underlying Carrier</label>
            <input className="input" value={form.underlying_carrier} onChange={(e) => setField('underlying_carrier', e.target.value)} />
          </div>
          <div>
            <label className="label">Broker #</label>
            <input className="input" value={form.broker_no} onChange={(e) => setField('broker_no', e.target.value)} />
          </div>
          <div>
            <label className="label">Trailer #</label>
            <input className="input" value={form.trailer_no} onChange={(e) => setField('trailer_no', e.target.value)} />
          </div>
        </div>

        {/* Shipper / Receiver */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="label">Shipper</label>
            <input className="input" value={form.shipper} onChange={(e) => setField('shipper', e.target.value)} placeholder="Name" />
            <input className="input" value={form.shipper_address} onChange={(e) => setField('shipper_address', e.target.value)} placeholder="Address" />
          </div>
          <div className="space-y-2">
            <label className="label">Receiver</label>
            <input className="input" value={form.receiver} onChange={(e) => setField('receiver', e.target.value)} placeholder="Name" />
            <input className="input" value={form.receiver_address} onChange={(e) => setField('receiver_address', e.target.value)} placeholder="Address" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Point of Origin</label>
            <input className="input" value={form.point_of_origin} onChange={(e) => setField('point_of_origin', e.target.value)} />
          </div>
          <div>
            <label className="label">Point of Destination</label>
            <input className="input" value={form.point_of_destination} onChange={(e) => setField('point_of_destination', e.target.value)} />
          </div>
        </div>

        {/* Equipment & Billing */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Equipment Type</label>
            <select className="input" value={form.equipment_type} onChange={(e) => setField('equipment_type', e.target.value)}>
              <option value="">Select...</option>
              <option>10-WHEELER</option>
              <option>SUPER-10</option>
              <option>STRONG ARM</option>
              <option>SUPER TAG</option>
              <option>TRANSFER</option>
              <option>DBL BOTTOMS</option>
              <option>SEMI-BOTTOM</option>
              <option>END DUMP</option>
              <option>SIDE DUMP</option>
              <option>TRUCK & PUP</option>
              <option>WATER TRUCK</option>
              <option>FLAT BED</option>
              <option>MIXER</option>
              <option>SWEEPER</option>
            </select>
          </div>
          <div>
            <label className="label">Billing Method</label>
            <select className="input" value={form.billing_method} onChange={(e) => setField('billing_method', e.target.value)}>
              <option>PER LOAD</option>
              <option>HOURLY</option>
              <option>TONNAGE</option>
            </select>
          </div>
          <div>
            <label className="label">Rate $</label>
            <input className="input" type="number" value={form.rate} onChange={(e) => setField('rate', e.target.value)} />
          </div>
          <div>
            <label className="label">Total Charges $</label>
            <input className="input font-bold" type="number" value={form.total_charges} onChange={(e) => setField('total_charges', e.target.value)} />
          </div>
        </div>

        {/* Loads Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Loads</label>
            <button onClick={addLoad} className="text-sm text-blue-600 hover:underline">+ Add Row</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border rounded">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Tag No.', 'Weight', 'Commodity', 'Load Arrive', 'Load Depart', 'Unload Arrive', 'Unload Depart', 'Standby', 'Breakdown/Reason', ''].map((h) => (
                    <th key={h} className="px-2 py-2 text-left font-medium text-gray-600 border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loads.map((l, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                    {(['tag_no', 'weight', 'commodity', 'loading_arrive', 'loading_depart', 'unloading_arrive', 'unloading_depart', 'standby_time', 'breakdown_reason'] as const).map((k) => (
                      <td key={k} className="px-1 py-1">
                        <input
                          className="w-full border rounded px-1 py-0.5 text-xs"
                          value={(l as any)[k]}
                          onChange={(e) => setLoad(i, k, e.target.value)}
                        />
                      </td>
                    ))}
                    <td className="px-1">
                      <button onClick={() => removeLoad(i)} className="text-red-400 hover:text-red-600">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="label">Notes</label>
          <textarea className="input h-20 resize-none" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="border border-gray-300 hover:bg-gray-50 px-6 py-2 rounded font-medium"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave('submitted')}
            disabled={saving}
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded font-semibold"
          >
            {saving ? 'Saving...' : 'Save & Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
