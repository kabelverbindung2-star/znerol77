import { Calculator, Countdown, Stopwatch } from '../tools/Tools'

export default function Werkzeuge(): JSX.Element {
  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Werkzeuge</div>
          <div className="page-subtitle">Stoppuhr, Timer und Taschenrechner – laufen weiter, auch wenn du den Tab wechselst</div>
        </div>
      </div>
      <div className="tools-grid">
        <section className="glass panel">
          <div className="panel-head">
            <span>Stoppuhr</span>
          </div>
          <Stopwatch />
        </section>
        <section className="glass panel">
          <div className="panel-head">
            <span>Timer</span>
          </div>
          <Countdown />
        </section>
        <section className="glass panel calc-panel">
          <div className="panel-head">
            <span>Taschenrechner</span>
            <span className="quick-sub">auch mit Tastatur</span>
          </div>
          <Calculator />
        </section>
      </div>
    </>
  )
}
