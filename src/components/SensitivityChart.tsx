import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts'
import type { SensitivityPoint } from '../lib/types'

interface Props {
  points: SensitivityPoint[]
}

const VAR_LABELS: Record<string, string> = {
  priceSpread: '峰谷价差',
  capex: '系统造价',
  effectiveDays: '年运行天数',
}

export default function SensitivityChart({ points }: Props) {
  // 以 IRR 为纵轴，变化幅度为分组，三变量并排
  const steps = [-0.2, -0.1, 0.1, 0.2]
  const variables = ['priceSpread', 'capex', 'effectiveDays']

  const data = steps.map(step => {
    const row: Record<string, number | string> = {
      label: `${step > 0 ? '+' : ''}${step * 100}%`,
    }
    for (const v of variables) {
      const pt = points.find(p => p.variable === v && p.changePercent === step)
      row[VAR_LABELS[v]] = pt && !isNaN(pt.irr) ? parseFloat((pt.irr * 100).toFixed(2)) : 0
    }
    return row
  })

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981']

  return (
    <div className="chart-block">
      <h4>敏感性分析 — IRR 对关键变量的响应（%）</h4>
      <p className="chart-note">横轴：关键参数相对基准的变化幅度；纵轴：对应的项目 IRR</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" />
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend />
          {variables.map((_, i) => (
            <Bar key={i} dataKey={VAR_LABELS[variables[i]]} fill={COLORS[i]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
