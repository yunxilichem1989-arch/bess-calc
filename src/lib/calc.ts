import type { ProjectInput, CalcResult, SensitivityPoint } from './types'

/**
 * 计算年容量保持率（第 year 年，year 从 1 开始）
 */
function capacityRetention(annualDegradation: number, year: number): number {
  return Math.pow(1 - annualDegradation, year - 1)
}

/**
 * 单循环套利毛收益（元）
 * 放电：用最高价时段；充电：用最低价时段
 * 一充一放：1 个充/放循环
 * 两充两放：2 个循环（分别计算，这里简化为同一价差×2，
 *   如需不同价差可扩展 tariff 结构，v1 按同价差处理）
 */
function dailyArbitrage(input: ProjectInput, year: number): number {
  const { ratedEnergyKWh, rte, usableDOD, annualDegradation, cyclesPerDay, tariff } = input

  const retention = capacityRetention(annualDegradation, year)
  const eUse = ratedEnergyKWh * usableDOD * retention   // 可用放电量 kWh
  const eCharge = eUse / rte                              // 充电耗电量 kWh

  // 放电用峰/尖峰价（取最高），充电用谷/深谷价（取最低）
  const chargePrice = tariff.deepValleyPrice ?? tariff.valleyPrice
  const dischargePrice = tariff.sharpPeakPrice ?? tariff.peakPrice

  const profitPerCycle = eUse * dischargePrice - eCharge * chargePrice
  return Math.max(0, profitPerCycle) * cyclesPerDay
}

/**
 * 构建逐年净现金流序列（不含初始 CAPEX，从第 1 年开始）
 */
function buildAnnualCashflows(input: ProjectInput): { revenues: number[]; netCashflows: number[] } {
  const { projectYears, effectiveDaysPerYear, annualOpex, investorShare } = input
  const revenues: number[] = []
  const netCashflows: number[] = []

  for (let year = 1; year <= projectYears; year++) {
    const annualRevenue = dailyArbitrage(input, year) * effectiveDaysPerYear
    const netCashflow = annualRevenue * investorShare - annualOpex
    revenues.push(annualRevenue)
    netCashflows.push(netCashflow)
  }
  return { revenues, netCashflows }
}

/**
 * 静态回收期：累计净收益（不贴现）首次 ≥ CAPEX 的时点，插值到年
 */
function calcStaticPayback(capex: number, netCashflows: number[]): number {
  let cumulative = 0
  for (let i = 0; i < netCashflows.length; i++) {
    const prev = cumulative
    cumulative += netCashflows[i]
    if (cumulative >= capex) {
      // 线性插值
      const fraction = (capex - prev) / netCashflows[i]
      return i + fraction
    }
  }
  return Infinity
}

/**
 * 动态回收期：贴现后的累计现金流首次 ≥ 0 的时点
 */
function calcDynamicPayback(capex: number, netCashflows: number[], discountRate: number): number {
  let cumulative = -capex
  for (let i = 0; i < netCashflows.length; i++) {
    const pv = netCashflows[i] / Math.pow(1 + discountRate, i + 1)
    const prev = cumulative
    cumulative += pv
    if (cumulative >= 0) {
      const fraction = -prev / pv
      return i + fraction
    }
  }
  return Infinity
}

/**
 * NPV 计算
 */
function calcNPV(capex: number, netCashflows: number[], discountRate: number): number {
  const pvSum = netCashflows.reduce((sum, cf, i) => {
    return sum + cf / Math.pow(1 + discountRate, i + 1)
  }, 0)
  return pvSum - capex
}

/**
 * IRR 二分法求解：使 NPV=0 的折现率
 * 若无解（全负或回收期超长）返回 NaN
 */
function calcIRR(capex: number, netCashflows: number[]): number {
  // 快速检查是否有正总收益
  const totalNet = netCashflows.reduce((a, b) => a + b, 0)
  if (totalNet <= capex) return NaN  // 无法回收投资

  let lo = -0.999
  let hi = 10.0  // 最高 1000%

  const npvAt = (r: number) => calcNPV(capex, netCashflows, r)

  if (npvAt(lo) * npvAt(hi) > 0) return NaN

  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2
    if (npvAt(mid) > 0) lo = mid
    else hi = mid
    if (hi - lo < 1e-8) break
  }
  return (lo + hi) / 2
}

/**
 * 主计算函数
 */
export function calculate(input: ProjectInput): CalcResult {
  const totalCapex = input.capexPerWh * input.ratedEnergyKWh * 1000  // Wh = kWh × 1000

  const { revenues, netCashflows } = buildAnnualCashflows(input)

  // 累计现金流（含初始 -CAPEX）
  const cumulativeCashflow: number[] = []
  let cumulative = -totalCapex
  for (const cf of netCashflows) {
    cumulative += cf
    cumulativeCashflow.push(cumulative)
  }

  const staticPaybackYears = calcStaticPayback(totalCapex, netCashflows)
  const dynamicPaybackYears = calcDynamicPayback(totalCapex, netCashflows, input.discountRate)
  const irr = calcIRR(totalCapex, netCashflows)
  const npv = calcNPV(totalCapex, netCashflows, input.discountRate)

  return {
    totalCapex,
    annualRevenue: revenues,
    annualNetCashflow: netCashflows,
    cumulativeCashflow,
    staticPaybackYears,
    dynamicPaybackYears,
    irr,
    npv,
  }
}

/**
 * 敏感性分析：对价差、CAPEX、年运行天数三个变量分别 ±10%/±20% 进行扰动
 */
export function sensitivityAnalysis(baseInput: ProjectInput): SensitivityPoint[] {
  const steps = [-0.2, -0.1, 0.1, 0.2]
  const results: SensitivityPoint[] = []

  const run = (modified: ProjectInput, variable: string, changePercent: number) => {
    const r = calculate(modified)
    results.push({
      variable,
      changePercent,
      irr: r.irr,
      paybackYears: r.staticPaybackYears,
    })
  }

  for (const step of steps) {
    // 1. 价差变动：等比例调整峰谷价（保持其他电价不变，只改放电价差）
    const tariffModified = {
      ...baseInput.tariff,
      peakPrice: baseInput.tariff.peakPrice * (1 + step),
      sharpPeakPrice: baseInput.tariff.sharpPeakPrice
        ? baseInput.tariff.sharpPeakPrice * (1 + step)
        : undefined,
    }
    run({ ...baseInput, tariff: tariffModified }, 'priceSpread', step)

    // 2. CAPEX 变动
    run({ ...baseInput, capexPerWh: baseInput.capexPerWh * (1 + step) }, 'capex', step)

    // 3. 年运行天数变动
    run(
      { ...baseInput, effectiveDaysPerYear: Math.round(baseInput.effectiveDaysPerYear * (1 + step)) },
      'effectiveDays',
      step
    )
  }

  return results
}
