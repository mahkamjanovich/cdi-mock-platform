import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, configured } from '../supabase'
import { errMsg, formatDate } from '../lib'
import { Logo, Loading, ModeSwitch } from '../ui.jsx'
import { AuthLayout } from '../auth.jsx'
import { Icon, Toasts, LangSwitch } from './kit.jsx'
import { startI18n, t } from './i18n.js'
import Sessions from './Sessions.jsx'
import SessionDetail from './SessionDetail.jsx'
import TestLibrary from './TestLibrary.jsx'
import TestEditor from './TestEditor.jsx'
import Results from './Results.jsx'
import Grading from './Grading.jsx'
import Settings from './Settings.jsx'
import './admin.css'

startI18n()

const BRAND = 'with-mamadaliyev'
const MODE_LABELS = ['Kunduzgi rejim', 'Tungi rejim']
const PAGES = {
  sessions: ['Sessiyalar', 'sessions'],
  listening: ['Listening', 'listening'],
  reading: ['Reading', 'reading'],
  writing: ['Writing', 'writing'],
  grading: ['Baholash', 'grading'],
  results: ['Natijalar', 'results'],
  settings: ['Sozlamalar', 'settings'],
}
const NAV_ADMIN = [[null, ['sessions']], ['Testlar kutubxonasi', ['listening', 'reading', 'writing']], ['Natijalar', ['grading', 'results']], ['Tizim', ['settings']]]
const NAV_TEACHER = [[null, ['grading']]]
const ROLE_LABEL = { admin: 'Admin', teacher: "O'qituvchi", writing_teacher: 'Writing tekshiruvchi', speaking_teacher: 'Speaking tekshiruvchi' }

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setErr('Email yoki parol noto\'g\'ri.')
    setBusy(false)
  }

  return (
    <AuthLayout name={BRAND} title="Xodimlar paneli" lead="Sessiyalar, testlar, baholash va natijalar: hammasi bir joyda.">
      <form onSubmit={submit} className="reveal">
        <div className="lang-corner"><ModeSwitch labels={MODE_LABELS} /><LangSwitch /></div>
        <h2>Panelga kirish</h2>
        <p className="sub">Admin yoki tekshiruvchi hisobingiz bilan kiring</p>
        <div>
          <label htmlFor="em">Email</label>
          <input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div style={{ marginTop: 14 }}>
          <label htmlFor="pw">Parol</label>
          <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <div className="err">{err}</div>}
        <button type="submit" disabled={busy}>{busy ? 'Kirilmoqda...' : 'Kirish'}</button>
      </form>
    </AuthLayout>
  )
}

function Message({ children, onSignOut }) {
  return (
    <div className="center-page">
      <div className="done-card">
        <p>{children}</p>
        {onSignOut && <button className="ghost" onClick={onSignOut}>Chiqish</button>}
      </div>
    </div>
  )
}

// Ctrl+K: sahifalar, sessiyalar va testlar bo'yicha tezkor qidiruv
function Palette({ pages, onGo, onClose }) {
  const [q, setQ] = useState('')
  const [extra, setExtra] = useState([])
  const [i, setI] = useState(0)
  const listRef = useRef(null)
  useEffect(() => {
    Promise.all([
      supabase.from('mockp_sessions').select('id, name, exam_date').order('exam_date', { ascending: false }),
      pages.includes('listening') ? supabase.from('mockp_tests').select('id, section, title').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
    ]).then(([s, t]) => setExtra([
      ...(pages.includes('sessions') ? (s.data || []).map((x) => ({ key: 's' + x.id, label: x.name, hint: `Sessiya · ${formatDate(x.exam_date)}`, icon: 'sessions', go: { page: 'sessions', sessionId: x.id } })) : []),
      ...(t.data || []).map((x) => ({ key: 't' + x.id, label: x.title || x.section, hint: `${PAGES[x.section][0]} testi`, icon: x.section, go: { page: x.section, testId: x.id } })),
    ]))
  }, [])
  const items = useMemo(() => {
    const base = [
      ...(pages.includes('sessions') ? [{ key: 'new', label: 'Yangi sessiya yaratish', hint: 'Amal', icon: 'plus', go: { page: 'sessions', create: true } }] : []),
      ...pages.map((p) => ({ key: p, label: PAGES[p][0], hint: 'Bo\'lim', icon: PAGES[p][1], go: { page: p } })),
      ...extra,
    ]
    const s = q.trim().toLowerCase()
    return (s ? base.filter((x) => [x.label, x.hint, t(x.label), t(x.hint)].join(' ').toLowerCase().includes(s)) : base).slice(0, 9)
  }, [q, extra])
  useEffect(() => setI(0), [q])
  function key(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(items.length - 1, x + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)) }
    if (e.key === 'Enter' && items[i]) onGo(items[i].go)
    if (e.key === 'Escape') onClose()
  }
  return (
    <div className="ov ov-top" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-label="Qidiruv">
        <div className="pal-in"><Icon name="search" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} placeholder="Sessiya, test yoki bo'lim qidiring..." /><kbd>Esc</kbd></div>
        <ul ref={listRef}>
          {items.map((x, n) => (
            <li key={x.key} className={n === i ? 'on' : ''} onMouseEnter={() => setI(n)} onClick={() => onGo(x.go)}>
              <Icon name={x.icon} /> {x.label} <span>{x.hint}</span>
            </li>
          ))}
          {items.length === 0 && <li className="none">Hech narsa topilmadi</li>}
        </ul>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const [auth, setAuth] = useState(undefined) // undefined: yuklanmoqda, null: kirmagan
  const [profile, setProfile] = useState(undefined)
  const [sessionId, setSessionId] = useState(null)
  const [page, setPage] = useState('sessions')
  const [testId, setTestId] = useState(null)
  const [create, setCreate] = useState(false)
  const [profileErr, setProfileErr] = useState('')
  const [pal, setPal] = useState(false)
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const bar = useRef(null)

  useEffect(() => { document.title = `${BRAND} · panel` }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuth(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setAuth(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!auth) { setProfile(auth === null ? null : undefined); return }
    supabase.from('mockp_profiles').select('role, full_name').eq('user_id', auth.user.id).maybeSingle()
      .then(({ data, error }) => { setProfileErr(error ? errMsg(error) : ''); setProfile(data) })
  }, [auth])

  // Yuqori panel soyasi va o'qish progressi
  useEffect(() => {
    const f = () => {
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight
      setScrolled(y > 8)
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`
    }
    addEventListener('scroll', f, { passive: true })
    return () => removeEventListener('scroll', f)
  }, [])

  useEffect(() => {
    const f = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPal((v) => !v) } }
    addEventListener('keydown', f)
    return () => removeEventListener('keydown', f)
  }, [])

  const signOut = () => supabase.auth.signOut()
  const go = ({ page: p, sessionId: s = null, testId: t = null, create: c = false }) => {
    setPage(p); setSessionId(s); setTestId(t); setCreate(c); setPal(false); setMenu(false); scrollTo({ top: 0 })
  }

  if (!configured) {
    return <Message>.env faylida VITE_SUPABASE_ANON_KEY qo'yilmagan. Supabase → Project Settings → API bo'limidagi publishable (anon) kalitni qo'ying va qayta ishga tushiring.</Message>
  }
  if (auth === undefined) return <Loading />
  if (auth === null) return <Login />
  if (profile === undefined) return <Loading />
  if (!profile) return <Message onSignOut={signOut}>Bu hisobga panel roli berilmagan. {profileErr}</Message>
  const isAdmin = profile.role === 'admin'
  const nav = isAdmin ? NAV_ADMIN : NAV_TEACHER
  const pages = nav.flatMap(([, list]) => list)
  const current = isAdmin ? page : 'grading'
  const crumbs = [PAGES[current][0], sessionId ? 'Sessiya' : testId ? 'Test' : null].filter(Boolean)
  const who = profile.full_name || auth.user.email

  return (
    <div className="adm">
      <div className="progress" ref={bar} />
      <aside className={'side' + (menu ? ' open' : '')}>
        <div className="side-brand"><Logo name={BRAND} /></div>
        <nav>
          {nav.map(([group, list]) => (
            <div key={group || 'main'}>
              {group && <div className="grp">{group}</div>}
              {list.map((k) => (
                <a key={k} href="#" className={current === k ? 'on' : ''} onClick={(e) => { e.preventDefault(); go({ page: k }) }}>
                  <Icon name={PAGES[k][1]} /> {PAGES[k][0]}{['listening', 'reading', 'writing'].includes(k) && <small>testlari</small>}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-me">
          <span className="ava">{who[0].toUpperCase()}</span>
          <div><b>{ROLE_LABEL[profile.role] || "O'qituvchi"}</b><small>{auth.user.email}</small></div>
          <button className="icon-btn" onClick={signOut} title="Chiqish" aria-label="Chiqish"><Icon name="logout" /></button>
        </div>
      </aside>
      {menu && <div className="side-bg" onClick={() => setMenu(false)} />}

      <main className="main">
        <header className={'top no-print' + (scrolled ? ' scrolled' : '')}>
          <button className="icon-btn burger" onClick={() => setMenu(true)} aria-label="Menyu"><Icon name="menu" /></button>
          <div className="crumbs">
            <span>Panel</span>
            {crumbs.map((c, n) => <span key={c}>{n === crumbs.length - 1 ? <b>{c}</b> : <a href="#" onClick={(e) => { e.preventDefault(); go({ page: current }) }}>{c}</a>}</span>)}
          </div>
          <button className="cmd" onClick={() => setPal(true)}><Icon name="search" size={16} /> <span>Qidirish</span><kbd>Ctrl K</kbd></button>
          <ModeSwitch labels={MODE_LABELS} />
          <LangSwitch />
        </header>
        <div className="content" key={current + (sessionId || '') + (testId || '')}>
          {current === 'sessions' && (sessionId
            ? <SessionDetail id={sessionId} onBack={() => go({ page: 'sessions' })} />
            : <Sessions onOpen={(id) => go({ page: 'sessions', sessionId: id })} create={create} onCreateClose={() => setCreate(false)} />)}
          {['listening', 'reading', 'writing'].includes(current) && (testId
            ? <TestEditor key={testId} testId={testId} onBack={() => go({ page: current })} />
            : <TestLibrary key={current} section={current} onOpen={(id) => go({ page: current, testId: id })} />)}
          {current === 'results' && <Results />}
          {current === 'grading' && <Grading userId={auth.user.id} role={profile.role} />}
          {current === 'settings' && <Settings />}
        </div>
      </main>
      {pal && <Palette pages={pages} onGo={go} onClose={() => setPal(false)} />}
      <Toasts />
    </div>
  )
}
