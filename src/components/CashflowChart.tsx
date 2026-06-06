import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import type { CalcResult } from '../lib/types'

interface Props {
  result: CalcResult
}

function wan(n: number) {
  return parseFloat((n / 10000).toFixed(2))
}

export default function CashflowChart({ result }: Props) {
  const data = result.annualRevenue.map((rev, i) => ({
    year: `第${i + 1}年`,
    净现金流: wan(result.annualNetCashflow[i]),
    套利毛收益: wan(rev),
    累计现金流: wan(result.cumulativeCashflow[i]),
  }))

  return (
    <div className="charts">
      <div className="chart-block">
        <h4>逐年收益与净现金流（万元）</h4>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 8, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} unit="万" />
            <Tooltip formatter={(v) => `${v} 万元`} />
            <Legend />
            <Bar dataKey="套利毛收益" fill="#93c5fd" radius={[3, 3, 0, 0]} />
            <Bar dataKey="净现金流" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-block">
        <h4>累计现金流（万元）— 穿越零轴即回收投资</h4>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 8, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} unit="万" />
            <Tooltip formatter={(v) => `${v} 万元`} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '回收线', fill: '#ef4444', fontSize: 12 }} />
            <Line
              type="monotone" dataKey="累计现金流" stroke="#10b981"
              strokeWidth={2.5} dot={(props) => {
                const { cx, cy, payload } = props
                const positive = payload['累计现金流'] >= 0
                return <circle key={cx} cx={cx} cy={cy} r={4} fill={positive ? '#10b981' : '#f87171'} />
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
