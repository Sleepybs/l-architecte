import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ratingTicks, type RatingPoint } from '../../lib/stats'

const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const longDate = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

interface TooltipProps {
  active?: boolean
  payload?: readonly { payload?: unknown }[]
}

function ChartTooltip({ active, payload }: TooltipProps) {
  const point = payload?.[0]?.payload as RatingPoint | undefined
  if (!active || !point) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="text-base font-semibold tabular-nums">{point.rating}</div>
      <div className="text-muted">{longDate.format(point.time)}</div>
    </div>
  )
}

export function RatingChart({ series }: { series: readonly RatingPoint[] }) {
  if (series.length < 2) {
    return (
      <p className="text-sm text-muted">Pas assez de parties classées pour tracer une courbe.</p>
    )
  }
  const ticks = ratingTicks(series)
  return (
    <div className="h-64 w-full" role="img" aria-label="Courbe d’elo sur la période">
      <ResponsiveContainer>
        <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-series-1)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--color-series-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(t: number) => shortDate.format(t)}
            tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            domain={[ticks[0] ?? 0, ticks[ticks.length - 1] ?? 0]}
            ticks={ticks}
            tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={(p) => <ChartTooltip active={p.active} payload={p.payload} />}
            cursor={{ stroke: 'var(--color-muted)', strokeWidth: 1 }}
            isAnimationActive={false}
          />
          <Area
            type="linear"
            dataKey="rating"
            stroke="var(--color-series-1)"
            strokeWidth={2}
            fill="url(#ratingFill)"
            dot={false}
            activeDot={{ r: 4, stroke: 'var(--color-surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
