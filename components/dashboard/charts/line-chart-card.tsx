"use client"

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Point = { label: string; value: number }

type Props = {
  data: Point[]
  color?: string
}

export function LineChartCard({ data, color = "#FFFFFF" }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip
          cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }}
          contentStyle={{
            background: "rgba(20,20,24,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            color: "white",
            fontSize: 12,
            padding: "6px 10px",
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
