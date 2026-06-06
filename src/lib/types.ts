export interface TariffProfile {
  province: string;
  sharpPeakPrice?: number;   // 尖峰 元/kWh
  peakPrice: number;          // 峰
  flatPrice: number;           // 平
  valleyPrice: number;         // 谷
  deepValleyPrice?: number;   // 深谷
  peakWindows: [number, number][];    // 峰/尖峰时段 [起始小时, 结束小时)
  valleyWindows: [number, number][];  // 谷/深谷时段
}

export interface ProjectInput {
  ratedPowerKW: number;
  ratedEnergyKWh: number;
  rte: number;                 // 系统效率 0-1
  usableDOD: number;           // 可用DOD 0-1
  annualDegradation: number;   // 年衰减率 0-1
  cyclesPerDay: 1 | 2;
  effectiveDaysPerYear: number;
  capexPerWh: number;          // 元/Wh
  annualOpex: number;          // 元/年（固定运维）
  projectYears: number;
  investorShare: number;       // 投资方分成 0-1
  discountRate: number;        // 折现率 0-1
  tariff: TariffProfile;
}

export interface CalcResult {
  totalCapex: number;
  annualRevenue: number[];       // 逐年套利毛收益
  annualNetCashflow: number[];   // 逐年净现金流（已扣运维、按分成）
  cumulativeCashflow: number[];  // 累计现金流（含初始 -CAPEX）
  staticPaybackYears: number;    // 静态回收期（年）
  dynamicPaybackYears: number;   // 动态回收期（年）
  irr: number;                   // IRR
  npv: number;                   // NPV
}

export interface SensitivityPoint {
  variable: string;
  changePercent: number;  // 相对基准的变化百分比
  irr: number;
  paybackYears: number;
}
