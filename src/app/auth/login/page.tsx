'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'

export default function LoginPage() {
  const { themeMode } = useApp()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const logoUrl = themeMode === 'dark'
    ? 'https://wldifxcwobyeqbvwatgr.supabase.co/storage/v1/object/public/img/logo.png'
    : 'https://wldifxcwobyeqbvwatgr.supabase.co/storage/v1/object/public/img/logopb.png'
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError('E-mail ou senha inválidos.'); setLoading(false); return }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('just_logged_in', 'true')
    }
    router.push('/dashboard')
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Informe seu e-mail para redefinir a senha.'); return }
    setResetLoading(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setResetLoading(false)
    if (err) { setError('Erro ao enviar e-mail. Verifique o endereço e tente novamente.'); return }
    setResetSent(true)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-background)', padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo — link to landing page */}
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ textAlign: 'center', marginBottom: 32, cursor: 'pointer' }}>
            <img 
              src={logoUrl} 
              alt="Agendei" 
              style={{ width: '100%', maxWidth: 300, height: 'auto', objectFit: 'contain', margin: '0 auto' }} 
            />
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 12 }}>
              Acesse o painel do seu salão
            </p>
          </div>
        </Link>

        <div className="card">
          {mode === 'login' ? (
            <>
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 24 }}>Entrar</h2>

              {error && (
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  background: '#FEE2E2', color: '#991B1B',
                  padding: '12px 14px', borderRadius: 10, marginBottom: 16, fontSize: 14
                }}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <div className="search-input-wrapper">
                    <Mail size={16} className="search-icon" />
                    <input
                      type="email" required
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="form-input"
                      placeholder="seu@email.com"
                      style={{ paddingLeft: 40 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Senha</label>
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setError('') }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type={showPw ? 'text' : 'password'} required
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="form-input"
                      placeholder="Sua senha"
                      style={{ paddingLeft: 40, paddingRight: 40 }}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer'
                    }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: 4 }}>
                  {loading ? 'Entrando...' : 'Entrar no painel'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--color-text-muted)' }}>
                Não tem conta?{' '}
                <Link href="/auth/cadastro" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  Cadastre seu salão
                </Link>
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => { setMode('login'); setError(''); setResetSent(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: 14, cursor: 'pointer', marginBottom: 20 }}
              >
                <ArrowLeft size={16} /> Voltar ao login
              </button>

              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 8 }}>Redefinir senha</h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 24 }}>
                Informe seu e-mail e enviaremos um link para criar uma nova senha.
              </p>

              {error && (
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  background: '#FEE2E2', color: '#991B1B',
                  padding: '12px 14px', borderRadius: 10, marginBottom: 16, fontSize: 14
                }}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {resetSent ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  padding: '24px 16px', background: '#D1FAE5', borderRadius: 12, textAlign: 'center'
                }}>
                  <CheckCircle size={40} color="#059669" />
                  <div>
                    <div style={{ fontWeight: 700, color: '#065F46', fontSize: 16 }}>E-mail enviado!</div>
                    <div style={{ fontSize: 14, color: '#065F46', marginTop: 4 }}>
                      Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para redefinir sua senha.
                    </div>
                  </div>
                  <button onClick={() => { setMode('login'); setResetSent(false) }} className="btn btn-primary btn-sm">
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">E-mail cadastrado</label>
                    <div className="search-input-wrapper">
                      <Mail size={16} className="search-icon" />
                      <input
                        type="email" required
                        value={email} onChange={e => setEmail(e.target.value)}
                        className="form-input"
                        placeholder="seu@email.com"
                        style={{ paddingLeft: 40 }}
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={resetLoading} className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
                    {resetLoading ? 'Enviando...' : 'Enviar link de redefinição'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--color-text-muted)' }}>
          É cliente?{' '}
          <Link href="/cliente" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            Acessar área de agendamento
          </Link>
        </p>
      </div>
    </div>
  )
}
