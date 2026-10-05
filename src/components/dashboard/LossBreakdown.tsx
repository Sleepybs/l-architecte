import { LOSS_LABELS, pct, type LossKind } from '../../lib/stats'
import { Card } from '../Card'

// Une phrase d'interprétation par type de défaite : l'app doit dire quoi travailler.
const ADVICE: Record<LossKind, string> = {
  checkmated: 'Beaucoup de mats subis : vérifie la sécurité de ton roi à chaque coup adverse.',
  resigned: 'Tu abandonnes surtout après une erreur : c’est le terrain des gaffes tactiques.',
  timeout: 'Le temps te coûte des parties : joue plus vite les coups évidents et l’ouverture.',
  abandoned: 'Des parties quittées en cours : chacune est une défaite gratuite.',
}

export function LossBreakdown({ data }: { data: { kind: LossKind; count: number }[] }) {
  const losses = data.reduce((sum, d) => sum + d.count, 0)
  const top = data[0]

  return (
    <Card title="Comment je perds" subtitle={`${losses} défaites sur la période`}>
      {losses === 0 ? (
        <p className="text-sm text-muted">Aucune défaite sur la période. Bravo !</p>
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2.5">
            {data.map((d) => (
              <li key={d.kind} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-3">
                <span className="text-sm">{LOSS_LABELS[d.kind]}</span>
                <span className="h-3 rounded bg-surface-2">
                  <span
                    className="block h-full rounded bg-loss"
                    style={{ width: `${(d.count / losses) * 100}%` }}
                  />
                </span>
                <span className="text-right text-sm tabular-nums">
                  {pct(d.count, losses)} %<span className="sr-only"> ({d.count} parties)</span>
                </span>
              </li>
            ))}
          </ul>
          {top && top.count > 0 && <p className="text-xs text-muted">{ADVICE[top.kind]}</p>}
        </div>
      )}
    </Card>
  )
}
