import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

/** Bloc visuel commun à toutes les sections du tableau de bord. */
export function Card({ title, subtitle, children, className = '' }: Props) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-4 ${className}`}>
      <header className="mb-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}
