import { calculate } from './calc'
import type { ProjectInput } from './types'

const input: ProjectInput = {
  ratedPowerKW: 500,
  ratedEnergyKWh: 1000,
  rte: 0.88,
  usableDOD: 0.90,
  annualDegradation: 0.02,
  cyclesPerDay: 1,
  effectiveDaysPerYear: 330,
  capexPerWh: 1.5,
  annualOpex: 50000,
  projectYears: 10,
  investorShare: 0.85,
  discountRate: 0.06,
  tariff: {
    province: '上海',
    peakPrice: 1.2,
    flatPrice: 0.7,
    valleyPrice: 0.4,
    sharpPeakPrice: 1.4,
    deepValleyPrice: 0.3,
    peakWindows: [[8, 11], [13, 15], [18, 21]],
    valleyWindows: [[23, 24], [0, 7]],
  },
}

const r = calculate(input)

console.log('=== 工商业储能经济性测算结果 ===')
console.log(`项目规模：${input.ratedPowerKW}kW / ${input.ratedEnergyKWh}kWh`)
console.log(`总CAPEX：${(r.totalCapex / 10000).toFixed(1)} 万元`)
console.log('')
console.log('逐年收益（套利毛收益 / 净现金流）：')
for (let i = 0; i < r.annualRevenue.length; i++) {
  console.log(
    `  第${String(i + 1).padStart(2, ' ')}年：毛收益 ${(r.annualRevenue[i] / 10000).toFixed(2)} 万元` +
    `  净现金流 ${(r.annualNetCashflow[i] / 10000).toFixed(2)} 万元` +
    `  累计 ${(r.cumulativeCashflow[i] / 10000).toFixed(2)} 万元`
  )
}
console.log('')
console.log(`静态回收期：${r.staticPaybackYears.toFixed(2)} 年`)
console.log(`动态回收期：${r.dynamicPaybackYears.toFixed(2)} 年`)
console.log(`IRR：${(r.irr * 100).toFixed(2)}%`)
console.log(`NPV（折现率6%）：${(r.npv / 10000).toFixed(1)} 万元`)
