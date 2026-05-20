"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Point = {
  /** Label do eixo X (ex: "Jul 1"). */
  label: string
  /** Valor numérico do ponto. */
  value: number
}

type Props = {
  data: Point[]
  /** Cor principal — default nexus-bright (#1498D5). */
  color?: string
  /** Sufixo para o tooltip (ex: "vendas", "K"). */
  tooltipSuffix?: string
}

export function AreaChartCard({
  data,
  color = "#1498D5",
  tooltipSuffix = "",
}: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={32}
        />
        <YAxis
          tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
          contentStyle={{
            background: "rgba(20,20,24,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            color: "white",
            fontSize: 12,
            padding: "8px 12px",
          }}
          labelStyle={{ color: "rgba(255,255,255,0.55)", marginBottom: 4 }}
          formatter={(v) => [`${v}${tooltipSuffix ? ` ${tooltipSuffix}` : ""}`, ""]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#areaFill)"
          dot={false}
          activeDot={{ r: 5, fill: color, stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
