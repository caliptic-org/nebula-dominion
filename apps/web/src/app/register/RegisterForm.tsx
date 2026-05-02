'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  function validate() {
    if (values.username.length < 3) return 'Kullanıcı adı en az 3 karakter olmalı'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return 'Geçerli bir e-posta gir'
    if (values.password.length < 8) return 'Şifre en az 8 karakter olmalı'
    if (values.password !== values.confirmPassword) return 'Şifreler eşleşmiyor'
    return null
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          password: values.password,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? 'Kayıt başarısız. Tekrar dene.')
      }

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Kayıt formu">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              background: 'rgba(232,64,48,0.12)',
              border: '1px solid rgba(232,64,48,0.35)',
              color: 'var(--color-danger)',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div>
          <label htmlFor="username" className="form-label">Komutan Adı</label>
          <input
            id="username"
            type="text"
            name="username"
            className="form-input"
            placeholder="komutan_nova"
            autoComplete="username"
            required
            minLength={3}
            maxLength={32}
            value={values.username}
            onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="reg-email" className="form-label">E-posta</label>
          <input
            id="reg-email"
            type="email"
            name="email"
            className="form-input"
            placeholder="komutan@galaksi.com"
            autoComplete="email"
            required
            value={values.email}
            onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="reg-password" className="form-label">Şifre</label>
          <input
            id="reg-password"
            type="password"
            name="password"
            className="form-input"
            placeholder="En az 8 karakter"
            autoComplete="new-password"
            required
            minLength={8}
            value={values.password}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="form-label">Şifre Tekrar</label>
          <input
            id="confirm-password"
            type="password"
            name="confirmPassword"
            className="form-input"
            placeholder="Şifreni tekrar gir"
            autoComplete="new-password"
            required
            value={values.confirmPassword}
            onChange={(e) => setValues((v) => ({ ...v, confirmPassword: e.target.value }))}
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{ marginTop: 4, width: '100%' }}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <span
                className="inline-block w-4 h-4 rounded-full animate-spin"
                style={{ border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#1a0e00' }}
                aria-hidden
              />
              Hesap oluşturuluyor…
            </>
          ) : (
            '🛸 HESAP OLUŞTUR'
          )}
        </button>
      </div>
    </form>
  )
}
