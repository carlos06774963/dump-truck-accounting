'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const BUSINESS = {
  name: 'Precision Care',
  address: '13745 Sayre St',
  city: 'Sylmar, CA 91342',
  phone: '(818) 793-9955',
  email: 'precisioncarecouriers@gmail.com',
}

export default function PublicInvoicePage() {
  const { id } = useParams()
  const [bol, setBol] = useState<any>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch('/api/invoice/' + id)
      .then((r) => r.json())
      .then((data) => { if (data.error) setError(true); else setBol(data) })
      .catch(() => setError(true))
  }, [id])

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-gray-500">Invoice not found.</p>
    </div>
  )
  if (!bol) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  function parseNet(b: any) {
    const m = b.notes?.match(/Net:\s*\$([0-9.]+)/)
    return m ? parseFloat(m[1]) : (b.total_charges || 0)
  }
  function parseMaterial(b: any) {
    const m = b.notes?.match(/Material:\s*([^|]+)/)
    return m ? m[1].trim() : ''
  }
  function parseCommission(b: any) {
    const m = b.notes?.match(/Commission:\s*([\d.]+)%\s*\(\$([0-9.]+)\)/)
    return m ? { pct: m[1], amount: parseFloat(m[2]) } : null
  }

  const net = parseNet(bol)
  const material = parseMaterial(bol)
  const commission = parseCommission(bol)
  const numLoads = parseFloat(bol.num_loads) || 1
  const rate = parseFloat(bol.rate) || 0
  const gross = bol.total_charges || (numLoads * rate)

  const descriptionLine = `${numLoads} load${numLoads !== 1 ? 's' : ''} of ${material || 'material'}`

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Paper invoice */}
        <div className="bg-white shadow-lg rounded-sm p-8 font-sans text-sm text-gray-900">

          {/* Top: INVOICE label */}
          <div className="text-center text-gray-400 tracking-widest text-xs mb-6 uppercase">Invoice</div>

          {/* Bill From / Bill To */}
          <div className="flex justify-between mb-8">
            {/* From */}
            <div>
              <p className="font-bold text-base">{BUSINESS.name}</p>
              <p className="text-gray-500 mt-1">{BUSINESS.address}</p>
              <p className="text-gray-500">{BUSINESS.city}</p>
              <p className="text-gray-500">Phone: {BUSINESS.phone}</p>
              <p className="text-gray-500">Email: {BUSINESS.email}</p>
            </div>

            {/* To */}
            <div className="text-right">
              <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Bill To</p>
              <p className="font-semibold text-base">{bol.principal_carrier_name || '—'}</p>
              {bol.shipper && <p className="text-gray-500 mt-1">{bol.shipper}</p>}
              {bol.shipper_address && <p className="text-gray-500">{bol.shipper_address}</p>}
            </div>
          </div>

          {/* Invoice meta */}
          <div className="flex justify-end mb-8">
            <table className="text-sm">
              <tbody>
                <tr>
                  <td className="text-gray-400 pr-8 py-0.5">Payment terms</td>
                  <td className="text-right font-medium">30 Days</td>
                </tr>
                <tr>
                  <td className="text-gray-400 pr-8 py-0.5">Invoice #</td>
                  <td className="text-right font-medium">{bol.bill_no || '—'}</td>
                </tr>
                <tr>
                  <td className="text-gray-400 pr-8 py-0.5">Truck #</td>
                  <td className="text-right font-medium">{bol.truck_no || '—'}</td>
                </tr>
                <tr>
                  <td className="text-gray-400 pr-8 py-0.5">Date</td>
                  <td className="text-right font-medium">{bol.date}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Line items table */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left pb-2 font-semibold text-gray-700">Description</th>
                <th className="text-right pb-2 font-semibold text-gray-700">Rate</th>
                <th className="text-right pb-2 font-semibold text-gray-700">Quantity</th>
                <th className="text-right pb-2 font-semibold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4">
                  <p>{descriptionLine}</p>
                  {bol.shipper_address && <p className="text-gray-400 text-xs mt-0.5">{bol.shipper_address}</p>}
                </td>
                <td className="py-3 text-right align-top">${rate.toFixed(2)}</td>
                <td className="py-3 text-right align-top">{numLoads}</td>
                <td className="py-3 text-right align-top font-medium">${gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              {commission && (
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4 text-gray-500">Commission ({commission.pct}%)</td>
                  <td className="py-3 text-right text-gray-500"></td>
                  <td className="py-3 text-right text-gray-500"></td>
                  <td className="py-3 text-right text-red-500">-${commission.amount.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-10">
            <table className="text-sm w-56">
              <tbody>
                <tr>
                  <td className="py-1 text-gray-500">Subtotal</td>
                  <td className="py-1 text-right">${gross.toFixed(2)}</td>
                </tr>
                {commission && (
                  <tr>
                    <td className="py-1 text-gray-500">Commission</td>
                    <td className="py-1 text-right text-red-500">-${commission.amount.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="border-t border-gray-300">
                  <td className="pt-2 font-bold text-base">Total</td>
                  <td className="pt-2 text-right font-bold text-base">${net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PAID stamp */}
          {bol.status === 'paid' && (
            <div className="flex justify-center mb-8">
              <div className="border-4 border-green-500 text-green-500 font-black text-3xl px-8 py-2 rounded opacity-70 rotate-[-10deg] tracking-widest">
                PAID
              </div>
            </div>
          )}

          {/* Signature line */}
          <div className="mt-12 pt-4">
            <div className="border-t border-gray-300 w-64 mx-auto mb-1" />
            <p className="text-center text-gray-400 text-xs">{bol.principal_carrier_name || 'Customer'}</p>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-300 text-xs mt-8">Page 1 of 1</p>
        </div>

        {/* Thank you note */}
        <p className="text-center text-gray-400 text-xs mt-4">
          Thank you for your business · Questions? {BUSINESS.phone}
        </p>
      </div>
    </div>
  )
}
