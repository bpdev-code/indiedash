export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <a href="/" className="text-xl font-bold tracking-wider">
            INDIE<span style={{ color: 'var(--accent)' }}>DASH</span>
          </a>
        </div>
        {children}
      </div>
    </div>
  )
}
