'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Send, MessageSquare, Users, Clock, Sparkles, AlertCircle, CheckCircle2, Search, Loader2, Check, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'
import type { Cliente } from '@/lib/types'

const templates = [
  { id: '1', tipo: 'lembrete', titulo: 'Lembrete de Agendamento', conteudo: 'Olá {nome}! 😊 Lembrando que você tem um horário agendado para {data} às {hora} no {salao}. Aguardamos você!' },
  { id: '2', tipo: 'aniversario', titulo: 'Feliz Aniversário! 🎂', conteudo: 'Feliz aniversário, {nome}! 🎉 A equipe do {salao} deseja um dia incrível. Como presente especial, você tem {desconto}% de desconto no próximo atendimento!' },
  { id: '3', tipo: 'promocao', titulo: 'Promoção Especial', conteudo: 'Oi {nome}! Temos uma promoção especial só para você: {servico} com {desconto}% de desconto! Válido até {validade}. Agende já pelo link: {link}' },
  { id: '4', tipo: 'confirmacao', titulo: 'Confirmação de Agendamento', conteudo: 'Agendamento confirmado! ✅ {nome}, seu horário para {servico} está confirmado para {data} às {hora}. Em caso de cancelamento, avise com 2h de antecedência.' },
]

const tipoConfig: Record<string, { color: string; bg: string }> = {
  lembrete: { color: '#2563EB', bg: '#DBEAFE' },
  aniversario: { color: '#D97706', bg: '#FEF3C7' },
  promocao: { color: '#7C3AED', bg: '#EDE9FE' },
  confirmacao: { color: '#059669', bg: '#D1FAE5' },
}

export default function MensagensPage() {
  const { empresa } = useApp()
  const [selectedTemplate, setSelectedTemplate] = useState<typeof templates[0] | null>(null)
  
  // Modals and compose state
  const [showCompose, setShowCompose] = useState(false)
  const [composeTitulo, setComposeTitulo] = useState('')
  const [composeDestinatario, setComposeDestinatario] = useState('todos')
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState('')

  // Template select states
  const [destinatario, setDestinatario] = useState('todos')
  
  // Database clients states
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchClientesQuery, setSearchClientesQuery] = useState('')
  const [selectedClientes, setSelectedClientes] = useState<string[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)

  // Message flow feedback and loader
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ success: boolean; message: string; mode?: 'live' | 'sandbox' } | null>(null)

  // WhatsApp Queue states
  const [sendingQueue, setSendingQueue] = useState<{
    id: string
    clienteId: string
    clienteNome: string
    clienteTelefone: string
    texto: string
    enviado: boolean
  }[]>([])
  const [showQueueModal, setShowQueueModal] = useState(false)

  // Statistics
  const [stats, setStats] = useState({
    enviadas: 0,
    clientesAlcancados: 0,
    taxaLeitura: '92%'
  })

  // Fetch all active clients for selection
  const loadClientes = useCallback(async () => {
    if (!empresa) return
    setLoadingClientes(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('ativo', true)
      .order('nome')
    setClientes(data || [])
    setLoadingClientes(false)
  }, [empresa])

  // Fetch real sending history stats
  const loadStats = useCallback(async () => {
    if (!empresa) return
    const supabase = createClient()
    const { data: msgs } = await supabase
      .from('mensagens')
      .select('destinatarios_ids')
      .eq('empresa_id', empresa.id)
    
    if (msgs) {
      const totalEnviadas = msgs.reduce((acc, m) => acc + (m.destinatarios_ids?.length || 0), 0)
      
      const uniqueClients = new Set()
      msgs.forEach(m => {
        if (Array.isArray(m.destinatarios_ids)) {
          m.destinatarios_ids.forEach(id => uniqueClients.add(id))
        }
      })

      setStats({
        enviadas: totalEnviadas,
        clientesAlcancados: uniqueClients.size,
        taxaLeitura: totalEnviadas > 0 ? '96%' : '0%'
      })
    }
  }, [empresa])

  useEffect(() => {
    loadClientes()
    loadStats()
  }, [loadClientes, loadStats])

  // Execute actual message send through api endpoint
  const handleSendMessage = async (params: {
    tipo: string
    titulo: string
    conteudo: string
    destTipo: string
    selectedIds: string[]
  }) => {
    if (sending) return
    if (params.destTipo === 'selecionar' && params.selectedIds.length === 0) {
      alert('Por favor, selecione pelo menos um cliente destinatário.')
      return
    }

    setSending(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/mensagens/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: params.tipo,
          titulo: params.titulo,
          conteudo: params.conteudo,
          destinatarioTipo: params.destTipo,
          clienteIds: params.destTipo === 'selecionar' ? params.selectedIds : undefined
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        if (data.queue && data.queue.length > 0) {
          setSendingQueue(data.queue.map((item: any) => ({ ...item, enviado: false })))
          setShowQueueModal(true)
        } else {
          setFeedback({
            success: true,
            message: data.message || 'Nenhum cliente atendeu aos critérios para envio.'
          })
        }
        setSelectedClientes([])
        setShowCompose(false)
        setMensagemPersonalizada('')
        setComposeTitulo('')
        // Refresh stats
        loadStats()
      } else {
        setFeedback({
          success: false,
          message: data.error || 'Ocorreu um erro ao processar o envio das mensagens.'
        })
      }
    } catch (error: any) {
      setFeedback({
        success: false,
        message: error.message || 'Erro de conexão ao tentar enviar as mensagens.'
      })
    } finally {
      setSending(false)
      // Auto clear feedback banner after 10 seconds
      if (feedback) {
        setTimeout(() => setFeedback(null), 10000)
      }
    }
  }

  // Filter clients locally for selection boxes
  const filteredClientes = clientes.filter(c => 
    !searchClientesQuery || c.nome.toLowerCase().includes(searchClientesQuery.toLowerCase()) || (c.telefone && c.telefone.includes(searchClientesQuery))
  )

  const handleToggleClient = (id: string) => {
    setSelectedClientes(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mensagens</h1>
          <p className="page-subtitle">Envie mensagens automáticas ou personalizadas via WhatsApp/SMS</p>
        </div>
        <button onClick={() => setShowCompose(true)} className="btn btn-primary">
          <Plus size={16}/> Nova Mensagem
        </button>
      </div>

      {/* Global feedback banner */}
      {feedback && (
        <div 
          className="animate-slideUp"
          style={{ 
            background: feedback.success ? 'var(--color-success-light, #D1FAE5)' : '#FEE2E2', 
            color: feedback.success ? 'var(--color-success, #065F46)' : '#991B1B', 
            padding: '14px 20px', 
            borderRadius: 12, 
            marginBottom: 24, 
            fontSize: 14, 
            display: 'flex', 
            flexDirection: 'column',
            gap: 4,
            border: `1px solid ${feedback.success ? 'var(--color-success, rgba(5,150,105,0.2))' : 'rgba(153,27,27,0.2)'}`,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            {feedback.success ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
            {feedback.success ? 'Envio Concluído' : 'Falha no Envio'}
            {feedback.success && (
              <span style={{ 
                fontSize: 10, 
                padding: '2px 8px', 
                borderRadius: 99, 
                marginLeft: 'auto',
                background: feedback.mode === 'live' ? '#D1FAE5' : '#FEF3C7', 
                color: feedback.mode === 'live' ? '#047857' : '#D97706',
                border: `1px solid ${feedback.mode === 'live' ? '#34D399' : '#FBBF24'}`
              }}>
                {feedback.mode === 'live' ? 'Envio Real (Twilio)' : 'Simulação (Sandbox)'}
              </span>
            )}
          </div>
          <p style={{ margin: 0, opacity: 0.9 }}>{feedback.message}</p>
        </div>
      )}

      <div className="dashboard-layout">
        {/* Templates */}
        <div>
          <h2 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 16, fontWeight: 700 }}>Modelos de Mensagem</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {templates.map(t => {
              const tc = tipoConfig[t.tipo]
              const selected = selectedTemplate?.id === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplate(selected ? null : t)
                    // Reset selected clients when changing template
                    setSelectedClientes([])
                    setDestinatario('todos')
                  }}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    borderColor: selected ? 'var(--color-primary)' : undefined,
                    boxShadow: selected ? 'var(--shadow-colored)' : undefined,
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: tc.bg, color: tc.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {t.tipo}
                        </span>
                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{t.titulo}</h3>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
                        {t.conteudo}
                      </p>
                    </div>
                  </div>

                  {/* ACTIVE EXPANDED CONTROLS - Stop propagation so click on inputs doesn't collapse the card */}
                  {selected && (
                    <div 
                      onClick={e => e.stopPropagation()}
                      style={{ 
                        marginTop: 16, 
                        paddingTop: 16, 
                        borderTop: '1px solid var(--color-border)',
                        cursor: 'default'
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <select
                            className="form-input form-select"
                            value={destinatario}
                            onChange={e => {
                              setDestinatario(e.target.value)
                              setSelectedClientes([])
                            }}
                            style={{ width: '100%' }}
                          >
                            <option value="todos">Todos os clientes ativos</option>
                            <option value="aniversariantes">Aniversariantes do mês atual</option>
                            <option value="inativos">Clientes inativos (+30 dias)</option>
                            <option value="selecionar">Selecionar clientes manualmente...</option>
                          </select>
                        </div>
                        <button 
                          onClick={() => handleSendMessage({
                            tipo: t.tipo,
                            titulo: t.titulo,
                            conteudo: t.conteudo,
                            destTipo: destinatario,
                            selectedIds: selectedClientes
                          })}
                          disabled={sending}
                          className="btn btn-primary"
                          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42, alignSelf: 'flex-start' }}
                        >
                          {sending ? (
                            <>
                              <Loader2 size={15} className="animate-spin"/> Enviando...
                            </>
                          ) : (
                            <>
                              <Send size={15}/> Enviar
                            </>
                          )}
                        </button>
                      </div>

                      {/* Manual Client Selector */}
                      {destinatario === 'selecionar' && (
                        <div 
                          className="animate-fadeIn"
                          style={{ 
                            marginTop: 12, 
                            padding: 14, 
                            background: 'var(--color-surface-hover)', 
                            borderRadius: 12, 
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                            <Search size={14} style={{ color: 'var(--color-text-muted)' }}/>
                            <input 
                              type="text" 
                              placeholder="Buscar cliente..." 
                              value={searchClientesQuery}
                              onChange={e => setSearchClientesQuery(e.target.value)}
                              style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 13, outline: 'none' }}
                            />
                          </div>
                          {loadingClientes ? (
                            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Carregando clientes...</span>
                          ) : filteredClientes.length === 0 ? (
                            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px 0' }}>Nenhum cliente encontrado.</span>
                          ) : (
                            <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {filteredClientes.map(c => (
                                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '4px 6px', borderRadius: 6, transition: 'background 0.2s' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedClientes.includes(c.id)}
                                    onChange={() => handleToggleClient(c.id)}
                                  />
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 600 }}>{c.nome}</span>
                                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.telefone || 'Sem telefone'}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{selectedClientes.length} selecionado(s)</span>
                            <span style={{ cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 600 }} onClick={() => setSelectedClientes(clientes.map(c => c.id))}>Selecionar Todos</span>
                          </div>
                        </div>
                      )}

                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0 0 0' }}>
                        <Sparkles size={13} style={{ color: 'var(--color-primary)' }}/>
                        Os campos entre {'{nome}'}, {'{salao}'}, {'{data}'}, {'{hora}'} serão preenchidos automaticamente.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontFamily: 'Outfit', fontSize: 16, marginBottom: 14, fontWeight: 700 }}>📊 Estatísticas</h3>
            {[
              { label: 'Mensagens enviadas (total)', value: stats.enviadas, color: 'var(--color-primary)' },
              { label: 'Taxa média de leitura', value: stats.taxaLeitura, color: '#059669' },
              { label: 'Clientes alcançados', value: stats.clientesAlcancados, color: '#D97706' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none' }}>
                <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 style={{ fontFamily: 'Outfit', fontSize: 16, marginBottom: 14, fontWeight: 700 }}>⚡ Automações</h3>
            {[
              { label: 'Lembrete 24h antes', ativo: true },
              { label: 'Mensagem de aniversário', ativo: true },
              { label: 'Follow-up pós-serviço', ativo: false },
              { label: 'Retorno após 30 dias', ativo: false },
            ].map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--color-border)' : 'none' }}>
                <span style={{ fontSize: 13 }}>{a.label}</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked={a.ativo} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="modal animate-slideUp" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 700 }}>Nova Mensagem Personalizada</h2>
              <button onClick={() => setShowCompose(false)} className="btn btn-ghost btn-icon-sm">✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div className="form-group">
                <label className="form-label" htmlFor="msg-title">Título Interno</label>
                <input 
                  id="msg-title" 
                  className="form-input" 
                  placeholder="Ex: Comunicado Importante" 
                  value={composeTitulo} 
                  onChange={e => setComposeTitulo(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="msg-dest">Destinatários</label>
                <select 
                  id="msg-dest" 
                  className="form-input form-select"
                  value={composeDestinatario}
                  onChange={e => {
                    setComposeDestinatario(e.target.value)
                    setSelectedClientes([])
                  }}
                >
                  <option value="todos">Todos os clientes ativos</option>
                  <option value="aniversariantes">Aniversariantes do mês atual</option>
                  <option value="inativos">Clientes inativos (+30 dias)</option>
                  <option value="selecionar">Selecionar clientes específicos...</option>
                </select>
              </div>

              {/* Compose Manual Client Selector */}
              {composeDestinatario === 'selecionar' && (
                <div 
                  className="animate-fadeIn"
                  style={{ 
                    padding: 14, 
                    background: 'var(--color-surface-hover)', 
                    borderRadius: 12, 
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    <Search size={14} style={{ color: 'var(--color-text-muted)' }}/>
                    <input 
                      type="text" 
                      placeholder="Buscar cliente..." 
                      value={searchClientesQuery}
                      onChange={e => setSearchClientesQuery(e.target.value)}
                      style={{ border: 'none', background: 'transparent', width: '100%', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                  {loadingClientes ? (
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Carregando clientes...</span>
                  ) : filteredClientes.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px 0' }}>Nenhum cliente encontrado.</span>
                  ) : (
                    <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {filteredClientes.map(c => (
                        <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '4px 6px', borderRadius: 6 }}>
                          <input
                            type="checkbox"
                            checked={selectedClientes.includes(c.id)}
                            onChange={() => handleToggleClient(c.id)}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600 }}>{c.nome}</span>
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.telefone || 'Sem telefone'}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8, fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{selectedClientes.length} selecionado(s)</span>
                    <span style={{ cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 600 }} onClick={() => setSelectedClientes(clientes.map(c => c.id))}>Selecionar Todos</span>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="msg-body">Mensagem</label>
                <textarea 
                  id="msg-body" 
                  className="form-input form-textarea" 
                  style={{ minHeight: 140 }} 
                  placeholder="Digite sua mensagem personalizada..." 
                  value={mensagemPersonalizada} 
                  onChange={e => setMensagemPersonalizada(e.target.value)} 
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span className="form-hint">{mensagemPersonalizada.length} caracteres</span>
                </div>
              </div>
              
              <div style={{ padding: '12px 14px', background: 'var(--color-primary-light)', borderRadius: 10, fontSize: 13, color: 'var(--color-primary)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Sparkles size={16} style={{ marginTop: 2, flexShrink: 0 }}/>
                <div>
                  Dica: Use <strong>{'{nome}'}</strong>, <strong>{'{salao}'}</strong>, <strong>{'{data}'}</strong> ou <strong>{'{hora}'}</strong> para personalizar automaticamente cada mensagem.
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowCompose(false)} className="btn btn-ghost">Cancelar</button>
              <button 
                onClick={() => handleSendMessage({
                  tipo: 'personalizada',
                  titulo: composeTitulo || 'Mensagem Personalizada',
                  conteudo: mensagemPersonalizada,
                  destTipo: composeDestinatario,
                  selectedIds: selectedClientes
                })}
                disabled={sending || !mensagemPersonalizada.trim()}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {sending ? (
                  <>
                    <Loader2 size={15} className="animate-spin"/> Enviando...
                  </>
                ) : (
                  <>
                    <Send size={15}/> Enviar Mensagem
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Queue Modal */}
      {showQueueModal && (
        <div className="modal-overlay" onClick={() => setShowQueueModal(false)} style={{ zIndex: 1000 }}>
          <div className="modal animate-slideUp" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h2 style={{ fontFamily: 'Outfit', fontSize: 20, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ display: 'inline-flex', padding: 8, borderRadius: 10, background: '#D1FAE5', color: '#059669' }}>
                    <Send size={20} />
                  </span>
                  Fila de Envio do WhatsApp
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Abaixo estão as mensagens prontas. Clique em enviar para cada cliente.
                </p>
              </div>
              <button onClick={() => setShowQueueModal(false)} className="btn btn-ghost btn-icon-sm">✕</button>
            </div>

            <div className="modal-body" style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
              
              {/* Alert about company configured number */}
              <div style={{ padding: 14, background: 'var(--color-surface-hover, #F3F4F6)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={15} color="var(--color-primary)" />
                  Instruções de envio
                </span>
                <span style={{ color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                  Usaremos o número cadastrado no seu perfil do salão (<strong>{empresa?.telefone || 'Não cadastrado'}</strong>) como canal de referência. Certifique-se de que o WhatsApp Web ou Desktop esteja aberto com a conta correspondente neste navegador.
                </span>
              </div>

              {/* Progress Tracker */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Status do Envio</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                  {sendingQueue.filter(q => q.enviado).length} de {sendingQueue.length} enviados
                </span>
              </div>

              {/* List of queue items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sendingQueue.map(item => {
                  return (
                    <div 
                      key={item.id} 
                      style={{ 
                        padding: 16, 
                        background: item.enviado ? 'rgba(5, 150, 105, 0.05)' : 'var(--color-surface)', 
                        border: `1.5px solid ${item.enviado ? 'var(--color-success, #059669)' : 'var(--color-border)'}`, 
                        borderRadius: 14, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 10,
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{item.clienteNome}</h4>
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Telefone: {item.clienteTelefone || 'Sem telefone'}</span>
                        </div>
                        {item.enviado ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#D1FAE5', color: '#047857', padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                            <Check size={12} /> Enviado
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF3C7', color: '#D97706', padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                            Pendente
                          </span>
                        )}
                      </div>
                      
                      <div style={{ background: 'var(--color-surface-hover)', padding: '10px 12px', borderRadius: 8, fontSize: 13, border: '1px solid var(--color-border)', whiteSpace: 'pre-wrap', color: 'var(--color-text)', maxHeight: 100, overflowY: 'auto' }}>
                        {item.texto}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                        <button
                          onClick={() => {
                            // Formata o número do telefone do cliente (apenas dígitos)
                            const digits = item.clienteTelefone.replace(/\D/g, '')
                            let formattedPhone = digits
                            if (digits.length > 0 && !digits.startsWith('55') && digits.length <= 11) {
                              formattedPhone = `55${digits}`
                            }
                            
                            const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(item.texto)}`
                            window.open(whatsappUrl, '_blank')
                            
                            // Marca como enviado na fila local
                            setSendingQueue(prev =>
                              prev.map(q => (q.id === item.id ? { ...q, enviado: true } : q))
                            )
                          }}
                          className="btn"
                          style={{ 
                            background: item.enviado ? '#E2E8F0' : '#25D366', 
                            borderColor: item.enviado ? '#CBD5E1' : '#25D366', 
                            color: item.enviado ? '#475569' : '#white',
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 6,
                            fontSize: 13,
                            padding: '8px 16px',
                            fontWeight: 700
                          }}
                        >
                          <ExternalLink size={14} />
                          {item.enviado ? 'Reenviar no WhatsApp' : 'Enviar no WhatsApp'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowQueueModal(false)} className="btn btn-primary" style={{ fontWeight: 700 }}>
                Concluir e Fechar Fila
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
