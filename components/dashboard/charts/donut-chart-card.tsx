"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

export type DonutSlice = {
  label: string
  value: number
  color: string
}

type Props = {
  data: DonutSlice[]
  /** Texto central — costuma ser o total. */
  centerLabel?: string
  centerValue?: string
}

export function DonutChartCard({ data, centerLabel, centerValue }: Props) {
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            cursor={false}
            contentStyle={{
              background: "rgba(20,20,24,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              color: "white",
              fontSize: 12,
              padding: "6px 10px",
            }}
            formatter={(v, _name, item) => [`${v}`, (item as { payload: DonutSlice }).payload.label]}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="65%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-2xl font-semibold tabular-nums text-white">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-white/45">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
