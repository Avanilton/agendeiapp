'use client'
import { useState, useCallback, useEffect } from 'react'
import { Moon, Sun, Save, CheckCircle, ExternalLink, Mail, HelpCircle, Book, Video, Camera, Upload, User, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { useApp } from '@/contexts/AppContext'
import { allPalettes, paletteLabels, getThemeConfig } from '@/lib/theme'
import { createClient } from '@/lib/supabase/client'
import PixConfiguracao from '@/components/PixConfiguracao'
import type { ColorPalette, ThemeMode } from '@/lib/types'

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

export default function ConfiguracoesPage() {
  const { palette, setPalette, themeMode, setThemeMode, empresa, setEmpresa, saveTheme, loading } = useApp()
  const [activeSection, setActiveSection] = useState('aparencia')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'logo' | 'perfil' | null>(null)

  const [contaForm, setContaForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    documento: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
  })

  // Update form when empresa loads
  useEffect(() => {
    if (empresa) {
      setContaForm({
        nome: empresa.nome || '',
        telefone: empresa.telefone || '',
        email: empresa.email || '',
        documento: empresa.documento || '',
        endereco: empresa.endereco || '',
        cidade: empresa.cidade || '',
        estado: empresa.estado || '',
        cep: empresa.cep || '',
      })
    }
  }, [empresa])

  const handleSaveTheme = useCallback(async () => {
    setSaving(true)
    await saveTheme(palette, themeMode)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
  }, [palette, themeMode, saveTheme])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'perfil') => {
    const file = e.target.files?.[0]
    if (!file || !empresa) return

    setUploading(type)
    const supabase = createClient()
    
    // Obter usuário logado para o caminho (ajuda no RLS)
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || 'public'

    const fileExt = file.name.split('.').pop()
    const fileName = `${type}-${Math.random()}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('agendei_storage')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('agendei_storage')
        .getPublicUrl(filePath)

      const field = type === 'logo' ? 'logo_url' : 'foto_perfil_url'
      const { error: updateError } = await supabase
        .from('empresas')
        .update({ [field]: publicUrl })
        .eq('id', empresa.id)

      if (updateError) {
        if (updateError.message.includes('column')) {
          alert(`Atenção: A coluna '${field}' não foi encontrada na tabela 'empresas'. Por favor, adicione-a no Supabase.`);
        }
        throw updateError
      }

      setEmpresa({ ...empresa, [field]: publicUrl })
    } catch (err: any) {
      console.error('Erro no upload:', err)
      alert('Erro ao subir imagem: ' + err.message)
    } finally {
      setUploading(null)
    }
  }

  const handleSaveConta = useCallback(async () => {
    if (!empresa) {
      alert('Erro: Dados da empresa não carregados.')
      return
    }
    
    // Validação básica
    if (!contaForm.nome?.trim()) {
      alert('O nome do salão é obrigatório.')
      return
    }
    if (!contaForm.telefone?.trim()) {
      alert('O telefone é obrigatório.')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const docDigits = contaForm.documento.replace(/\D/g, '')
      
      const payload = {
        nome: contaForm.nome.trim(),
        telefone: contaForm.telefone.trim(),
        email: contaForm.email.trim() || null,
        documento: docDigits || null,
        tipo_documento: docDigits.length >= 11 ? (docDigits.length === 11 ? 'cpf' : 'cnpj') : null,
        endereco: contaForm.endereco?.trim() || null,
        cidade: contaForm.cidade?.trim() || null,
        estado: contaForm.estado || null,
        cep: contaForm.cep?.trim() || null,
      }

      console.log('Salvando dados da conta:', payload)
      const { data, error } = await supabase
        .from('empresas')
        .update(payload)
        .eq('id', empresa.id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao salvar no Supabase:', error)
        alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`)
      } else if (data) {
        console.log('Dados salvos com sucesso:', data)
        setEmpresa(data)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err)
      alert('Ocorreu um erro inesperado ao salvar.')
    } finally {
      setSaving(false)
    }
  }, [empresa, contaForm, setEmpresa])

  const handleSave = activeSection === 'conta' ? handleSaveConta : (activeSection === 'aparencia' ? handleSaveTheme : undefined)

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Personalize o sistema do seu salão</p>
        </div>
        {handleSave && (
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saved ? <><CheckCircle size={16}/> Salvo!</> : saving ? 'Salvando…' : <><Save size={16}/> Salvar alterações</>}
          </button>
        )}
      </div>

      <div className="settings-layout">
        {/* Sidebar nav */}
        <div className="card" style={{ padding: 8, alignSelf: 'start' }}>
          {[
            { key: 'aparencia', label: '🎨 Aparência' },
            { key: 'pix', label: '💳 Configurar PIX' },
            { key: 'horarios', label: '🕐 Horários' },
            { key: 'notificacoes', label: '🔔 Notificações' },
            { key: 'conta', label: '👤 Conta' },
            { key: 'ajuda', label: '❓ Ajuda & Suporte' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 12px', borderRadius: 10, border: 'none',
                background: activeSection === s.key ? 'var(--color-primary-light)' : 'transparent',
                color: activeSection === s.key ? 'var(--color-primary)' : 'var(--color-text)',
                fontWeight: activeSection === s.key ? 700 : 500,
                fontSize: 14, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {/* PIX */}
          {activeSection === 'pix' && (
            loading ? (
              <div className="skeleton" style={{ height: 400, borderRadius: 16 }}/>
            ) : empresa ? (
              <PixConfiguracao />
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ color: 'var(--color-text-muted)' }}>Carregando dados da empresa...</p>
              </div>
            )
          )}

          {/* Aparência */}
          {activeSection === 'aparencia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <h3 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 6 }}>Modo do Tema</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>Escolha entre o modo claro e escuro.</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  {(['light', 'dark'] as ThemeMode[]).map(m => (
                    <div
                      key={m}
                      onClick={() => setThemeMode(m)}
                      style={{
                        flex: 1, padding: '20px 16px', borderRadius: 14, cursor: 'pointer',
                        border: `2px solid ${themeMode === m ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: m === 'dark' ? '#0F172A' : '#F8FAFC',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        transition: 'all 0.2s'
                      }}
                    >
                      {m === 'light' ? <Sun size={28} color={m === themeMode ? 'var(--color-primary)' : '#6B7280'}/> : <Moon size={28} color={m === themeMode ? 'var(--color-primary)' : '#94A3B8'}/>}
                      <span style={{ fontWeight: 700, fontSize: 14, color: m === 'dark' ? '#E2E8F0' : '#1E293B' }}>
                        {m === 'light' ? 'Claro' : 'Escuro'}
                      </span>
                      {themeMode === m && (
                        <span style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 700 }}>✓ Ativo</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 6 }}>Paleta de Cores</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                  Escolha as cores que representam o seu salão. A mudança é aplicada instantaneamente.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
                  {allPalettes.map(p => {
                    const config = getThemeConfig(p, 'light')
                    const selected = palette === p
                    return (
                      <div
                        key={p}
                        onClick={() => setPalette(p)}
                        style={{
                          padding: '14px 12px', borderRadius: 14, cursor: 'pointer',
                          border: `2px solid ${selected ? config.primary : 'var(--color-border)'}`,
                          transition: 'all 0.2s',
                          transform: selected ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: selected ? `0 4px 20px ${config.primary}40` : undefined
                        }}
                      >
                        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: config.primary }}/>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: config.secondary }}/>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: config.accent }}/>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: selected ? 700 : 500, color: selected ? config.primary : 'var(--color-text)' }}>
                          {paletteLabels[p]}
                        </div>
                        {selected && (
                          <div style={{ fontSize: 11, color: config.primary, marginTop: 4 }}>✓ Ativo</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Horários */}
          {activeSection === 'horarios' && (
            <div className="card">
              <h3 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 20 }}>Horários de Funcionamento</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'].map((dia, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 6 ? '1px solid var(--color-border)' : 'none' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140, cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked={i >= 1 && i <= 6} />
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{dia}</span>
                    </label>
                    <input type="time" className="form-input" defaultValue={i === 0 ? '09:00' : '08:00'} style={{ maxWidth: 130 }} />
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>até</span>
                    <input type="time" className="form-input" defaultValue={i === 6 ? '17:00' : '18:00'} style={{ maxWidth: 130 }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24 }}>
                <div className="form-group">
                  <label className="form-label">Intervalo entre agendamentos</label>
                  <select className="form-input form-select" style={{ maxWidth: 240 }}>
                    <option>15 minutos</option>
                    <option selected>30 minutos</option>
                    <option>45 minutos</option>
                    <option>60 minutos</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Salvar horários</button>
              </div>
            </div>
          )}

          {/* Notificações */}
          {activeSection === 'notificacoes' && (
            <div className="card">
              <h3 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 20 }}>Configurações de Notificações</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'Lembrete automático 24h antes', desc: 'Envia WhatsApp/SMS ao cliente', ativo: true },
                  { label: 'Lembrete automático 1h antes', desc: 'Envia mensagem próximo ao horário', ativo: false },
                  { label: 'Confirmação de agendamento', desc: 'Notifica ao agendar', ativo: true },
                  { label: 'Mensagem de aniversário', desc: 'Envia parabéns automaticamente', ativo: true },
                  { label: 'Notificação de pagamento', desc: 'Avisa quando pagamento é recebido', ativo: false },
                  { label: 'Relatório semanal por e-mail', desc: 'Resumo da semana toda segunda', ativo: false },
                ].map((n, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{n.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{n.desc}</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" defaultChecked={n.ativo} />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 20 }}>Salvar notificações</button>
            </div>
          )}

          {/* Conta */}
          {activeSection === 'conta' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <h3 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 16 }}>Dados do Estabelecimento</h3>
                
                {/* Image Upload Area */}
                <div style={{ display: 'flex', gap: 24, marginBottom: 24, padding: '16px', background: 'var(--color-surface-hover)', borderRadius: 14, border: '1px solid var(--color-border)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', width: 80, height: 80, borderRadius: '50%', background: 'var(--color-border)', marginBottom: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {empresa?.foto_perfil_url ? <img src={empresa.foto_perfil_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={32} color="var(--color-text-muted)"/>}
                      <label style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, cursor: 'pointer', transition: '0.2s' }} className="hover-opacity">
                        <Camera size={20}/>
                        <input type="file" hidden accept="image/*" onChange={e => handleUpload(e, 'perfil')} />
                      </label>
                      {uploading === 'perfil' && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} className="animate-pulse" color="white"/></div>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>FOTO PERFIL</span>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 14, background: 'var(--color-border)', marginBottom: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {empresa?.logo_url ? <img src={empresa.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} /> : <Upload size={32} color="var(--color-text-muted)"/>}
                      <label style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, cursor: 'pointer', transition: '0.2s' }} className="hover-opacity">
                        <Upload size={20}/>
                        <input type="file" hidden accept="image/*" onChange={e => handleUpload(e, 'logo')} />
                      </label>
                      {uploading === 'logo' && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={20} className="animate-pulse" color="white"/></div>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>LOGO EMPRESA</span>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Sua Identidade Visual</h4>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Clique nas áreas ao lado para alterar sua foto de perfil ou a logo que aparecerá para seus clientes.</p>
                  </div>
                </div>

                <style dangerouslySetInnerHTML={{ __html: '.hover-opacity:hover { opacity: 1 !important; }' }} />

                <div className="grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Nome do Salão</label>
                    <input className="form-input" value={contaForm.nome} onChange={e => setContaForm(f => ({...f, nome: e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">CPF / CNPJ</label>
                    <input 
                      className="form-input" 
                      value={contaForm.documento} 
                      onChange={e => setContaForm(f => ({...f, documento: e.target.value}))}
                      placeholder="Somente números"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefone</label>
                    <input className="form-input" value={contaForm.telefone} onChange={e => setContaForm(f => ({...f, telefone: formatPhone(e.target.value)}))} maxLength={15} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">E-mail</label>
                    <input type="email" className="form-input" value={contaForm.email} onChange={e => setContaForm(f => ({...f, email: e.target.value}))}/>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Endereço</label>
                    <input className="form-input" value={contaForm.endereco} onChange={e => setContaForm(f => ({...f, endereco: e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cidade</label>
                    <input className="form-input" value={contaForm.cidade} onChange={e => setContaForm(f => ({...f, cidade: e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-input form-select" value={contaForm.estado} onChange={e => setContaForm(f => ({...f, estado: e.target.value}))}>
                      <option value="">Selecione</option>
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf}>{uf}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">CEP</label>
                    <input className="form-input" value={contaForm.cep} onChange={e => setContaForm(f => ({...f, cep: e.target.value}))} placeholder="00000-000" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Ajuda */}
          {activeSection === 'ajuda' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <h3 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 16 }}>Central de Ajuda</h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                  Acesse nossa central de ajuda completa para tirar dúvidas sobre o funcionamento do sistema.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { titulo: 'Como fazer um agendamento?', desc: 'Aprenda a criar e gerenciar agendamentos.' },
                    { titulo: 'Como cadastrar colaboradores?', desc: 'Adicione sua equipe e configure a escala.' },
                    { titulo: 'Como gerar cobrança via PIX?', desc: 'Configure e envie cobranças para clientes.' },
                  ].map((faq, i) => (
                    <Link key={i} href="/dashboard/ajuda" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ padding: '14px 16px', background: 'var(--color-surface-hover)', borderRadius: 10, border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{faq.titulo}</div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{faq.desc}</div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div style={{ marginTop: 20 }}>
                  <Link href="/dashboard/ajuda" className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}>
                    <Book size={16}/> Ver documentação completa
                  </Link>
                </div>
              </div>

              <div className="card" style={{ background: 'var(--color-gradient)', border: 'none' }}>
                <div style={{ color: 'white' }}>
                  <h3 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 6 }}>Precisa de suporte personalizado?</h3>
                  <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 16 }}>
                    Nossa equipe está pronta para ajudar você a tirar o máximo do Agendei.
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a href="mailto:suporte@agendei.com.br" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'white', color: 'var(--color-primary)', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', textDecoration: 'none' }}>
                      <Mail size={16}/> Enviar mensagem
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
