# 工商业储能项目经济性测算工具 · v1 项目说明书

## 0. 这份文档怎么用

这是给 Claude Code 的项目蓝本。建议直接放进项目根目录、命名为 `SPEC.md`，然后按文末第 8 节的开场指令，让 Claude Code 一步步实现。

动手前先做一件事：把全文所有标了「⚙️ 待校准」的经济参数，按你了解的当前行情改成真实值。这部分你比任何人都清楚，我给的只是占位示例，不要直接信。

---

## 1. 一句话定义

一个面向储能 EPC / 集成商 / 经销商的网页工具：输入一个工商业储能项目的关键参数，自动算出投资回报（回收期 / IRR / NPV）、画出收益曲线、做敏感性分析，并一键导出一份能直接发给终端客户的 PDF 方案。

---

## 2. v1 范围（务必克制）

### 要做（IN）
- 单个项目测算
- 核心收益 = **峰谷套利**；支持每日「一充一放」或「两充两放」
- 分时电价：从内置省份电价库里选，或手动输入尖/峰/平/谷电价及时段
- 储能配置：额定功率、额定容量（= 时长）、系统效率、可用 DOD、年衰减率
- 投资与成本：初始 CAPEX（元/Wh）、年运维成本、项目年限
- EMC 合同能源管理分成比例（投资方 / 业主）
- 输出：逐年收益、静态与动态回收期、项目 IRR、NPV、逐年现金流曲线、累计现金流（标出回收点）
- 敏感性分析：价差、CAPEX、年运行天数 三个变量对 IRR / 回收期的影响
- 导出 PDF 方案

### 不做（留给 v2，别碰）
- 需量 / 容量电费管理收益、需求响应补贴
- 贷款 / 融资结构建模（v1 一律按全自有资金）
- 用户账号、项目保存、多项目对比
- 实时电价接口、全国电价库自动更新
- 移动端深度适配

> 克制 v1 范围是最重要的纪律。先把一条完整链路跑通，再谈扩。

---

## 3. 核心计算逻辑（工具的心脏）

> 下面是模型骨架。公式结构请你按行业实际校准，尤其是套利公式里效率怎么分摊、衰减怎么逐年体现。

**单次充放套利（一个循环）**
- 每次可用放电量 `E_use (kWh) = 额定容量 × 可用DOD × 当年容量保持率`
- 充电耗电 `E_charge (kWh) = E_use / 系统效率(RTE)`
- 单循环毛收益 `= E_use × 峰时电价 − E_charge × 谷时电价`
  - 若用尖峰电价放电、深谷电价充电，价差更大
  - 两充两放：按两段不同价差分别算后相加

**逐年现金流**
- `年套利收益 = 单日套利 × 年有效运行天数`（⚙️ 待校准，如 330 天）
- `年净收益 = 年套利收益 × 投资方分成比例 − 年运维成本`
- `当年容量保持率 = (1 − 年衰减率)^(年数−1)`（或按你更认可的衰减模型）
- 逐年现金流随容量衰减逐年递减

**财务指标**
- 静态回收期：累计净收益首次 ≥ 初始 CAPEX 的时点（插值到月）
- 动态回收期：同上，但现金流先按折现率贴现
- 项目 IRR：使 NPV = 0 的折现率，对现金流序列 `[−CAPEX, 净收益₁, …, 净收益ₙ]` 求解
- NPV：给定折现率（⚙️ 待校准，如 6%）下的净现值

**默认参数（全部 ⚙️ 待校准，仅占位）**

| 参数 | 占位示例 |
|---|---|
| 系统效率 RTE | 85–90% |
| 可用 DOD | 90% |
| 年衰减率 | ~2–3% |
| 项目年限 | 10 年 |
| CAPEX | 按当前行情填（元/Wh） |
| 年有效运行天数 | 330 天 |
| 投资方分成 | 80–90% |
| 折现率 | 6% |

> 让 Claude Code 给计算引擎写**单元测试**——拿一个你手算过的真实项目验证 IRR 和回收期算得对不对。这是最值得练、也最能保证工具可信的一步。

---

## 4. 数据结构（草案，让 Claude Code 据此实现）

```ts
interface TariffProfile {
  province: string;
  sharpPeakPrice?: number;   // 尖峰 元/kWh
  peakPrice: number;         // 峰
  flatPrice: number;         // 平
  valleyPrice: number;       // 谷
  deepValleyPrice?: number;  // 深谷
  peakWindows: [number, number][];   // 峰/尖峰时段(小时)
  valleyWindows: [number, number][]; // 谷/深谷时段(小时)
}

interface ProjectInput {
  ratedPowerKW: number;        // 额定功率
  ratedEnergyKWh: number;      // 额定容量
  rte: number;                 // 系统效率 0-1
  usableDOD: number;           // 可用DOD 0-1
  annualDegradation: number;   // 年衰减率 0-1
  cyclesPerDay: 1 | 2;         // 日充放次数
  effectiveDaysPerYear: number;
  capexPerWh: number;          // 元/Wh
  annualOpex: number;          // 元/年
  projectYears: number;
  investorShare: number;       // 投资方分成 0-1
  discountRate: number;        // 折现率 0-1
  tariff: TariffProfile;
}

interface CalcResult {
  annualRevenue: number[];       // 逐年套利收益
  annualNetCashflow: number[];   // 逐年净现金流
  cumulativeCashflow: number[];  // 累计(含初始 -CAPEX)
  staticPaybackYears: number;
  dynamicPaybackYears: number;
  irr: number;
  npv: number;
}
```

---

## 5. 技术选型（为练手 + 快速上线而选）

- 前端：React + Vite（JS 或 TS——TS 更能练好习惯但门槛略高，你定）
- 图表：Recharts 或 Chart.js
- PDF：客户端生成（jsPDF / react-pdf 之类），v1 不需要后端
- 状态：React 自带 state 即可；v1 不需要数据库、不需要账号
- 电价库：一个本地 JSON 文件，先放 1–2 个你最熟的省份
- 部署：先求"有个能访问的链接"。要发给国内行业的人看，国内静态托管（腾讯云/阿里云静态托管、Gitee Pages 等）访问更稳；Vercel/Netlify 也行，但国内访问可能不稳。

> 整个 v1 刻意不碰后端。先把「逻辑 + 界面 + 图表 + 导出 + 部署」这条完整链路走通，就够你扎实练一轮 Claude Code 了。后端、账号、电价库自动维护，是 v2 做大时才加的东西。

---

## 6. 建议文件结构

```
src/
  data/        电价库 JSON（分省分时电价）
  lib/         计算引擎（套利 / 现金流 / IRR / NPV / 回收期 / 敏感性）+ 测试
  components/  输入表单、结果面板、图表
  report/      PDF 生成
  App.tsx
  main.tsx
```

---

## 7. 开发里程碑（每个都是一次自然的 Claude Code 会话）

1. 搭计算引擎（纯逻辑、无界面）+ 单元测试，拿真实项目验证算得对
2. 最简输入表单 → 跑通算一个项目，结果先用文字打印
3. 结果面板 + 逐年/累计现金流曲线
4. 敏感性分析模块
5. 电价库（选省份自动带入分时电价）
6. PDF 方案导出
7. 部署上线，拿到可访问链接

> 先把第 1 步做扎实再往下，别跳。逻辑错了，后面再漂亮都是错的。

---

## 8. 启动方式（直接粘进 Claude Code 的第一条指令）

```
我要做一个「工商业储能项目经济性测算」的网页工具，完整需求见项目根目录的 SPEC.md。

请先只做第一步：用 React + Vite 初始化项目，然后在 src/lib 下实现 SPEC 第 3 节描述的
计算引擎——峰谷套利收益、逐年现金流（含容量衰减）、静态与动态回收期、IRR、NPV——
并为它写一组单元测试。

这一步先不做任何界面。完成后告诉我怎么跑测试，我会给你一组真实项目数据来验证算得对不对。
```
