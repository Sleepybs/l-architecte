import { PHASE_LABEL, type EngineSummary, type Phase } from '../../lib/engineStats'
import { Card } from '../Card'

function Figure({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{detail}</div>
    </div>
  )
}

export function EngineSummaryCards({ summary }: { summary: EngineSummary }) {
  const totalPhase = summary.byPhase.opening + summary.byPhase.middlegame + summary.byPhase.endgame
  const worst = (Object.keys(summary.byPhase) as Phase[]).sort(
    (a, b) => summary.byPhase[b] - summary.byPhase[a],
  )[0]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Figure
          label="Gaffes par partie"
          value={summary.blundersPerGame.toLocaleString('fr-FR')}
          detail="coups qui perdent plus de 2 pions"
        />
        <Figure
          label="Pièces perdues sans compensation"
          value={`${summary.piecesLostRate} %`}
          detail="des parties analysées"
        />
        <Figure
          label="Première gaffe"
          value={summary.medianFirstBlunder === null ? '—' : `coup ${summary.medianFirstBlunder}`}
          detail="médiane sur les parties analysées"
        />
        <Figure
          label="Tournant de la partie"
          value={`${summary.ownTurningPointRate} %`}
          detail="des parties basculent sur ta propre erreur"
        />
      </div>

      {totalPhase > 0 && (
        <Card
          title="Quand je gaffe"
          subtitle={`${totalPhase} gaffes sur ${summary.analyzed} parties`}
        >
          <ul className="flex flex-col gap-2.5">
            {(Object.keys(PHASE_LABEL) as Phase[]).map((phase) => {
              const n = summary.byPhase[phase]
              const pct = Math.round((n / totalPhase) * 100)
              return (
                <li
                  key={phase}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[13rem_1fr_3.5rem]"
                >
                  <span className="text-sm">{PHASE_LABEL[phase]}</span>
                  <span className="text-right text-sm tabular-nums sm:order-last">{pct} %</span>
                  <span className="col-span-2 h-3 rounded bg-surface-2 sm:col-span-1">
                    <span
                      className="block h-full rounded bg-series-1"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                </li>
              )
            })}
          </ul>
          {worst && summary.byPhase[worst] > 0 && (
            <p className="mt-3 text-xs text-muted">
              {worst === 'opening' &&
                'Tes gaffes arrivent tôt : revois tes ouvertures et vérifie les pièces en prise dès les premiers coups.'}
              {worst === 'middlegame' &&
                'Le milieu de partie concentre tes gaffes : avant chaque coup, cherche les échecs, prises et menaces de l’adversaire.'}
              {worst === 'endgame' &&
                'Tes gaffes arrivent en finale : la fatigue et la pendule pèsent, travaille les finales de base.'}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
