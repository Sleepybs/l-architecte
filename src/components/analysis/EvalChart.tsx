import {
  Area,
  AreaChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { GameAnalysis } from '../../lib/analysis'
import { formatEval } from '../../lib/engineStats'
import type { Color } from '../../lib/games'

interface Point {
  ply: number
  /** Évaluation du point de vue du joueur, en pions, bornée à ±10. */
  value: number
}

function label(ply: number): string {
  if (ply === 0) return 'Position de départ'
  const move = Math.ceil(ply / 2)
  return `Après le coup ${move}${ply % 2 === 0 ? '…' : ''}`
}

/** Courbe d'évaluation de la partie, vue du côté du joueur (au-dessus de 0 = avantage). */
export function EvalChart({ analysis, color }: { analysis: GameAnalysis; color: Color }) {
  const sign = color === 'white' ? 1 : -1
  const data: Point[] = analysis.evals.map((cp, ply) => ({ ply, value: (sign * cp) / 100 }))
  const turning = analysis.turningPoint
  const turningPoint = turning ? data[turning.ply + 1] : undefined

  return (
    <div className="h-36 w-full" role="img" aria-label="Courbe d’évaluation de la partie">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -24 }}>
          <XAxis dataKey="ply" hide />
          <YAxis
            domain={[-10, 10]}
            ticks={[-10, -5, 0, 5, 10]}
            tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine y={0} stroke="var(--color-line)" />
          <Tooltip
            isAnimationActive={false}
            cursor={{ stroke: 'var(--color-muted)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as Point | undefined
              if (!active || !p) return null
              return (
                <div className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-lg">
                  <div className="font-semibold tabular-nums">{formatEval(p.value * 100)}</div>
                  <div className="text-muted">{label(p.ply)}</div>
                </div>
              )
            }}
          />
          <Area
            type="linear"
            dataKey="value"
            stroke="var(--color-series-1)"
            strokeWidth={2}
            fill="var(--color-series-1)"
            fillOpacity={0.1}
            dot={false}
            isAnimationActive={false}
          />
          {turningPoint && (
            <ReferenceDot
              x={turningPoint.ply}
              y={turningPoint.value}
              r={5}
              fill="var(--color-loss)"
              stroke="var(--color-surface)"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
