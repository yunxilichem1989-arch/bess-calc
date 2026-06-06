import { useState } from 'react'
import type { ProjectInput } from '../lib/types'
import { TARIFFS } from '../data/tariffs'

interface Props {
  value: ProjectInput
  onChange: (v: ProjectInput) => void
}

function Field({
  label, unit, value, onChange, min, max, step, hint,
}: {
  label: string; unit?: string; value: number; onChange: (n: number) => void
  min?: number; max?: number; step?: number; hint?: string
}) {
  return (
    <div className="field">
      <label>{label}{unit && <span className="unit"> ({unit})</span>}</label>
      <input
        type="number" value={value} min={min} max={max} step={step ?? 'any'}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
      />
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

export default function InputForm({ value, onChange }: Props) {
  const [provinceIdx, setProvinceIdx] = useState(0)

  const set = <K extends keyof ProjectInput>(key: K, val: ProjectInput[K]) =>
    onChange({ ...value, [key]: val })

  const handleProvinceChange = (idx: number) => {
    setProvinceIdx(idx)
    const t = TARIFFS[idx]
    onChange({ ...value, tariff: { ...t } })
  }

  const t = value.tariff

  return (
    <form className="input-form" onSubmit={e => e.preventDefault()}>

      <section>
        <h3>⚡ 储能配置</h3>
        <Field label="额定功率" unit="kW" value={value.ratedPowerKW}
          onChange={v => set('ratedPowerKW', v)} min={1} />
        <Field label="额定容量" unit="kWh" value={value.ratedEnergyKWh}
          onChange={v => set('ratedEnergyKWh', v)} min={1} />
        <Field label="系统效率 RTE" unit="%" value={Math.round(value.rte * 100)}
          onChange={v => set('rte', v / 100)} min={60} max={100} step={1} />
        <Field label="可用 DOD" unit="%" value={Math.round(value.usableDOD * 100)}
          onChange={v => set('usableDOD', v / 100)} min={50} max={100} step={1} />
        <Field label="年衰减率" unit="%" value={+(value.annualDegradation * 100).toFixed(2)}
          onChange={v => set('annualDegradation', v / 100)} min={0} max={10} step={0.1} />
        <div className="field">
          <label>每日充放次数</label>
          <div className="radio-group">
            {([1, 2] as const).map(n => (
              <label key={n} className="radio-label">
                <input type="radio" checked={value.cyclesPerDay === n}
                  onChange={() => set('cyclesPerDay', n)} />
                {n === 1 ? '一充一放' : '两充两放'}
              </label>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3>💰 投资与成本</h3>
        <Field label="系统造价" unit="元/Wh" value={value.capexPerWh}
          onChange={v => set('capexPerWh', v)} min={0.1} step={0.05}
          hint={`总投资 ${((value.capexPerWh * value.ratedEnergyKWh * 1000) / 10000).toFixed(1)} 万元`} />
        <Field label="年运维成本" unit="元/年" value={value.annualOpex}
          onChange={v => set('annualOpex', v)} min={0} step={1000} />
        <Field label="年有效运行天数" unit="天" value={value.effectiveDaysPerYear}
          onChange={v => set('effectiveDaysPerYear', Math.round(v))} min={1} max={365} step={1} />
        <Field label="项目年限" unit="年" value={value.projectYears}
          onChange={v => set('projectYears', Math.round(v))} min={1} max={25} step={1} />
      </section>

      <section>
        <h3>📋 合同与财务</h3>
        <Field label="投资方分成比例" unit="%" value={Math.round(value.investorShare * 100)}
          onChange={v => set('investorShare', v / 100)} min={0} max={100} step={1}
          hint={`业主分成 ${Math.round((1 - value.investorShare) * 100)}%`} />
        <Field label="折现率" unit="%" value={+(value.discountRate * 100).toFixed(1)}
          onChange={v => set('discountRate', v / 100)} min={0} max={30} step={0.5} />
      </section>

      <section>
        <h3>🏙️ 分时电价</h3>
        <div className="field">
          <label>省份电价库</label>
          <select value={provinceIdx} onChange={e => handleProvinceChange(+e.target.value)}>
            {TARIFFS.map((t, i) => <option key={i} value={i}>{t.province}</option>)}
          </select>
        </div>
        <div className="tariff-grid">
          {t.sharpPeakPrice !== undefined && (
            <Field label="尖峰电价" unit="元/kWh" value={t.sharpPeakPrice}
              onChange={v => onChange({ ...value, tariff: { ...t, sharpPeakPrice: v } })} step={0.001} />
          )}
          <Field label="峰电价" unit="元/kWh" value={t.peakPrice}
            onChange={v => onChange({ ...value, tariff: { ...t, peakPrice: v } })} step={0.001} />
          <Field label="平电价" unit="元/kWh" value={t.flatPrice}
            onChange={v => onChange({ ...value, tariff: { ...t, flatPrice: v } })} step={0.001} />
          <Field label="谷电价" unit="元/kWh" value={t.valleyPrice}
            onChange={v => onChange({ ...value, tariff: { ...t, valleyPrice: v } })} step={0.001} />
          {t.deepValleyPrice !== undefined && (
            <Field label="深谷电价" unit="元/kWh" value={t.deepValleyPrice}
              onChange={v => onChange({ ...value, tariff: { ...t, deepValleyPrice: v } })} step={0.001} />
          )}
        </div>
        <div className="price-spread-hint">
          实际价差：<strong>{(
            (t.sharpPeakPrice ?? t.peakPrice) -
            (t.deepValleyPrice ?? t.valleyPrice) / value.rte
          ).toFixed(3)}</strong> 元/kWh
          （放电价 − 充电等效价）
        </div>
      </section>

    </form>
  )
}
