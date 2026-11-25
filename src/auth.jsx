import { Logo } from './ui.jsx'

const STRIP = [
  ['Listening', "audio bo'yicha"],
  ['Reading', '60 daqiqa'],
  ['Writing', '60 daqiqa'],
  ['Speaking', "o'qituvchi bilan"],
]

// Kirish sahifasining chap qismi: nom, qisqa izoh va to'rt bo'lim
export function AuthLayout({ name, title, lead, strip = STRIP, children }) {
  return (
    <div className="auth">
      <aside className="auth-brand">
        <svg className="glow" viewBox="0 0 32 32" aria-hidden="true">
          {[[3, 14], [10.5, 6], [18, 10], [25.5, 2]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="4" height={32 - y} rx="2" fill="currentColor" />
          ))}
        </svg>
        <Logo name={name} />
        <div className="reveal">
          <h1>{title}</h1>
          <p className="lead">{lead}</p>
        </div>
        <ul className="sections-strip">
          {strip.map(([n, t], i) => (
            <li key={n}>
              <div className={'eq' + (i === 0 ? '' : ' still')}><i /><i /><i /><i /><i /></div>
              <b>{n}</b><span>{t}</span>
            </li>
          ))}
        </ul>
      </aside>
      <main className="auth-form">{children}</main>
    </div>
  )
}
