// Uchburchak kursor: faqat aniq ko'rsatkich (sichqoncha) bor qurilmalarda. Ranglar va o'lcham temadan (--cur-*).
// Matn maydonlarida tizimning oddiy matn kursori qoladi.
const HOVER = 'a, button, [role="button"], summary, select, label, .click, tr.click, .opt, .drop, input[type="checkbox"], input[type="radio"], input[type="range"], input[type="file"]'
const TEXT = 'input:not([type="checkbox"], [type="radio"], [type="range"], [type="file"]), textarea, [contenteditable="true"]'

export function initCursor() {
  if (!window.matchMedia?.('(pointer: fine)').matches) return
  const el = document.createElement('div')
  el.className = 'tc'
  el.setAttribute('aria-hidden', 'true')
  el.innerHTML = '<svg viewBox="0 0 28 28"><path d="M6 4.5 L23.5 12.5 L11.5 23 Z"/></svg>'
  document.body.appendChild(el)
  document.documentElement.classList.add('has-tc')

  // Kechikishsiz: har harakatda to'g'ridan-to'g'ri joylashadi (animatsiya yoki "dum" yo'q)
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return
    el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
    const t = e.target instanceof Element ? e.target : null
    const overText = !!t?.closest(TEXT)
    el.classList.toggle('on', !overText)
    el.classList.toggle('hover', !overText && !!t?.closest(HOVER))
  }, { passive: true })
  addEventListener('pointerdown', () => el.classList.add('down'), { passive: true })
  addEventListener('pointerup', () => el.classList.remove('down'), { passive: true })
  document.documentElement.addEventListener('pointerleave', () => el.classList.remove('on'))
  addEventListener('blur', () => el.classList.remove('on'))
}
