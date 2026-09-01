'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Scissors, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'

export default function ResetPasswordPage() {
  const { themeMode } = useApp()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const logoUrl = 'https://wldifxcwobyeqbvwatgr.supabase.co/storage/v1/object/public/img/logo.png'

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    
    setLoading(false)
    if (err) {
      setError('Erro ao atualizar senha: ' + err.message)
      return
    }
    setSuccess(true)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-background)', padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img 
            src={logoUrl} 
            alt="Agendei" 
            style={{ width: '100%', maxWidth: 300, height: 'auto', objectFit: 'contain', margin: '0 auto' }} 
          />
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 12 }}>
            Crie sua nova senha de acesso
          </p>
        </div>

        <div className="card">
          {success ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: 60, height: 60, background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={32} color="#059669" />
              </div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 8 }}>Senha alterada!</h2>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
                Sua senha foi redefinida com sucesso. Você já pode acessar o painel.
              </p>
              <button onClick={() => router.push('/auth/login')} className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
                Ir para o Login <ArrowRight size={16} style={{ marginLeft: 8 }}/>
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 24 }}>Nova Senha</h2>

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

              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Nova senha *</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type={showPw ? 'text' : 'password'} required minLength={8}
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="form-input"
                      placeholder="Mínimo 8 caracteres"
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

                <div className="form-group">
                  <label className="form-label">Confirmar nova senha *</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                      type={showPw ? 'text' : 'password'} required
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      className="form-input"
                      placeholder="Repita a nova senha"
                      style={{ paddingLeft: 40, paddingRight: 40 }}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ justifyContent: 'center', marginTop: 8 }}>
                  {loading ? 'Atualizando...' : 'Atualizar senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
