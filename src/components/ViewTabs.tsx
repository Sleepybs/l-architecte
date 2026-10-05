export interface ViewTab<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  tabs: readonly ViewTab<T>[]
  value: T
  onChange: (value: T) => void
}

/** Navigation principale entre les vues de l'app. */
export function ViewTabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  return (
    <nav
      aria-label="Vues"
      className="-mx-4 overflow-x-auto overflow-y-hidden border-b border-line px-4"
    >
      <ul className="flex gap-1">
        {tabs.map((t) => (
          <li key={t.value}>
            <button
              type="button"
              aria-current={value === t.value ? 'page' : undefined}
              onClick={() => onChange(t.value)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                value === t.value
                  ? 'border-accent text-fg'
                  : 'border-transparent text-muted hover:text-fg'
              }`}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
