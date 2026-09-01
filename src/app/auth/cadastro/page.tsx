'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Scissors, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').substring(0, 11)
  let res = d
  if (d.length > 2) res = `(${d.substring(0, 2)}) ${d.substring(2)}`
  if (d.length > 6 && d.length <= 10) res = `(${d.substring(0, 2)}) ${d.substring(2, 6)}-${d.substring(6)}`
  if (d.length > 10) res = `(${d.substring(0, 2)}) ${d.substring(2, 7)}-${d.substring(7)}`
  return res
}

function formatDoc(v: string) {
  const d = v.replace(/\D/g, '').substring(0, 14)
  if (d.length <= 11) {
    let res = d
    if (d.length > 3) res = `${d.substring(0, 3)}.${d.substring(3)}`
    if (d.length > 6) res = `${d.substring(0, 3)}.${d.substring(3, 6)}.${d.substring(6)}`
    if (d.length > 9) res = `${d.substring(0, 3)}.${d.substring(3, 6)}.${d.substring(6, 9)}-${d.substring(9)}`
    return res
  } else {
    let res = d
    if (d.length > 2) res = `${d.substring(0, 2)}.${d.substring(2)}`
    if (d.length > 5) res = `${d.substring(0, 2)}.${d.substring(2, 5)}.${d.substring(5)}`
    if (d.length > 8) res = `${d.substring(0, 2)}.${d.substring(2, 5)}.${d.substring(5, 8)}/${d.substring(8)}`
    if (d.length > 12) res = `${d.substring(0, 2)}.${d.substring(2, 5)}.${d.substring(5, 8)}/${d.substring(8, 12)}-${d.substring(12)}`
    return res
  }
}

function formatCep(v: string) {
  const d = v.replace(/\D/g, '').substring(0, 8)
  if (d.length > 5) return `${d.substring(0, 5)}-${d.substring(5)}`
  return d
}

function validateDoc(doc: string) {
  const d = doc.replace(/\D/g, '')
  if (d.length === 11) {
    if (/^(\d)\1+$/.test(d)) return false
    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i)
    let r = (sum * 10) % 11
    if (r === 10 || r === 11) r = 0
    if (r !== parseInt(d[9])) return false
    sum = 0
    for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i)
    r = (sum * 10) % 11
    if (r === 10 || r === 11) r = 0
    return r === parseInt(d[10])
  }
  if (d.length === 14) {
    if (/^(\d)\1+$/.test(d)) return false
    const calc = (nums: string, weights: number[]) => {
      let s = 0
      for (let i = 0; i < weights.length; i++) s += parseInt(nums[i]) * weights[i]
      const r = s % 11
      return r < 2 ? 0 : 11 - r
    }
    const w1 = [5,4,3,2,9,8,7,6,5,4,3,2]
    const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2]
    if (calc(d, w1) !== parseInt(d[12])) return false
    return calc(d, w2) === parseInt(d[13])
  }
  return false
}

export default function CadastroPage() {
  const { themeMode } = useApp()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  const logoUrl = themeMode === 'dark'
    ? 'https://wldifxcwobyeqbvwatgr.supabase.co/storage/v1/object/public/img/logo.png'
    : 'https://wldifxcwobyeqbvwatgr.supabase.co/storage/v1/object/public/img/logopb.png'

  const [form, setForm] = useState({
    nome: '', documento: '', telefone: '', email: '', senha: '',
    endereco: '', cidade: '', estado: '', cep: '',
    horario_abertura: '08:00', horario_fechamento: '18:00',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const docDigits = form.documento.replace(/\D/g, '')
  const docValid = docDigits.length >= 11 && validateDoc(form.documento)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docValid) { setError('Documento inválido. Informe um CPF ou CNPJ válido.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email, password: form.senha,
      options: { data: { nome: form.nome } }
    })
    if (authErr) { setError(authErr.message); setLoading(false); return }

    if (authData.user) {
      // Se não houver sessão, o Supabase enviou e-mail de confirmação
      if (!authData.session) {
        setLoading(false)
        alert('Cadastro realizado com sucesso! Enviamos um link de confirmação para ' + form.email + '. Por favor, verifique sua caixa de entrada (e spam) para ativar sua conta.')
        router.push('/')
        return
      }

      // Se houver sessão (e-mail automático), cria ou atualiza a empresa
      const d = docDigits
      const { error: empErr } = await supabase.from('empresas').upsert({
        nome: form.nome, documento: d,
        tipo_documento: d.length === 11 ? 'cpf' : 'cnpj',
        telefone: form.telefone, email: form.email,
        endereco: form.endereco, cidade: form.cidade,
        estado: form.estado, cep: form.cep,
        horario_abertura: form.horario_abertura,
        horario_fechamento: form.horario_fechamento,
        dias_funcionamento: [1,2,3,4,5,6],
        tema: 'light', paleta: 'violet',
        owner_id: authData.user.id
      }, { onConflict: 'documento' })
      
      if (empErr) { 
        console.error('Erro ao criar/atualizar empresa no Supabase:', empErr)
        setError('Houve um erro ao salvar os dados completos do salão: ' + empErr.message)
        setLoading(false)
        return 
      }
    }
    router.push('/dashboard')
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome?.trim() || !form.telefone?.trim()) {
      setError('Nome do salão e telefone são obrigatórios.')
      return
    }
    setError('')
    setStep(2)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-background)', padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ textAlign: 'center', marginBottom: 32, cursor: 'pointer' }}>
            <img 
              src={logoUrl} 
              alt="Agendei" 
              style={{ width: '100%', maxWidth: 300, height: 'auto', objectFit: 'contain', margin: '0 auto' }} 
            />
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 12 }}>
              Cadastre seu salão em minutos
            </p>
          </div>
        </Link>

        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: step >= s ? 'var(--color-gradient)' : 'var(--color-border)',
                color: step >= s ? 'white' : 'var(--color-text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, transition: 'all 0.3s'
              }}>
                {step > s ? <CheckCircle size={16} /> : s}
              </div>
              <span style={{ fontSize: 13, color: step >= s ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: step >= s ? 600 : 400 }}>
                {s === 1 ? 'Dados do Salão' : 'Acesso'}
              </span>
              {s < 2 && <div style={{ width: 40, height: 2, background: step > s ? 'var(--color-primary)' : 'var(--color-border)', borderRadius: 99 }} />}
            </div>
          ))}
        </div>

        <div className="card">
          {error && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#FEE2E2', color: '#991B1B', padding: '12px 14px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
              <AlertCircle size={16} />{error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 4 }}>Dados do seu estabelecimento</h2>

              <div className="form-group">
                <label className="form-label">Nome do Salão *</label>
                <input className="form-input" required value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Studio Hair & Beauty" />
              </div>

              <div className="form-group">
                <label className="form-label">CPF ou CNPJ *</label>
                <input
                  className="form-input"
                  required value={form.documento}
                  onChange={e => set('documento', formatDoc(e.target.value))}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  maxLength={18}
                  style={{ borderColor: form.documento && !docValid ? '#DC2626' : undefined }}
                />
                {form.documento && (
                  <span style={{ fontSize: 12, color: docValid ? '#059669' : '#DC2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {docValid ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {docValid ? 'Documento válido' : 'Documento inválido'}
                  </span>
                )}
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Telefone *</label>
                  <input className="form-input" required value={form.telefone} onChange={e => set('telefone', formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
                </div>
                <div className="form-group">
                  <label className="form-label">CEP</label>
                  <input className="form-input" value={form.cep} onChange={e => set('cep', formatCep(e.target.value))} placeholder="00000-000" maxLength={9} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Endereço</label>
                <input className="form-input" value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, bairro" />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Cidade</label>
                  <input className="form-input" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-input form-select" value={form.estado} onChange={e => set('estado', e.target.value)}>
                    <option value="">Selecione</option>
                    {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Abre às</label>
                  <input type="time" className="form-input" value={form.horario_abertura} onChange={e => set('horario_abertura', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha às</label>
                  <input type="time" className="form-input" value={form.horario_fechamento} onChange={e => set('horario_fechamento', e.target.value)} />
                </div>
              </div>

              <button type="submit" disabled={!docValid} className="btn btn-primary" style={{ marginTop: 8, justifyContent: 'center' }}>
                Próximo
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h2 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 4 }}>Dados de acesso</h2>

              <div className="form-group">
                <label className="form-label">E-mail *</label>
                <input type="email" className="form-input" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" />
              </div>

              <div className="form-group">
                <label className="form-label">Senha *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-input" required minLength={8}
                    value={form.senha} onChange={e => set('senha', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer'
                  }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setStep(1)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  Voltar
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                  {loading ? 'Cadastrando...' : 'Criar minha conta'}
                </button>
              </div>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--color-text-muted)' }}>
            Já tem conta?{' '}
            <Link href="/auth/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

