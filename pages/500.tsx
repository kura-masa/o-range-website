export default function Custom500() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#EA580C', marginBottom: '0.5rem' }}>サーバーエラー</h1>
      <p style={{ color: '#4B5563' }}>
        予期せぬエラーが発生しました。少し待ってから再度お試しください。
      </p>
    </main>
  )
}
