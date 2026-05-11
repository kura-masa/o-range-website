// Google Analytics 4 のカスタムイベント送信ヘルパー
// gtag が読み込まれていない環境（dev/IDなし）では何もしない

type GtagEventParams = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    gtag?: (command: 'event', action: string, params?: GtagEventParams) => void
  }
}

export function trackEvent(action: string, params?: GtagEventParams) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  window.gtag('event', action, params)
}
