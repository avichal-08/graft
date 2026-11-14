'use client'

// flips light and dark; the choice beats the os setting both ways
export function ThemeToggle() {
  const flip = () => {
    const root = document.documentElement
    const dark = matchMedia('(prefers-color-scheme: dark)').matches
    const cur = root.dataset.theme ?? (dark ? 'dark' : 'light')
    root.dataset.theme = cur === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem('graft-theme', root.dataset.theme)
    } catch {}
  }
  return (
    <button className="theme" type="button" onClick={flip}>
      theme
    </button>
  )
}
