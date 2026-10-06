import type { Mission, MissionProgress } from '../../lib/mission'
import { Card } from '../Card'

interface Props {
  mission: Mission
  progress: MissionProgress
  canChange: boolean
  onChange: () => void
}

export function MissionCard({ mission, progress, canChange, onChange }: Props) {
  const ratio = Math.min(1, progress.current / progress.target)
  return (
    <Card title="Mission de la semaine" subtitle="Un seul objectif, choisi d’après tes chiffres.">
      <div className="flex flex-col gap-3">
        <p className="text-lg font-semibold">{mission.title}</p>
        <p className="text-sm text-muted">Pourquoi : {mission.why}</p>
        <div
          className="h-2.5 overflow-hidden rounded bg-surface-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.target}
          aria-valuenow={progress.current}
          aria-label="Progression de la mission"
        >
          <div
            className={`h-full rounded ${progress.done ? 'bg-win' : 'bg-accent'}`}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className={progress.done ? 'text-win' : 'text-muted'}>
            {progress.done ? '✓ Mission accomplie ! ' : ''}
            {progress.detail}
          </span>
          {canChange && (
            <button type="button" onClick={onChange} className="text-xs text-muted hover:text-fg">
              Changer de mission
            </button>
          )}
        </div>
        <p className="text-xs text-muted">
          Suivie automatiquement sur tes parties depuis lundi. Recharge tes parties pour mettre à
          jour.
        </p>
      </div>
    </Card>
  )
}
