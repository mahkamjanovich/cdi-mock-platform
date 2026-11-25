// Faqat `npm run dev` + ?demo: admin panelni haqiqiy Supabase'siz ko'rish uchun soxta mijoz.
// Jonli saytga kirmaydi (supabase.js da import.meta.env.DEV tekshiriladi).

let seq = 100
const uid = () => 'd' + seq++

const NAMES = ['Aziza Karimova', 'Dilnoza Rahimova', 'Jasur Toshmatov', 'Madina Yusupova', 'Bekzod Aliyev', 'Sardor Qodirov', 'Nilufar Ergasheva',
  'Otabek Nazarov', 'Shahzoda Ismoilova', 'Javohir Mirzayev', 'Kamola Abdullayeva', 'Islom Sobirov']

function makeDb() {
const db = {
  mockp_sessions: [
    { id: 's1', name: 'CDI Mock · 9-noyabr', exam_date: '2026-11-09', start_time: '09:00:00', status: 'active', listening_test_id: 't1', reading_test_id: 't2', writing_test_id: 't3', listening_open: true, reading_open: true, writing_open: false, created_at: '2026-10-20' },
    { id: 's2', name: 'Sinov guruhi B', exam_date: '2026-11-16', start_time: '14:00:00', status: 'draft', listening_test_id: null, reading_test_id: null, writing_test_id: null, listening_open: false, reading_open: false, writing_open: false, created_at: '2026-10-19' },
    { id: 's3', name: 'CDI Mock · 2-noyabr', exam_date: '2026-11-02', start_time: '09:00:00', status: 'closed', listening_test_id: 't1', reading_test_id: 't2', writing_test_id: 't3', listening_open: false, reading_open: false, writing_open: false, created_at: '2026-10-10' },
    { id: 's4', name: 'CDI Mock · 26-oktabr', exam_date: '2026-10-26', start_time: '09:00:00', status: 'closed', listening_test_id: 't1', reading_test_id: null, writing_test_id: null, listening_open: false, reading_open: false, writing_open: false, created_at: '2026-10-01' },
  ],
  mockp_students: [],
  mockp_tests: [
    { id: 't1', section: 'listening', title: 'Listening Test 1', duration_minutes: 31, duration_seconds: 1830, audio_path: 'a.mp3', created_at: '2026-10-01' },
    { id: 't4', section: 'listening', title: 'Listening Test 2', duration_minutes: 40, audio_path: null, created_at: '2026-10-12' },
    { id: 't2', section: 'reading', title: 'Reading Test 3', duration_minutes: 60, audio_path: null, created_at: '2026-10-02' },
    { id: 't3', section: 'writing', title: 'Writing Test 1', duration_minutes: 60, audio_path: null, created_at: '2026-10-03' },
  ],
  mockp_parts: [],
  mockp_questions: [],
  mockp_answer_keys: [],
  mockp_attempts: [],
  mockp_writing_responses: [],
  mockp_writing_scores: [],
  mockp_speaking_scores: [],
  mockp_profiles: [{ user_id: 'u1', role: 'admin', full_name: 'Admin' }],
}

const counts = { s1: 12, s2: 5, s3: 9, s4: 7 }
let k = 0
for (const [sid, n] of Object.entries(counts)) {
  for (let i = 0; i < n; i++) {
    db.mockp_students.push({ id: 'st' + k, session_id: sid, full_name: NAMES[(i + k) % NAMES.length], phone: '+99890' + String(1234567 + k * 37).slice(0, 7), telegram: i % 3 ? null : 'user' + k, code: String(4000 + k * 73).slice(-4), created_at: '2026-10-2' + (i % 9) })
    k++
  }
}
const P = { listening: ['Part', 4], reading: ['Passage', 3], writing: ['Task', 2] }
for (const t of db.mockp_tests) {
  const [lbl, n] = P[t.section]
  for (let i = 1; i <= n; i++) {
    db.mockp_parts.push({ id: `${t.id}p${i}`, test_id: t.id, position: i, title: `${lbl} ${i}`, min_words: t.section === 'writing' ? (i === 1 ? 150 : 250) : null, image_path: null,
      body: t.section === 'writing' ? (i === 1 ? 'The chart below shows the number of bicycles sold in three countries between 2000 and 2020.' : 'Some people think cities should ban cars from their centres. To what extent do you agree or disagree?') : t.section === 'reading' ? 'The history of the bicycle is longer than most people think...' : '' })
  }
  if (t.section !== 'writing') {
    const total = t.id === 't4' ? 18 : 40
    for (let q = 1; q <= total; q++) {
      const id = `${t.id}q${q}`
      const part = Math.min(n, Math.ceil(q / (40 / n)))
      db.mockp_questions.push({ id, test_id: t.id, part_id: `${t.id}p${part}`, number: q, type: q % 3 ? 'gap_fill' : 'tfng', prompt: q % 3 ? 'The museum opens at ______ every day.' : 'The first bicycle had pedals.', options: null })
      db.mockp_answer_keys.push({ question_id: id, accepted: q % 3 ? ['nine', '9'] : ['FALSE'] })
    }
  }
}
// 9-noyabr sessiyasi: Writing urinishlari va baholar
db.mockp_students.filter((s) => s.session_id === 's1').forEach((s, i) => {
  if (i > 8) return
  const a = { id: 'at' + i, student_id: s.id, test_id: 't3', section: 'writing', submitted_at: i < 7 ? '2026-11-09T10:00:00Z' : null }
  db.mockp_attempts.push(a, { id: 'al' + i, student_id: s.id, test_id: 't1', section: 'listening', submitted_at: '2026-11-09T09:40:00Z' })
  db.mockp_writing_responses.push({ attempt_id: a.id, part_id: 't3p1', body: 'The bar chart illustrates how many bicycles were sold in three countries over a twenty-year period. Overall, sales rose in all three nations, although the scale of growth differed considerably. '.repeat(3) },
    { attempt_id: a.id, part_id: 't3p2', body: 'It is often argued that private cars should be banned from city centres. In my opinion, this policy has clear benefits, but it must be introduced carefully. '.repeat(6) })
  if (i < 3) db.mockp_writing_scores.push({ attempt_id: a.id, part_id: 't3p1', task_achievement: 6.5, coherence: 6, lexical: 6.5, grammar: 6, band: 6.5, feedback: i === 0 ? 'Yaxshi umumiy ko\'rinish, lekin taqqoslash kam.' : null, graded_at: '2026-11-09T12:00:00Z' })
  if (i < 6) db.mockp_speaking_scores.push({ student_id: s.id, band: [6, 6.5, 7, 5.5, 6.5, 7.5][i] })
})
return db
}
let _db
const getDb = () => (_db ??= makeDb())

function embed(table, row, select) {
  const db = getDb()
  const out = { ...row }
  if (select.includes('mockp_students(count)')) out.mockp_students = [{ count: db.mockp_students.filter((s) => s.session_id === row.id).length }]
  if (select.includes('mockp_questions(count)')) out.mockp_questions = [{ count: db.mockp_questions.filter((q) => q.test_id === row.id).length }]
  if (select.includes('mockp_sessions!inner')) out.mockp_sessions = db.mockp_sessions.find((s) => s.id === row.session_id)
  return out
}
function getVal(table, row, col) {
  const db = getDb()
  if (col === 'mockp_students.session_id') return db.mockp_students.find((s) => s.id === row.student_id)?.session_id
  if (col === 'mockp_sessions.status') return db.mockp_sessions.find((s) => s.id === row.session_id)?.status
  return row[col]
}

function builder(table) {
  const st = { op: 'select', filters: [], order: [], select: '*', opts: {}, payload: null, single: false, maybe: false }
  const api = {
    select(s = '*', opts = {}) { if (st.op === 'select') { st.select = s; st.opts = opts } else st.returning = true; return api },
    insert(p) { st.op = 'insert'; st.payload = p; return api },
    update(p) { st.op = 'update'; st.payload = p; return api },
    upsert(p, o) { st.op = 'upsert'; st.payload = p; st.conflict = o?.onConflict; return api },
    delete() { st.op = 'delete'; return api },
    eq(c, v) { st.filters.push((r) => String(getVal(table, r, c)) === String(v)); return api },
    neq(c, v) { st.filters.push((r) => String(getVal(table, r, c)) !== String(v)); return api },
    in(c, vs) { st.filters.push((r) => vs.map(String).includes(String(getVal(table, r, c)))); return api },
    not(c, op, v) { st.filters.push((r) => r[c] != null); return api },
    order(c, o = {}) { st.order.push([c, o.ascending !== false]); return api },
    single() { st.single = true; return api },
    maybeSingle() { st.maybe = true; return api },
    then(res, rej) { return Promise.resolve(run()).then(res, rej) },
  }
  function run() {
    const db = getDb()
    const rows = db[table] || (db[table] = [])
    const match = (r) => st.filters.every((f) => f(r))
    if (st.op === 'insert') {
      const list = (Array.isArray(st.payload) ? st.payload : [st.payload]).map((p) => ({ id: uid(), created_at: new Date().toISOString(), ...(table === 'mockp_students' ? { code: String(1000 + Math.floor(Math.random() * 8999)) } : {}), ...(table === 'mockp_sessions' ? { status: 'draft', listening_open: false, reading_open: false, writing_open: false } : {}), ...p }))
      rows.push(...list)
      return { data: st.single ? list[0] : list, error: null }
    }
    if (st.op === 'update') { rows.filter(match).forEach((r) => Object.assign(r, st.payload)); return { data: null, error: null } }
    if (st.op === 'delete') { db[table] = rows.filter((r) => !match(r)); return { data: null, error: null } }
    if (st.op === 'upsert') {
      const keys = (st.conflict || (table === 'mockp_settings' ? 'key' : 'id')).split(',')
      const p = st.payload
      const ex = rows.find((r) => keys.every((kk) => String(r[kk]) === String(p[kk])))
      if (table === 'mockp_writing_scores') p.band = Math.round(((p.task_achievement + p.coherence + p.lexical + p.grammar) / 4) * 2) / 2
      if (ex) Object.assign(ex, p); else rows.push({ id: uid(), ...p })
      return { data: null, error: null }
    }
    let out = rows.filter(match)
    for (const [c, asc] of [...st.order].reverse()) out = [...out].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1))
    if (st.opts.head) return { data: null, count: out.length, error: null }
    out = out.map((r) => embed(table, r, st.select))
    if (st.single) return out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'not found' } }
    if (st.maybe) return { data: out[0] ?? null, error: null }
    return { data: out, error: null }
  }
  return api
}

function sessionResults(sid) {
  const db = getDb()
  return db.mockp_students.filter((s) => s.session_id === sid).map((s, i) => {
    const w = db.mockp_attempts.find((a) => a.student_id === s.id && a.section === 'writing')
    const sc = w ? db.mockp_writing_scores.filter((x) => x.attempt_id === w.id) : []
    const wb = sc.length ? Math.floor(sc.reduce((t, x) => t + x.band, 0)) / 2 : null
    const sp = db.mockp_speaking_scores.find((x) => x.student_id === s.id)?.band ?? null
    const started = i < 9
    const lb = started ? [6, 6.5, 7, 7.5, 5.5, 8, 6.5, 7, 6][i] : null
    const rb = started ? [6.5, 7, 6, 7.5, 6, 7.5, 7, 6.5, 5.5][i] : null
    const all = [lb, rb, wb, sp]
    return {
      student_id: s.id, full_name: s.full_name, code: s.code, phone: s.phone, telegram: s.telegram,
      listening_status: started ? 'submitted' : 'not_started', listening_raw: started ? 22 + i * 2 : null, listening_band: lb,
      reading_status: started ? 'submitted' : 'not_started', reading_raw: started ? 24 + i : null, reading_band: rb,
      writing_status: !w ? 'not_started' : w.submitted_at ? 'submitted' : 'in_progress',
      writing_task1: sc.find((x) => x.part_id === 't3p1')?.band ?? null, writing_task2: sc.find((x) => x.part_id === 't3p2')?.band ?? null, writing_band: wb,
      speaking_band: sp, overall: all.every((x) => x != null) ? Math.round((all.reduce((a, b) => a + b, 0) / 4) * 2) / 2 : null,
    }
  })
}

const session = { user: { id: 'u1', email: 'admin@gmail.com' } }
export const demoSupabase = {
  from: builder,
  rpc: async (name, args) => {
    if (name === 'mockp_session_results') return { data: sessionResults(args.p_session), error: null }
    if (name === 'mockp_get_design') { const v = (getDb().mockp_settings || []).find((x) => x.key === 'design')?.value; return { data: v ? JSON.parse(v) : {}, error: null } }
    if (name === 'mockp_gen_code') return { data: String(1000 + Math.floor(Math.random() * 8999)), error: null }
    return { data: null, error: null }
  },
  auth: {
    getSession: async () => ({ data: { session } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
  },
  storage: {
    from: () => ({
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      createSignedUrl: async () => ({ data: { signedUrl: '' } }),
      upload: async () => ({ error: null }),
      remove: async () => ({ error: null }),
    }),
  },
}
