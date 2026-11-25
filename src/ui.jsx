import { useEffect, useState } from 'react'
import { getMode, setMode } from './design.js'

// Light / dark rejim (har bir qurilmada alohida eslab qolinadi)
export function ModeSwitch({ labels = ['Light mode', 'Dark mode'] }) {
  const [m, setM] = useState(getMode)
  const pick = (v) => { setMode(v); setM(v) }
  return (
    <div className="mode-sw" role="group" aria-label={`${labels[0]} / ${labels[1]}`}>
      <button type="button" className={m === 'light' ? 'on' : ''} aria-pressed={m === 'light'} aria-label={labels[0]} title={labels[0]} onClick={() => pick('light')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      </button>
      <button type="button" className={m === 'dark' ? 'on' : ''} aria-pressed={m === 'dark'} aria-label={labels[1]} title={labels[1]} onClick={() => pick('dark')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
      </button>
    </div>
  )
}

// Belgi: to'rt ustun — Listening, Reading, Writing, Speaking
export function Logo({ name = 'CDI Mock Platform', sub, size = 30 }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="currentColor" opacity=".12" />
        {[[7, 13], [12.5, 8], [18, 11], [23.5, 6]].map(([x, y], i) => (
          <rect key={i} className="mark-bar" style={{ animationDelay: `${i * 0.12}s` }} x={x} y={y} width="3.5" height={26 - y} rx="1.75" fill="var(--accent)" />
        ))}
      </svg>
      <span>{name}{sub && <small> · {sub}</small>}</span>
    </span>
  )
}

export function Loading({ text = 'Yuklanmoqda...' }) {
  return <div className="center-page"><div className="loading"><div className="spinner" /><span>{text}</span></div></div>
}

// Raqamni 0 dan qiymatgacha silliq oshirib ko'rsatadi
export function useCountUp(target, ms = 1100) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (target == null) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return setV(target)
    let raf, t0
    const step = (t) => {
      t0 ??= t
      const k = Math.min(1, (t - t0) / ms)
      setV(target * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

const ICONS = {
  listening: <path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2v-3Zm16 0a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2v-3Z" />,
  reading: <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5m0-13c2-1.5 5-2 8.5-1.5v13c-3.5-.5-6.5 0-8.5 1.5m0-13v13" />,
  writing: <path d="m14.5 5.5 4 4M4 20l1-4.5L16 4.5a2.1 2.1 0 0 1 3 3L8 18.5 4 20Z" />,
  speaking: <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm6-3a6 6 0 0 1-12 0m6 6v3" />,
}
export function SectionIcon({ section, size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[section]}
    </svg>
  )
}

export function Check() {
  return (
    <svg className="check" viewBox="0 0 84 84" aria-hidden="true">
      <circle cx="42" cy="42" r="42" />
      <path d="M26 43l11 11 21-23" />
    </svg>
  )
}
