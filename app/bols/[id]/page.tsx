'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function BolDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [bol, setBol] = useState<any>(null)
  const [loads, setLoads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('bills_of_lading').select('*').eq('id', id).single(),
      supabase.from('bol_loads').select('*').eq('bol_id', id).order('row_number'),
    ]).then(([{ data: b }, { data: l }]) => {
      setBol(b)
      setLoads(l || [])
      setLoading(false)
    })
  }, [id])

  async function markPaid() {
    await supabase.from('bills_of_lading').update({ status: 'paid' }).eq('id', id)
    setBol((b: any) => ({ ...b, status: 'paid' }))
  }

  async function deleteBol() {
    if (!confirm('Delete this bill of lading?')) return
    await supabase.from('bol_loads').delete().eq('bol_id', id)
    await supabase.from('bills_of_lading').delete().eq('id', id)
    router.push('/bols')
  }

  if (loading) return <p className="p-4 text-gray-500">Loading...</p>
  if (!bol) return <p className="p-4 text-gray-500">Not found.</p>

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <Link href="/bols" className="text-sm text-gray-500 hover:underline">← Bills of Lading</Link>
          <h1 className="text-2xl font-bold mt-1">Bill No. {bol.bill_no}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {bol.status !== 'paid' && (
            <button onClick={markPaid} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium text-sm">
              Mark Paid
            </button>
          )}
          <button onClick={() => window.print()} className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded font-medium text-sm">
            🖨️ Print
          </button>
          <button onClick={deleteBol} className="border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded font-medium text-sm">
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6 print:shadow-none">
        {/* Status Banner */}
        <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
          bol.status === 'paid' ? 'bg-green-100 text-green-700' :
          bol.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {bol.status?.toUpperCase()}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Field label="Bill No." value={bol.bill_no} />
          <Field label="Date" value={bol.date} />
          <Field label="Job #" value={bol.job_no} />
          <Field label="Truck #" value={bol.truck_no} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <Field label="Principal Carrier (Customer)" value={bol.principal_carrier_name} bold />
          <Field label="Underlying Carrier" value={bol.underlying_carrier} />
          <Field label="Shipper" value={bol.shipper} />
          <Field label="Receiver" value={bol.receiver} />
          <Field label="Point of Origin" value={bol.point_of_origin} />
          <Field label="Point of Destination" value={bol.point_of_destination} />
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <Field label="Equipment Type" value={bol.equipment_type} />
          <Field label="Billing Method" value={bol.billing_method} />
          <Field label="Rate" value={bol.rate ? `$${bol.rate}` : ''} />
        </div>

        {/* Loads */}
        {loads.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-sm">Loads</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border rounded">
                <thead className="bg-gray-50">
                  <tr>
                    {['#', 'Tag No.', 'Weight', 'Commodity', 'Load Arrive', 'Load Depart', 'Unload Arrive', 'Unload Depart', 'Standby', 'Reason'].map((h) => (
                      <th key={h} className="px-2 py-2 text-left font-medium text-gray-600 border-b">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loads.map((l) => (
                    <tr key={l.id} className="border-b">
                      <td className="px-2 py-1 text-gray-400">{l.row_number}</td>
                      <td className="px-2 py-1">{l.tag_no}</td>
                      <td className="px-2 py-1">{l.weight}</td>
                      <td className="px-2 py-1 font-medium">{l.commodity}</td>
                      <td className="px-2 py-1">{l.loading_arrive}</td>
                      <td className="px-2 py-1">{l.loading_depart}</td>
                      <td className="px-2 py-1">{l.unloading_arrive}</td>
                      <td className="px-2 py-1">{l.unloading_depart}</td>
                      <td className="px-2 py-1">{l.standby_time}</td>
                      <td className="px-2 py-1">{l.breakdown_reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="border-t pt-4 flex justify-end">
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Charges</p>
            <p className="text-3xl font-bold text-green-700">${(bol.total_charges || 0).toLocaleString()}</p>
          </div>
        </div>

        {bol.notes && (
          <div className="bg-gray-50 rounded p-3 text-sm text-gray-600">
            <span className="font-medium">Notes:</span> {bol.notes}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={bold ? 'font-semibold' : ''}>{value || '—'}</p>
    </div>
  )
}
