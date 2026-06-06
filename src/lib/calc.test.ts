import { describe, it, expect } from 'vitest'
import { calculate, sensitivityAnalysis } from './calc'
import type { ProjectInput } from './types'

// 基准测试用例：一个典型工商业储能项目
// 500kW / 1000kWh，上海峰谷价差约 0.7 元/kWh
const baseInput: ProjectInput = {
  ratedPowerKW: 500,
  ratedEnergyKWh: 1000,
  rte: 0.88,
  usableDOD: 0.90,
  annualDegradation: 0.02,
  cyclesPerDay: 1,
  effectiveDaysPerYear: 330,
  capexPerWh: 1.5,        // 1.5 元/Wh，当前市场行情
  annualOpex: 50000,      // 5 万元/年运维
  projectYears: 10,
  investorShare: 0.85,    // 投资方分 85%
  discountRate: 0.06,
  tariff: {
    province: '上海',
    peakPrice: 1.2,        // 峰 1.2 元/kWh
    flatPrice: 0.7,
    valleyPrice: 0.4,      // 谷 0.4 元/kWh
    sharpPeakPrice: 1.4,   // 尖峰 1.4 元/kWh
    deepValleyPrice: 0.3,  // 深谷 0.3 元/kWh
    peakWindows: [[8, 11], [13, 15], [18, 21]],
    valleyWindows: [[23, 24], [0, 7]],
  },
}

describe('calculate - 基准项目', () => {
  it('totalCapex 应等于 capexPerWh × ratedEnergyKWh × 1000', () => {
    const result = calculate(baseInput)
    expect(result.totalCapex).toBeCloseTo(1.5 * 1000 * 1000, 0)
    // 1.5 元/Wh × 1000kWh × 1000 = 1,500,000 元
  })

  it('第1年收益应大于第10年收益（容量衰减）', () => {
    const result = calculate(baseInput)
    expect(result.annualRevenue[0]).toBeGreaterThan(result.annualRevenue[9])
  })

  it('逐年净现金流长度应等于 projectYears', () => {
    const result = calculate(baseInput)
    expect(result.annualNetCashflow).toHaveLength(10)
  })

  it('累计现金流第一项应为 -CAPEX + 第1年净收益', () => {
    const result = calculate(baseInput)
    const expected = -result.totalCapex + result.annualNetCashflow[0]
    expect(result.cumulativeCashflow[0]).toBeCloseTo(expected, 2)
  })

  it('静态回收期应在合理范围内（4~8 年）', () => {
    const result = calculate(baseInput)
    expect(result.staticPaybackYears).toBeGreaterThan(4)
    expect(result.staticPaybackYears).toBeLessThan(8)
  })

  it('动态回收期应大于静态回收期', () => {
    const result = calculate(baseInput)
    expect(result.dynamicPaybackYears).toBeGreaterThan(result.staticPaybackYears)
  })

  it('IRR 应为合理正值（>0）', () => {
    const result = calculate(baseInput)
    expect(result.irr).toBeGreaterThan(0)
  })

  it('NPV 应与 IRR 方向一致：折现率低于IRR时NPV>0', () => {
    const result = calculate(baseInput)
    if (result.irr > baseInput.discountRate) {
      expect(result.npv).toBeGreaterThan(0)
    }
  })
})

describe('calculate - 手动验证单循环套利', () => {
  it('一充一放第1年：手算套利收益应与引擎一致', () => {
    // E_use = 1000 × 0.9 × 1 = 900 kWh
    // E_charge = 900 / 0.88 ≈ 1022.73 kWh
    // 单循环 = 900 × 1.4 - 1022.73 × 0.3 = 1260 - 306.82 = 953.18 元
    // 年收益 = 953.18 × 330 = 314,550 元（第1年）
    const result = calculate({ ...baseInput, cyclesPerDay: 1 })
    const eUse = 1000 * 0.9 * 1
    const eCharge = eUse / 0.88
    const perCycle = eUse * 1.4 - eCharge * 0.3
    const expected = perCycle * 330
    expect(result.annualRevenue[0]).toBeCloseTo(expected, 0)
  })

  it('两充两放第1年收益应约为一充一放的2倍', () => {
    const one = calculate({ ...baseInput, cyclesPerDay: 1 })
    const two = calculate({ ...baseInput, cyclesPerDay: 2 })
    expect(two.annualRevenue[0]).toBeCloseTo(one.annualRevenue[0] * 2, 0)
  })
})

describe('calculate - 边界情况', () => {
  it('价差为0时年收益应为0或负（充电亏损）', () => {
    const zeroDiff = {
      ...baseInput,
      tariff: {
        ...baseInput.tariff,
        peakPrice: 0.5,
        sharpPeakPrice: 0.5,
        valleyPrice: 0.5,
        deepValleyPrice: 0.5,
      },
    }
    const result = calculate(zeroDiff)
    // E_use × 0.5 - E_charge × 0.5 < 0 (因为 E_charge > E_use，RTE<1)
    expect(result.annualRevenue[0]).toBeLessThanOrEqual(0)
    expect(result.irr).toBeNaN()
  })

  it('无法回收投资时 IRR 应为 NaN，静态回收期应为 Infinity', () => {
    const badProject = { ...baseInput, capexPerWh: 100 }  // 极高 CAPEX
    const result = calculate(badProject)
    expect(result.irr).toBeNaN()
    expect(result.staticPaybackYears).toBe(Infinity)
  })
})

describe('sensitivityAnalysis', () => {
  it('应返回 12 个数据点（3变量 × 4步）', () => {
    const points = sensitivityAnalysis(baseInput)
    expect(points).toHaveLength(12)
  })

  it('CAPEX 升高时 IRR 应下降', () => {
    const points = sensitivityAnalysis(baseInput)
    const capexUp20 = points.find(p => p.variable === 'capex' && p.changePercent === 0.2)!
    const capexDown20 = points.find(p => p.variable === 'capex' && p.changePercent === -0.2)!
    expect(capexUp20.irr).toBeLessThan(capexDown20.irr)
  })

  it('价差升高时 IRR 应上升（正值情况下）', () => {
    const points = sensitivityAnalysis(baseInput)
    const up = points.find(p => p.variable === 'priceSpread' && p.changePercent === 0.2)!
    const down10 = points.find(p => p.variable === 'priceSpread' && p.changePercent === -0.1)!
    // up 应有正 IRR
    expect(up.irr).toBeGreaterThan(0)
    // 价差下降10%时IRR应低于价差上升20%
    expect(up.irr).toBeGreaterThan(down10.irr)
  })
})
