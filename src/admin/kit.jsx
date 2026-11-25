import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCountUp } from '../ui.jsx'
import { getLang, setLang } from './i18n.js'

// ---------- Ikonkalar ----------
const P = {
  sessions: 'M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z',
  listening: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2v-3Zm16 0a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2v-3Z',
  reading: 'M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5m0-13c2-1.5 5-2 8.5-1.5v13c-3.5-.5-6.5 0-8.5 1.5m0-13v13',
  writing: 'm14.5 5.5 4 4M4 20l1-4.5L16 4.5a2.1 2.1 0 0 1 3 3L8 18.5 4 20Z',
  results: 'M4 20V10m6 10V4m6 16v-7m4 7H3',
  grading: 'm9 12 2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  search: 'm20 20-4.5-4.5M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6 6-6-6 6-6',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4m4 4H4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  download: 'M12 4v11m-5-5 5 5 5-5M5 20h14',
  print: 'M7 8V4h10v4M7 17H5a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M7 14h10v6H7z',
  trash: 'M5 7h14M10 11v6m4-6v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  upload: 'M12 16V5m-5 5 5-5 5 5M5 20h14',
  refresh: 'M20 11a8 8 0 0 0-14.9-3.9M4 5v4h4m-4 4a8 8 0 0 0 14.9 3.9M20 19v-4h-4',
  users: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.9M15.5 3.2a3.5 3.5 0 0 1 0 6.6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  tests: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4',
  image: 'M4 16l4.6-4.6a2 2 0 0 1 2.8 0L16 16m-2-2 1.6-1.6a2 2 0 0 1 2.8 0L20 14M14 8h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z',
  audio: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
}
export function Icon({ name, size = 18, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={P[name]} />
    </svg>
  )
}

// ---------- Sahifa sarlavhasi ----------
export function PageHead({ title, sub, actions, back }) {
  return (
    <div className="ph">
      <div className="ph-text">
        {back && <button className="ph-back" onClick={back.onClick}><Icon name="back" size={16} /> {back.label}</button>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </div>
  )
}

// ---------- KPI qatori ----------
function KpiValue({ value, dec = 0 }) {
  const v = useCountUp(typeof value === 'number' ? value : null)
  return typeof value === 'number' ? v.toFixed(dec) : (value ?? '—')
}
export function Kpis({ items }) {
  return (
    <div className="kpis">
      {items.map((k) => (
        <div key={k.label} className={'kpi' + (k.hot ? ' hot' : '')}>
          <span>{k.label}</span>
          <b><KpiValue value={k.value} dec={k.dec} /></b>
          {k.note && <small>{k.note}</small>}
        </div>
      ))}
    </div>
  )
}

// ---------- Segment tugmalar (sirpanuvchi fon bilan) ----------
export function Seg({ value, onChange, options }) {
  const ref = useRef(null)
  const [ind, setInd] = useState(null)
  useLayoutEffect(() => {
    const measure = () => {
      const el = ref.current?.querySelector('[data-on="1"]')
      if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    // Til almashganda tugma kengligi o'zgaradi — indikator qayta o'lchanadi
    const ro = new ResizeObserver(measure)
    ref.current?.querySelectorAll('button').forEach((b) => ro.observe(b))
    return () => ro.disconnect()
  }, [value, options.length])
  return (
    <div className="seg" ref={ref} role="tablist">
      {ind && <span className="seg-ind" style={{ transform: `translateX(${ind.left - 4}px)`, width: ind.width }} />}
      {options.map(([k, l, n]) => (
        <button key={k} role="tab" aria-selected={value === k} data-on={value === k ? '1' : '0'} onClick={() => onChange(k)}>
          {l}{n != null && <em>{n}</em>}
        </button>
      ))}
    </div>
  )
}

// ---------- Modal va yon panel (fon xiralashadi) ----------
function useEsc(onClose) {
  useEffect(() => {
    const f = (e) => e.key === 'Escape' && onClose()
    addEventListener('keydown', f)
    return () => removeEventListener('keydown', f)
  }, [onClose])
}
export function Modal({ title, onClose, children, wide }) {
  useEsc(onClose)
  return createPortal(
    <div className="ov" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'dlg' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="dlg-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Yopish"><Icon name="close" /></button></div>
        {children}
      </div>
    </div>, document.body)
}
export function Drawer({ title, sub, onClose, children }) {
  useEsc(onClose)
  return createPortal(
    <div className="ov ov-right" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-head">
          <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Yopish"><Icon name="close" /></button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>, document.body)
}

// ---------- Kalit (ochiq / yopiq) ----------
export function Switch({ on, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={'sw' + (on ? ' on' : '')} onClick={onChange} disabled={disabled}>
      <i /><span>{label ?? (on ? 'Ochiq' : 'Yopiq')}</span>
    </button>
  )
}

// ---------- Til tanlash (UZ / EN) ----------
export function LangSwitch() {
  const [l, setL] = useState(getLang)
  return (
    <div className="lang-sw" role="group" aria-label="Til / Language">
      {['uz', 'en'].map((k) => (
        <button key={k} type="button" className={l === k ? 'on' : ''} aria-pressed={l === k} onClick={() => { setLang(k); setL(k) }}>{k.toUpperCase()}</button>
      ))}
    </div>
  )
}

// ---------- Bildirishnoma ----------
export const toast = (text, kind = 'ok') => dispatchEvent(new CustomEvent('adm-toast', { detail: { text, kind } }))
export function Toasts() {
  const [list, setList] = useState([])
  useEffect(() => {
    const f = (e) => {
      const id = Math.random()
      setList((l) => [...l, { id, ...e.detail }])
      setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 3200)
    }
    addEventListener('adm-toast', f)
    return () => removeEventListener('adm-toast', f)
  }, [])
  return createPortal(<div className="toasts">{list.map((t) => <div key={t.id} className={'toast ' + t.kind}>{t.kind === 'ok' ? '✓' : '!'} {t.text}</div>)}</div>, document.body)
}

// ---------- Yuklanish skeleti va bo'sh holat ----------
export function Skeleton({ rows = 4 }) {
  return <div className="skel">{Array.from({ length: rows }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.08}s` }} />)}</div>
}
export function Empty({ icon = 'sessions', title, children }) {
  return <div className="empty"><span><Icon name={icon} size={26} /></span><b>{title}</b>{children && <p>{children}</p>}</div>
}

// Ism bosh harflari va unga mos och rang
const HUES = [45, 215, 150, 15, 265, 185, 330, 95]
export function Initials({ name }) {
  const h = HUES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % HUES.length]
  const ini = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return <span className="ini" style={{ background: `hsl(${h} 90% 94%)`, color: `hsl(${h} 60% 34%)` }}>{ini}</span>
}

// Bo'lim belgilari: L R W
export function SecChips({ s }) {
  return (
    <span className="chips">
      {[['L', 'listening'], ['R', 'reading'], ['W', 'writing']].map(([l, k]) => (
        <i key={k} className={s[`${k}_open`] ? 'on' : s[`${k}_test_id`] ? 'set' : ''} title={`${k}: ${s[`${k}_open`] ? 'ochiq' : s[`${k}_test_id`] ? 'test tanlangan, yopiq' : 'test tanlanmagan'}`}>{l}</i>
      ))}
    </span>
  )
}

export function Status({ status }) {
  const L = { active: 'Faol', draft: 'Qoralama', closed: 'Yopilgan' }
  return <span className={'pill st-' + status}>{status === 'active' && <span className="dot" />}{L[status] || status}</span>
}

// Sahifa aylantirilganda paydo bo'lish
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.adm .sr:not(.on)')
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target) } }), { threshold: 0.08 })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  })
}
