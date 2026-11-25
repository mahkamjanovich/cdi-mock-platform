// Faqat `npm run dev` + ?demo: dizaynni haqiqiy ma'lumotsiz ko'rish uchun namunaviy javoblar.
// Jonli saytda ishlatilmaydi (api.js da import.meta.env.DEV tekshiriladi).

const passage = `The history of the bicycle is longer than most people think. Early two-wheeled machines appeared in Germany in 1817, when Karl Drais built a wooden "running machine" that riders pushed along with their feet.

Pedals arrived several decades later, and by the 1890s the safety bicycle, with two wheels of equal size and a chain drive, had become a common sight in European cities. It gave working people a cheap way to travel to work, and it gave many women a new kind of independence.`

const q = (n, type, prompt, options) => ({ id: 'q' + n, number: n, type, prompt, options })

const tests = {
  reading: {
    parts: [
      { id: 'r1', title: 'Passage 1', body: passage, questions: [
        q(1, 'tfng', 'The first two-wheeled machine had pedals.'),
        q(2, 'tfng', 'The safety bicycle used a chain drive.'),
        q(3, 'mcq', 'Why was the safety bicycle important for working people?', [{ key: 'A', text: 'It was fast' }, { key: 'B', text: 'It was cheap transport' }, { key: 'C', text: 'It was made of wood' }]),
        q(4, 'gap_fill', 'Karl Drais built his machine in ______ .'),
      ] },
      { id: 'r2', title: 'Passage 2', body: passage, questions: [q(5, 'short_answer', 'In which country did early bicycles appear?')] },
      { id: 'r3', title: 'Passage 3', body: passage, questions: [q(6, 'ynng', 'The writer thinks bicycles changed society.')] },
    ],
  },
  listening: {
    audio_path: 'demo-listening.wav',
    parts: [1, 2, 3, 4].map((p) => ({ id: 'l' + p, title: 'Part ' + p, body: '', questions: p === 1 ? [
      q(1, 'gap_fill', 'Questions 1–5\nComplete the notes below.\nWrite ONE WORD AND/OR A NUMBER for each answer.\n\nCity Tour Booking\nName: ______'),
      q(2, 'gap_fill', 'Number of people: ______'),
      q(3, 'gap_fill', 'Tour starts at the ______ gate'),
      q(4, 'gap_fill', 'Price per person: £ ______'),
      q(5, 'gap_fill', 'Bring a ______ in case of rain'),
      q(6, 'mcq', 'What time does the tour start?', [{ key: 'A', text: '9:00' }, { key: 'B', text: '9:30' }, { key: 'C', text: '10:00' }]),
    ] : [
      q(p * 10 - 9, 'gap_fill', 'Name of the hotel: ______'),
      q(p * 10 - 8, 'mcq', 'What time does the tour start?', [{ key: 'A', text: '9:00' }, { key: 'B', text: '9:30' }, { key: 'C', text: '10:00' }]),
    ] })),
  },
  writing: {
    parts: [
      { id: 'w1', title: 'Task 1', min_words: 150, body: 'The chart below shows the number of bicycles sold in three countries between 2000 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.' },
      { id: 'w2', title: 'Task 2', min_words: 250, body: 'Some people think cities should ban cars from their centres. To what extent do you agree or disagree?' },
    ],
  },
}

const state = { listening: 'open', reading: 'open', writing: 'open' }
const demoAttempts = {}

export async function rpc(name, args) {
  await new Promise((r) => setTimeout(r, 350))
  if (name === 'mockp_student_login') {
    if (args.p_code === '0000') return { error: 'invalid_code' }
    return {
      full_name: 'Aziza Karimova', code: '0007', soundcheck_path: '/soundcheck-en.mp3', session_name: 'CDI Mock · 9-noyabr', exam_date: '2026-11-09', start_time: '09:00:00',
      sections: Object.entries(state).map(([section, s]) => ({
        section, has_test: true, open: s !== 'closed',
        status: s === 'submitted' ? 'submitted' : s === 'in_progress' ? 'in_progress' : 'not_started',
      })),
    }
  }
  if (name === 'mockp_get_results') return { hidden: true }
  if (name === 'mockp_start_attempt') {
    state[args.p_section] = 'in_progress'
    return {
      status: 'ok', server_now: new Date().toISOString(),
      attempt: (demoAttempts[args.p_section] ??= { id: 'demo-' + args.p_section, started_at: new Date().toISOString(), deadline_at: new Date(Date.now() + (args.p_section === 'listening' ? 60 : 3600) * 1000).toISOString() }),
      answers: [], writing: [], test: tests[args.p_section],
    }
  }
  if (name === 'mockp_submit') {
    state[args.p_section] = 'submitted'
    return { status: 'submitted' }
  }
  return {}
}
