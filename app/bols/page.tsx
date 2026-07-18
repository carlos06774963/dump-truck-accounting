'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function BolsPage() {
  const [bols, setBols] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('bills_of_lading')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setBols(data || [])
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bills of Lading</h1>
        <Link
          href="/bols/new"
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 rounded"
        >
          + New BOL
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-500">Loading...</p>
        ) : bols.length === 0 ? (
          <p className="p-6 text-gray-500">No bills of lading yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3">Bill No.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Truck #</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {bols.map((b) => (
                <tr key={b.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/bols/${b.id}`} className="text-blue-600 hover:underline font-medium">
                      {b.bill_no}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{b.date}</td>
                  <td className="px-4 py-3">{b.principal_carrier_name}</td>
                  <td className="px-4 py-3">{b.truck_no}</td>
                  <td className="px-4 py-3 font-medium">${(b.total_charges || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      b.status === 'paid' ? 'bg-green-100 text-green-700' :
                      b.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {b.status || 'draft'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
