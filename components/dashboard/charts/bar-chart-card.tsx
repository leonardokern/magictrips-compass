"use client"

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Point = {
  label: string
  /** Série principal. */
  value: number
  /** Série secundária opcional (mostrada em outra cor ao lado). */
  value2?: number
}

type Props = {
  data: Point[]
  primaryColor?: string
  secondaryColor?: string
  showSecondary?: boolean
}

export function BarChartCard({
  data,
  primaryColor = "#1498D5",
  secondaryColor = "#F59E0B",
  showSecondary = false,
}: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
        barCategoryGap={showSecondary ? "20%" : "30%"}
      >
        <XAxis
          dataKey="label"
          tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{
            background: "rgba(20,20,24,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            color: "white",
            fontSize: 12,
            padding: "6px 10px",
          }}
        />
        <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
        {showSecondary && (
          <Bar dataKey="value2" fill={secondaryColor} radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}
