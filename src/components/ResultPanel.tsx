import type { CalcResult } from '../lib/types'

interface Props {
  result: CalcResult
}

function MetricCard({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: boolean
}) {
  return (
    <div className={`metric-card${highlight ? ' highlight' : ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

function fmt(n: number, digits = 2) {
  return n.toFixed(digits)
}

function fmtWan(n: number) {
  return `${(n / 10000).toFixed(1)} 万元`
}

function fmtPayback(years: number) {
  if (!isFinite(years)) return '> 项目期'
  const y = Math.floor(years)
  const m = Math.round((years - y) * 12)
  return m > 0 ? `${y} 年 ${m} 个月` : `${y} 年`
}

export default function ResultPanel({ result }: Props) {
  const { totalCapex, annualNetCashflow, irr, npv, staticPaybackYears, dynamicPaybackYears } = result
  const totalNet = annualNetCashflow.reduce((a, b) => a + b, 0)
  const avgAnnual = totalNet / annualNetCashflow.length

  return (
    <div className="result-panel">
      <h3>📊 测算结果</h3>

      <div className="metrics-grid">
        <MetricCard label="总投资 CAPEX" value={fmtWan(totalCapex)} />
        <MetricCard label="年均净现金流" value={fmtWan(avgAnnual)} />
        <MetricCard
          label="静态回收期"
          value={fmtPayback(staticPaybackYears)}
          highlight={staticPaybackYears < 7}
        />
        <MetricCard
          label="动态回收期"
          value={fmtPayback(dynamicPaybackYears)}
        />
        <MetricCard
          label="项目 IRR"
          value={isNaN(irr) ? '无法回收' : `${fmt(irr * 100, 2)}%`}
          sub={isNaN(irr) ? '收益不足以回收投资' : irr > 0.08 ? '优质项目' : irr > 0.05 ? '勉强可行' : '谨慎投资'}
          highlight={!isNaN(irr) && irr > 0.08}
        />
        <MetricCard
          label="净现值 NPV"
          value={fmtWan(npv)}
          sub="按折现率贴现"
          highlight={npv > 0}
        />
      </div>

      <div className="annual-table">
        <h4>逐年现金流明细</h4>
        <table>
          <thead>
            <tr>
              <th>年份</th>
              <th>套利毛收益</th>
              <th>净现金流</th>
              <th>累计现金流</th>
            </tr>
          </thead>
          <tbody>
            {result.annualRevenue.map((rev, i) => (
              <tr key={i} className={result.cumulativeCashflow[i] >= 0 ? 'recovered' : ''}>
                <td>第 {i + 1} 年</td>
                <td>{fmtWan(rev)}</td>
                <td>{fmtWan(result.annualNetCashflow[i])}</td>
                <td className={result.cumulativeCashflow[i] >= 0 ? 'positive' : 'negative'}>
                  {fmtWan(result.cumulativeCashflow[i])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
