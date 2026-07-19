'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/bols', label: 'Tickets' },
  { href: '/customers', label: 'Carriers' },
  { href: '/expenses', label: 'Expenses' },
  { href: '/reports', label: 'Reports' },
]

export default function Nav() {
  const path = usePathname()
  return (
    <nav className="bg-yellow-500 text-black shadow">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <span className="font-bold text-lg tracking-tight">Precision Care</span>
        <div className="flex gap-1 flex-wrap">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                'px-3 py-1.5 rounded text-sm font-medium',
                path === l.href ? 'bg-black text-yellow-400' : 'hover:bg-yellow-600'
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
