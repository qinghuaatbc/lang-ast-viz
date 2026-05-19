import { useState, useEffect, useRef, useCallback } from 'react'
import { useLang } from '../i18n/lang'

interface Example {
  label_zh: string
  label_en: string
  code: string
  steps: BusStep[]
}

interface BusStep {
  addr: string
  ctrl: string
  data: string
  desc_zh: string
  desc_en: string
  highlightLine: number
}

const EXAMPLES: Example[] = [
  {
    label_zh: '简单方法调用', label_en: 'Simple Method Call',
    code: `class Engine {
public:
    void start(int speed) {
        rpm = speed;  // 内部状态
        running = true;
    }
private:
    int rpm;
    bool running = false;
};

class Car {
    Engine engine;  // 模块 = Engine 芯片
public:
    void startEngine() {
        // 地址总线: &engine + start偏移
        // 控制总线: Write=1, Request=1
        // 数据总线: speed=3000
        engine.start(3000);
        // 控制总线: Done=1
    }
};`,
    steps: [
      { addr: '—',        ctrl: '—',           data: '—',         desc_zh: '初始状态：Car 对象准备调用 Engine', desc_en: 'Idle: Car object preparing to call Engine', highlightLine: -1 },
      { addr: '0xEngine + start_offset', ctrl: 'Request=1',      data: '—',         desc_zh: '① 地址总线发出 Engine 模块基地址 + start() 方法偏移', desc_en: '① Address bus: Engine base addr + start() offset', highlightLine: 15 },
      { addr: '0xEngine + start_offset', ctrl: 'Write=1, Request=1', data: 'speed = 3000', desc_zh: '② 控制总线发写信号，数据总线传输参数 speed=3000', desc_en: '② Control bus: Write=1, Data bus: speed=3000', highlightLine: 16 },
      { addr: '—',        ctrl: 'Execute',     data: '—',         desc_zh: '③ Engine 模块执行 start() 内部电路（设置 rpm、running）', desc_en: '③ Engine module executes start() internal logic', highlightLine: 4 },
      { addr: '—',        ctrl: 'Ready=1, Done=1', data: 'void', desc_zh: '④ 控制总线发完成信号，方法返回', desc_en: '④ Control bus: Ready=1, Done=1, method returns', highlightLine: 17 },
    ],
  },
  {
    label_zh: '带参数和返回值', label_en: 'Params & Return',
    code: `class Calculator {
public:
    int add(int a, int b) {
        return a + b;  // ALU 运算
    }
};

class App {
    Calculator calc;
public:
    int compute() {
        // 地址: &calc + add偏移
        // 数据: a=10, b=20
        int result = calc.add(10, 20);
        // 数据返回: result=30
        return result;
    }
};`,
    steps: [
      { addr: '—',              ctrl: '—',               data: '—',             desc_zh: '初始状态', desc_en: 'Idle', highlightLine: -1 },
      { addr: '&calc + add_off', ctrl: 'Request=1',       data: '—',             desc_zh: '① 地址总线选中 Calculator.add 方法', desc_en: '① Address bus selects Calculator.add', highlightLine: 14 },
      { addr: '&calc + add_off', ctrl: 'Write=1',         data: 'a=10, b=20',    desc_zh: '② 数据总线传参 a=10, b=20', desc_en: '② Data bus: a=10, b=20', highlightLine: 14 },
      { addr: '—',              ctrl: 'Execute',          data: '—',             desc_zh: '③ Calculator 做 ALU 加法运算', desc_en: '③ Calculator performs ALU addition', highlightLine: 4 },
      { addr: '—',              ctrl: 'Ready=1, Read=1',  data: 'result=30',     desc_zh: '④ 数据总线返回结果 result=30', desc_en: '④ Data bus returns result=30', highlightLine: 15 },
    ],
  },
  {
    label_zh: '多态 — 虚函数调用', label_en: 'Polymorphism — vtable',
    code: `class Engine {
public:
    // 虚函数表 vtable 决定实际实现
    virtual void start(int s) = 0;
};

class ElectricEngine : public Engine {
    void start(int s) override {
        power_on(); // 电动启动
    }
};

class PetrolEngine : public Engine {
    void start(int s) override {
        ignite();   // 燃油点火
    }
};

class Car {
    Engine* engine;  // 芯片插槽
public:
    void start() {
        // 地址: vtable[Engine::start]
        // vtable 动态路由到实际模块
        engine->start(5000);
    }
};`,
    steps: [
      { addr: '—',                ctrl: '—',              data: '—',         desc_zh: '初始：Car 持有 Engine 接口指针（插槽）', desc_en: 'Idle: Car holds Engine interface pointer (slot)', highlightLine: -1 },
      { addr: 'engine_ptr',        ctrl: 'Request=1',      data: '—',         desc_zh: '① 地址总线读取 engine 指针 → 解引用到 vtable', desc_en: '① Address bus: read engine ptr → dereference to vtable', highlightLine: 28 },
      { addr: 'vtable[start]',     ctrl: 'Read=1',         data: '—',         desc_zh: '② CPU 从 vtable 读取 start() 的实际地址（多态路由）', desc_en: '② CPU reads actual start() address from vtable (polymorphic routing)', highlightLine: 28 },
      { addr: 'ElectricEngine::start', ctrl: 'Write=1, Request=1', data: 'speed=5000', desc_zh: '③ 地址总线跳转到 ElectricEngine::start，传参', desc_en: '③ Address bus jumps to ElectricEngine::start, pass params', highlightLine: 8 },
      { addr: '—',                ctrl: 'Done=1',         data: 'void',      desc_zh: '④ 完成，Car 不关心是哪个引擎实现', desc_en: '④ Done — Car doesn\'t care which engine implementation', highlightLine: 29 },
    ],
  },
]

const BUS_COLORS = {
  addr: '#ff7b72',
  data: '#56d364',
  ctrl: '#79c0ff',
}

function BusArrow({ color, label, active }: { color: string; label: string; active: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6,
      background: active ? color + '25' : 'var(--bg-secondary)',
      border: `1px solid ${active ? color : 'var(--border)'}`,
      transition: 'all 0.4s',
      fontSize: 11, fontWeight: active ? 700 : 400,
    }}>
      <div style={{
        width: 12, height: 12, borderRadius: '50%',
        background: active ? color : '#444',
        transition: 'all 0.3s',
        boxShadow: active ? `0 0 8px ${color}` : 'none',
      }}/>
      <span style={{ color: active ? color : 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

function ModuleBox({ name, active, children }: { name: string; active: boolean; children?: React.ReactNode }) {
  return (
    <div style={{
      border: `2px solid ${active ? '#4d8fff' : 'var(--border)'}`,
      borderRadius: 10, padding: '12px 16px',
      background: active ? '#4d8fff15' : 'var(--bg-secondary)',
      transition: 'all 0.4s',
      minWidth: 140, textAlign: 'center',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: active ? '#4d8fff' : 'var(--text)' }}>
        {active ? '⚡ ' : '🔲 '}{name}
      </div>
      {children}
    </div>
  )
}

function BusLine({ label, color, active, value }: { label: string; color: string; active: boolean; value: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      borderRadius: 6, transition: 'all 0.4s',
      background: active ? color + '18' : 'transparent',
    }}>
      <div style={{ width: 80, fontSize: 11, fontWeight: 700, color: active ? color : 'var(--text-muted)', textAlign: 'right' }}>
        {label}
      </div>
      <div style={{
        flex: 1, height: 28, borderRadius: 4, position: 'relative', overflow: 'hidden',
        background: active ? color + '30' : 'var(--bg-secondary)',
        border: `1px solid ${active ? color : 'var(--border)'}`,
        transition: 'all 0.4s',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          width: active ? '100%' : '0%',
          background: `linear-gradient(90deg, ${color}40, ${color})`,
          transition: 'width 0.6s ease',
        }}/>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%', width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: active ? 700 : 400,
          color: active ? '#fff' : 'var(--text-muted)',
          fontFamily: 'monospace', zIndex: 1,
        }}>
          {value || '—'}
        </div>
      </div>
    </div>
  )
}

export default function ObjectBusView() {
  const { lang } = useLang()
  const isZh = lang === 'zh'
  const [exIdx, setExIdx] = useState(0)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ex = EXAMPLES[exIdx]
  const s = ex.steps[step % ex.steps.length]

  const nextStep = useCallback(() => {
    setStep(s => (s + 1) % (EXAMPLES[exIdx].steps.length))
  }, [exIdx])

  useEffect(() => {
    if (playing) {
      timerRef.current = setTimeout(nextStep, 1800)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, step, nextStep])

  const togglePlay = () => {
    if (!playing) { setPlaying(true) }
    else { setPlaying(false); if (timerRef.current) clearTimeout(timerRef.current) }
  }

  const reset = () => { setPlaying(false); setStep(0); if (timerRef.current) clearTimeout(timerRef.current) }

  const codeLines = ex.code.split('\n')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 12, gap: 10, overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
          {isZh ? '🔌 三总线虚拟电路' : '🔌 Three-Bus Virtual Circuit'}
        </span>
        <select value={exIdx} onChange={e => { setExIdx(+e.target.value); reset() }}
          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12 }}>
          {EXAMPLES.map((e, i) => (
            <option key={i} value={i}>{isZh ? e.label_zh : e.label_en}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={reset} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
          ⏹ {isZh ? '重置' : 'Reset'}
        </button>
        <button onClick={nextStep} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
          ⏭ {isZh ? '单步' : 'Step'}
        </button>
        <button onClick={togglePlay} style={{
          padding: '6px 18px', borderRadius: 6, border: 'none',
          background: playing ? '#ff7b72' : '#56d364', color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 700,
        }}>
          {playing ? '⏸ ' + (isZh ? '暂停' : 'Pause') : '▶ ' + (isZh ? '播放' : 'Play')}
        </button>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {step + 1}/{ex.steps.length}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
        <div style={{
          flex: '0 0 44%', overflow: 'auto', borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
            {isZh ? '💻 C++ 代码 (Caller 视角)' : '💻 C++ Code (Caller View)'}
          </div>
          <pre style={{ margin: 0, padding: 10, fontSize: 11.5, lineHeight: 1.7, fontFamily: "'SF Mono','Fira Code',monospace", overflow: 'auto', color: '#e6edf3' }}>
            {codeLines.map((line, i) => (
              <div key={i} style={{
                background: s.highlightLine === i + 1 ? 'rgba(255,255,255,0.08)' : 'transparent',
                borderLeft: s.highlightLine === i + 1 ? `3px solid ${BUS_COLORS.addr}` : '3px solid transparent',
                paddingLeft: 8, transition: 'all 0.3s',
              }}>
                <span style={{ color: '#444', marginRight: 12, userSelect: 'none', fontSize: 10 }}>{i + 1}</span>
                <span>{line}</span>
              </div>
            ))}
          </pre>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center', padding: '8px 0' }}>
            <ModuleBox name="🚗 Car" active={step > 0 && step < ex.steps.length - 1}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Caller</div>
            </ModuleBox>
            <div style={{ fontSize: 20, color: 'var(--text-muted)' }}>→</div>
            <ModuleBox name="⚙️ Engine / Calc" active={step >= 2 && step < ex.steps.length - 1}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Callee</div>
            </ModuleBox>
            {exIdx === 2 && (
              <>
                <div style={{ fontSize: 20, color: 'var(--text-muted)' }}>→</div>
                <ModuleBox name="🔋 Electric" active={step >= 3}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>vtable</div>
                </ModuleBox>
              </>
            )}
          </div>

          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)',
            padding: '8px 12px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
              {isZh ? '三总线状态' : 'Three-Bus State'}
            </div>
            <BusLine label={isZh ? '地址总线' : 'Address Bus'} color={BUS_COLORS.addr} active={s.addr !== '—'} value={s.addr} />
            <BusLine label={isZh ? '控制总线' : 'Control Bus'} color={BUS_COLORS.ctrl} active={s.ctrl !== '—'} value={s.ctrl} />
            <BusLine label={isZh ? '数据总线' : 'Data Bus'} color={BUS_COLORS.data} active={s.data !== '—'} value={s.data} />
          </div>

          <div style={{
            background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)',
            padding: 12, fontSize: 13, lineHeight: 1.6, color: 'var(--text)',
          }}>
            {isZh ? s.desc_zh : s.desc_en}
          </div>

          <div style={{ display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span>• {isZh ? '地址总线: 选模块+方法（对象指针+偏移）' : 'Addr Bus: select module+method (ptr+offset)'}</span>
            <span>• {isZh ? '数据总线: 传参数/返回值' : 'Data Bus: params/return value'}</span>
            <span>• {isZh ? '控制总线: 协调流程（Request/Done/Ready）' : 'Ctrl Bus: handshake (Request/Done/Ready)'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
