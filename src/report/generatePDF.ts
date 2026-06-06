import { jsPDF } from 'jspdf'
import type { ProjectInput, CalcResult } from '../lib/types'

// jsPDF 默认不含中文字体，需用 Base64 嵌入字体。
// 为避免引入巨型字体文件，v1 使用 Latin 字符集兜底：
// 所有中文字段先转为对应英文标签输出，数字/单位保持不变。
// 待后续集成中文字体包后可直接替换。

function wan(n: number): string {
  return (n / 10000).toFixed(1)
}

function pct(n: number): string {
  return isNaN(n) ? 'N/A' : `${(n * 100).toFixed(2)}%`
}

function payback(years: number): string {
  if (!isFinite(years)) return '> Project Life'
  const y = Math.floor(years)
  const m = Math.round((years - y) * 12)
  return m > 0 ? `${y}yr ${m}mo` : `${y} yr`
}

export async function generatePDF(input: ProjectInput, result: CalcResult) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const margin = 16
  const col = margin
  let y = 0

  // ── Helper functions ──────────────────────────────────────────
  const line = (x1: number, y1: number, x2: number, y2: number, color = '#e2e8f0') => {
    doc.setDrawColor(color)
    doc.line(x1, y1, x2, y2)
  }

  const rect = (x: number, yy: number, w: number, h: number, fill: string) => {
    doc.setFillColor(fill)
    doc.rect(x, yy, w, h, 'F')
  }

  const text = (
    str: string, x: number, yy: number,
    { size = 10, bold = false, color = '#1e293b', align = 'left' as 'left' | 'center' | 'right' } = {}
  ) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(color)
    doc.text(str, x, yy, { align })
  }

  // ── Cover / Header ────────────────────────────────────────────
  rect(0, 0, W, 42, '#1e40af')
  text('C&I Energy Storage', W / 2, 14, { size: 18, bold: true, color: '#ffffff', align: 'center' })
  text('Economic Feasibility Report', W / 2, 22, { size: 12, color: '#bfdbfe', align: 'center' })
  text(`Province: ${input.tariff.province}   |   ${input.ratedPowerKW}kW / ${input.ratedEnergyKWh}kWh`, W / 2, 32, { size: 9, color: '#93c5fd', align: 'center' })
  text(`Generated: ${new Date().toLocaleDateString('zh-CN')}`, W / 2, 38, { size: 8, color: '#93c5fd', align: 'center' })

  y = 52

  // ── Section: Project Parameters ───────────────────────────────
  rect(col, y, W - margin * 2, 7, '#eff6ff')
  text('1. Project Parameters', col + 3, y + 5, { size: 10, bold: true, color: '#1d4ed8' })
  y += 10

  const params: [string, string][] = [
    ['Rated Power', `${input.ratedPowerKW} kW`],
    ['Rated Energy', `${input.ratedEnergyKWh} kWh`],
    ['System Efficiency (RTE)', pct(input.rte)],
    ['Usable DOD', pct(input.usableDOD)],
    ['Annual Degradation', pct(input.annualDegradation)],
    ['Cycles / Day', `${input.cyclesPerDay}`],
    ['Effective Days / Year', `${input.effectiveDaysPerYear} days`],
    ['CAPEX', `CNY ${input.capexPerWh.toFixed(2)} /Wh  (Total: CNY ${wan(result.totalCapex)} 万)`],
    ['Annual OPEX', `CNY ${(input.annualOpex / 10000).toFixed(1)} 万/yr`],
    ['Project Life', `${input.projectYears} yr`],
    ['Investor Revenue Share', pct(input.investorShare)],
    ['Discount Rate', pct(input.discountRate)],
    ['Peak Price', `CNY ${(input.tariff.sharpPeakPrice ?? input.tariff.peakPrice).toFixed(3)} /kWh (sharp/peak)`],
    ['Valley Price', `CNY ${(input.tariff.deepValleyPrice ?? input.tariff.valleyPrice).toFixed(3)} /kWh (deep/valley)`],
  ]

  const col2 = col + 65
  params.forEach(([label, val], i) => {
    if (i % 2 === 0 && i > 0) { /* skip */ }
    const row = Math.floor(i / 2)
    const isLeft = i % 2 === 0
    const rowY = y + row * 6.5
    if (isLeft) {
      doc.setDrawColor('#f1f5f9')
      if (row > 0) line(col, rowY - 1, W - margin, rowY - 1)
    }
    const cx = isLeft ? col : col + (W - margin * 2) / 2
    text(label, cx + 2, rowY + 4, { size: 8.5, color: '#64748b' })
    text(val, cx + 2 + 55, rowY + 4, { size: 8.5, bold: true })
  })
  y += Math.ceil(params.length / 2) * 6.5 + 6

  // ── Section: Key Financial Results ────────────────────────────
  rect(col, y, W - margin * 2, 7, '#eff6ff')
  text('2. Key Financial Results', col + 3, y + 5, { size: 10, bold: true, color: '#1d4ed8' })
  y += 12

  const metrics: [string, string, string][] = [
    ['Total CAPEX', `CNY ${wan(result.totalCapex)} 万`, ''],
    ['Static Payback', payback(result.staticPaybackYears), result.staticPaybackYears < 7 ? '★ Good' : ''],
    ['Dynamic Payback', payback(result.dynamicPaybackYears), ''],
    ['Project IRR', pct(result.irr), result.irr > 0.08 ? '★ Strong' : result.irr > 0.05 ? 'Acceptable' : ''],
    ['NPV (@ discount rate)', `CNY ${wan(result.npv)} 万`, result.npv > 0 ? '★ Positive' : 'Negative'],
  ]

  const boxW = (W - margin * 2 - 8) / metrics.length
  metrics.forEach(([label, val, note], i) => {
    const bx = col + i * (boxW + 2)
    const isHighlight = note.startsWith('★')
    rect(bx, y, boxW, 24, isHighlight ? '#dbeafe' : '#f8fafc')
    doc.setDrawColor(isHighlight ? '#93c5fd' : '#e2e8f0')
    doc.rect(bx, y, boxW, 24, 'S')
    text(label, bx + boxW / 2, y + 7, { size: 7, color: '#64748b', align: 'center' })
    text(val, bx + boxW / 2, y + 15, { size: 9, bold: true, color: isHighlight ? '#1d4ed8' : '#1e293b', align: 'center' })
    if (note) text(note, bx + boxW / 2, y + 21, { size: 7, color: isHighlight ? '#2563eb' : '#94a3b8', align: 'center' })
  })
  y += 32

  // ── Section: Annual Cashflow Table ────────────────────────────
  rect(col, y, W - margin * 2, 7, '#eff6ff')
  text('3. Annual Cashflow Detail (CNY 万)', col + 3, y + 5, { size: 10, bold: true, color: '#1d4ed8' })
  y += 10

  // Table header
  const cols = [col, col + 20, col + 60, col + 110, col + 155]
  const headers = ['Year', 'Gross Revenue', 'Net Cashflow', 'Cumulative CF', 'Payback']
  rect(col, y, W - margin * 2, 7, '#1e40af')
  headers.forEach((h, i) => text(h, cols[i] + 2, y + 5, { size: 8, bold: true, color: '#ffffff' }))
  y += 7

  result.annualRevenue.forEach((rev, i) => {
    const cum = result.cumulativeCashflow[i]
    const recovered = cum >= 0
    if (recovered) rect(col, y, W - margin * 2, 6.5, '#f0fdf4')
    else if (i % 2 === 0) rect(col, y, W - margin * 2, 6.5, '#f8fafc')

    text(`Yr ${i + 1}`, cols[0] + 2, y + 4.5, { size: 8 })
    text(wan(rev), cols[1] + 2, y + 4.5, { size: 8 })
    text(wan(result.annualNetCashflow[i]), cols[2] + 2, y + 4.5, { size: 8 })
    text(wan(cum), cols[3] + 2, y + 4.5, { size: 8, bold: true, color: recovered ? '#16a34a' : '#dc2626' })
    if (recovered && result.cumulativeCashflow[i - 1] !== undefined && result.cumulativeCashflow[i - 1] < 0) {
      text('← Recovered', cols[4] + 2, y + 4.5, { size: 7.5, color: '#16a34a', bold: true })
    }
    line(col, y + 6.5, W - margin, y + 6.5)
    y += 6.5
  })

  y += 8

  // ── Section: Sensitivity Summary ──────────────────────────────
  // Check if we need a new page
  if (y > 240) { doc.addPage(); y = 20 }

  rect(col, y, W - margin * 2, 7, '#eff6ff')
  text('4. Sensitivity Analysis — IRR Response (%)', col + 3, y + 5, { size: 10, bold: true, color: '#1d4ed8' })
  y += 10

  text('Impact on IRR when each variable changes ±10% / ±20% from base case:', col, y + 4, { size: 8, color: '#64748b' })
  y += 10

  // Mini bar chart: draw horizontal bars for each variable / step
  const variables = [
    { key: 'priceSpread', label: 'Price Spread' },
    { key: 'capex', label: 'CAPEX' },
    { key: 'effectiveDays', label: 'Eff. Days' },
  ]
  const steps = [-0.2, -0.1, 0.1, 0.2]
  const barColors: Record<string, string> = {
    priceSpread: '#3b82f6',
    capex: '#f59e0b',
    effectiveDays: '#10b981',
  }

  // We don't have sensitivity data here; we'll add a note directing reader to the tool
  text('See interactive sensitivity chart in the web tool for full visualization.', col, y + 4, { size: 8, color: '#94a3b8' })
  y += 12

  // ── Footer ────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    rect(0, 290, W, 8, '#f1f5f9')
    text('C&I Energy Storage Economic Calculator · For reference only · Not investment advice',
      W / 2, 295, { size: 7, color: '#94a3b8', align: 'center' })
    text(`${p} / ${totalPages}`, W - margin, 295, { size: 7, color: '#94a3b8', align: 'right' })
  }

  doc.save(`储能测算报告_${input.tariff.province}_${input.ratedEnergyKWh}kWh.pdf`)
}
