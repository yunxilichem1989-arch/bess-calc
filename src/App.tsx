import { useState, useMemo } from 'react'
import type { ProjectInput } from './lib/types'
import { calculate, sensitivityAnalysis } from './lib/calc'
import { DEFAULT_TARIFF } from './data/tariffs'
import InputForm from './components/InputForm'
import ResultPanel from './components/ResultPanel'
import CashflowChart from './components/CashflowChart'
import SensitivityChart from './components/SensitivityChart'
import { generatePDF } from './report/generatePDF'
import './App.css'

const DEFAULT_INPUT: ProjectInput = {
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
  tariff: DEFAULT_TARIFF,
}

export default function App() {
  const [input, setInput] = useState<ProjectInput>(DEFAULT_INPUT)
  const [exporting, setExporting] = useState(false)

  const result = useMemo(() => calculate(input), [input])
  const sensitivity = useMemo(() => sensitivityAnalysis(input), [input])

  async function handleExport() {
    setExporting(true)
    try {
      await generatePDF(input, result)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>工商业储能项目经济性测算</h1>
          <p>输入项目参数，实时计算回收期 / IRR / NPV 及敏感性分析</p>
        </div>
        <div className="header-right">
          <button
            className={`btn-export${exporting ? ' loading' : ''}`}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? '生成中…' : '📄 导出 PDF 方案'}
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <InputForm value={input} onChange={setInput} />
        </aside>

        <main className="main-content">
          <ResultPanel result={result} />
          <CashflowChart result={result} />
          <SensitivityChart points={sensitivity} />
        </main>
      </div>
    </div>
  )
}
