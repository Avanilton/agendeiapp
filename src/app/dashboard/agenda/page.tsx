'use client'
import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, CheckCircle, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'
import type { Servico, Cliente, Colaborador } from '@/lib/types'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const statusColors: Record<string, string> = {
  agendado: '#2563EB', confirmado: '#059669',
  em_atendimento: '#D97706', concluido: '#6B7280', cancelado: '#DC2626',
}

interface AgendEvt {
  id: string
  hora_inicio: string
  hora_fim: string
  status: string
  valor: number
  clientes: { nome: string } | null
  servicos: { nome: string } | null
}

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay() }

export default function AgendaPage() {
  const { empresa } = useApp()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [events, setEvents] = useState<Record<string, AgendEvt[]>>({})
  const [dayEvents, setDayEvents] = useState<AgendEvt[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [finishingId, setFinishingId] = useState<string | null>(null)
  const [paymentForma, setPaymentForma] = useState('dinheiro')

  // Form state
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [agForm, setAgForm] = useState({ cliente_id: '', servico_id: '', colaborador_id: '', data: '', hora_inicio: '', observacoes: '' })

  const loadMonth = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const start = `${year}-${String(month + 1).padStart(2,'0')}-01`
    const end = `${year}-${String(month + 1).padStart(2,'0')}-${getDaysInMonth(year, month)}`
    const { data } = await supabase
      .from('agendamentos')
      .select('id, hora_inicio, status, valor, clientes(nome), servicos(nome)')
      .eq('empresa_id', empresa.id)
      .gte('data', start).lte('data', end)
    const map: Record<string, AgendEvt[]> = {}
    ;(data as unknown as (AgendEvt & { data: string })[])?.forEach(a => {
      const key = a.data || ''
      if (!map[key]) map[key] = []
      map[key].push(a)
    })
    setEvents(map)
    setLoading(false)
  }, [empresa, year, month])

  const loadDayData = useCallback(async () => {
    if (!empresa) return
    const key = `${year}-${String(month + 1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`
    const supabase = createClient()
    const { data } = await supabase
      .from('agendamentos')
      .select('id, hora_inicio, hora_fim, status, valor, clientes(nome), servicos(nome)')
      .eq('empresa_id', empresa.id)
      .eq('data', key)
      .order('hora_inicio')
    
    const formatados = (data as unknown as AgendEvt[]) || []
    
    // Auto-finalização para o dia selecionado (se for hoje ou passado)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const aFinalizar = formatados.filter(a => 
      a.status !== 'concluido' && a.status !== 'cancelado' && 
      (key < todayStr || (key === todayStr && a.hora_fim && a.hora_fim < nowTime))
    )

    if (aFinalizar.length > 0) {
      await supabase.from('agendamentos').update({ status: 'concluido' }).in('id', aFinalizar.map(f => f.id))
      const { data: retry } = await supabase
        .from('agendamentos')
        .select('id, hora_inicio, hora_fim, status, valor, clientes(nome), servicos(nome)')
        .eq('empresa_id', empresa.id)
        .eq('data', key)
        .order('hora_inicio')
      setDayEvents((retry as unknown as AgendEvt[]) || [])
    } else {
      setDayEvents(formatados)
    }
  }, [empresa, year, month, selectedDay])

  const loadFormData = useCallback(async () => {
    if (!empresa) return
    const supabase = createClient()
    const [{ data: cls }, { data: svcs }, { data: cols }] = await Promise.all([
      supabase.from('clientes').select('id, nome').eq('empresa_id', empresa.id).eq('ativo', true).order('nome'),
      supabase.from('servicos').select('id, nome, preco, duracao_minutos').eq('empresa_id', empresa.id).eq('ativo', true),
      supabase.from('colaboradores').select('id, nome').eq('empresa_id', empresa.id).eq('ativo', true),
    ])
    setClientes(cls as Cliente[] || [])
    setServicos(svcs as Servico[] || [])
    setColaboradores(cols as Colaborador[] || [])
  }, [empresa])

  useEffect(() => { loadMonth() }, [loadMonth])
  useEffect(() => { loadDayData() }, [loadDayData])

  const openModal = () => {
    const key = `${year}-${String(month + 1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`
    setAgForm({ cliente_id: '', servico_id: '', colaborador_id: '', data: key, hora_inicio: '', observacoes: '' })
    loadFormData()
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!empresa || !agForm.cliente_id || !agForm.servico_id || !agForm.data || !agForm.hora_inicio) return
    setSaving(true)
    const supabase = createClient()
    const svc = servicos.find(s => s.id === agForm.servico_id)
    const durMin = svc?.duracao_minutos || 60
    const [h, m] = agForm.hora_inicio.split(':').map(Number)
    const endH = Math.floor((h * 60 + m + durMin) / 60) % 24
    const endM = (h * 60 + m + durMin) % 60
    const hora_fim = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`

    const { data: newAgd } = await supabase.from('agendamentos').insert({
      empresa_id: empresa.id,
      cliente_id: agForm.cliente_id,
      servico_id: agForm.servico_id,
      colaborador_id: agForm.colaborador_id || null,
      data: agForm.data,
      hora_inicio: agForm.hora_inicio,
      hora_fim,
      status: 'agendado',
      valor: svc?.preco || 0,
      observacoes: agForm.observacoes,
    }).select().single()

    // Criar cobrança automaticamente
    if (newAgd) {
      await supabase.from('cobrancas').insert({
        empresa_id: empresa.id,
        agendamento_id: newAgd.id,
        cliente_id: agForm.cliente_id,
        valor: svc?.preco || 0,
        status: 'pendente',
        forma_pagamento: 'pendente',
        vencimento: agForm.data,
      })
    }

    setSaving(false)
    setShowModal(false)
    loadMonth()
    loadDayData()
  }
  const excluirAgendamento = async (id: string) => {
    if (!confirm('Deseja excluir este agendamento permanentemente? A cobrança vinculada também será excluída.')) return
    const supabase = createClient()
    
    // Deletar cobranças vinculadas primeiro (opcional dependendo da FK, mas seguro)
    await supabase.from('cobrancas').delete().eq('agendamento_id', id)
    
    const { error } = await supabase.from('agendamentos').delete().eq('id', id)
    if (!error) {
      loadMonth()
      loadDayData()
    }
  }

  const handleFinalizarManual = async (id: string) => {
    setFinishingId(id)
    setShowPaymentModal(true)
  }

  const confirmFinalization = async (pago: boolean, forma: string = 'dinheiro') => {
    if (!finishingId) return
    const supabase = createClient()
    
    // Finalizar agendamento
    const { error: agdErr } = await supabase
      .from('agendamentos')
      .update({ status: 'concluido' })
      .eq('id', finishingId)
    
    if (agdErr) return

    // Se pago, atualizar cobrança
    if (pago) {
      const agd = dayEvents.find(a => a.id === finishingId)
      await supabase.from('cobrancas').update({
        status: 'pago',
        forma_pagamento: forma,
        valor_pago: agd?.valor,
        pago_em: new Date().toISOString()
      }).eq('agendamento_id', finishingId)
    }

    setDayEvents(prev => prev.map(a => a.id === finishingId ? { ...a, status: 'concluido' } : a))
    loadMonth()
    setShowPaymentModal(false)
    setFinishingId(null)
  }

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11) } else setMonth(m => m-1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0) } else setMonth(m => m+1) }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDay(year, month)
  const cells = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_,i) => i+1)]
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  const dayKey = (d: number) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">Visualize e gerencie todos os agendamentos</p>
        </div>
        <button onClick={openModal} className="btn btn-primary"><Plus size={16}/> Novo Agendamento</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* Calendar */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <button onClick={prevMonth} className="btn btn-ghost btn-icon"><ChevronLeft size={18}/></button>
            <h2 style={{ fontFamily: 'Outfit', fontSize: 18, fontWeight: 700 }}>{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="btn btn-ghost btn-icon"><ChevronRight size={18}/></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', padding: '4px 0' }}>{d}</div>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`}/>
              const evs = events[dayKey(day)] || []
              const active = day === selectedDay
              return (
                <div key={day} onClick={() => setSelectedDay(day)} style={{
                  aspectRatio: '1', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  borderRadius: 10, cursor: 'pointer',
                  background: active ? 'var(--color-primary)' : isToday(day) ? 'var(--color-primary-light)' : 'transparent',
                  color: active ? 'white' : isToday(day) ? 'var(--color-primary)' : 'var(--color-text)',
                  fontWeight: active || isToday(day) ? 700 : 400,
                  fontSize: 14, transition: 'all 0.15s', gap: 2
                }}>
                  {day}
                  {evs.length > 0 && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      {evs.slice(0,3).map((e, ei) => (
                        <div key={ei} style={{ width: 5, height: 5, borderRadius: '50%', background: active ? 'rgba(255,255,255,0.8)' : statusColors[e.status] || 'var(--color-primary)' }}/>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Day panel */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Calendar size={18} color="var(--color-primary)"/>
            <h3 style={{ fontFamily: 'Outfit', fontSize: 16, fontWeight: 700 }}>
              {selectedDay} de {MONTHS[month]}
            </h3>
          </div>

          {dayEvents.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <Calendar size={36} style={{ opacity: 0.3 }}/>
              <p style={{ fontSize: 14 }}>Nenhum agendamento</p>
              <button onClick={openModal} className="btn btn-primary btn-sm"><Plus size={14}/> Agendar</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dayEvents.map((ev) => (
                <div key={ev.id} style={{ padding: '12px 14px', background: 'var(--color-surface-hover)', borderRadius: 10, borderLeft: `3px solid ${statusColors[ev.status] || 'var(--color-primary)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Clock size={13} color="var(--color-text-muted)"/>
                    <span style={{ fontSize: 13, fontWeight: 700, color: statusColors[ev.status] }}>{ev.hora_inicio}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{(ev.clientes as any)?.nome || '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{(ev.servicos as any)?.nome || '—'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: `${statusColors[ev.status]}20`, color: statusColors[ev.status] }}>
                        {ev.status.replace('_', ' ')}
                      </span>
                      {ev.status !== 'concluido' && ev.status !== 'cancelado' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleFinalizarManual(ev.id) }}
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '1px 6px', fontSize: 10, height: 'auto' }}
                        >
                          Finalizar
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>R$ {Number(ev.valor).toFixed(2)}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); excluirAgendamento(ev.id) }}
                        className="btn btn-ghost btn-icon-sm text-danger"
                        title="Excluir Agendamento"
                        style={{ padding: 0, height: 'auto', minHeight: 0 }}
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={openModal} className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', marginTop: 4 }}>
                <Plus size={14}/> Adicionar horário
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Appointment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20 }}>Novo Agendamento</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon-sm">✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <select className="form-input form-select" value={agForm.cliente_id} onChange={e => setAgForm(f => ({...f, cliente_id: e.target.value}))}>
                  <option value="">Selecionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Serviço *</label>
                <select className="form-input form-select" value={agForm.servico_id} onChange={e => setAgForm(f => ({...f, servico_id: e.target.value}))}>
                  <option value="">Selecionar serviço...</option>
                  {servicos.map(s => <option key={s.id} value={s.id}>{s.nome} — R$ {Number(s.preco).toFixed(2)}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Data *</label>
                  <input type="date" className="form-input" value={agForm.data} onChange={e => setAgForm(f => ({...f, data: e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Horário *</label>
                  <input type="time" className="form-input" value={agForm.hora_inicio} onChange={e => setAgForm(f => ({...f, hora_inicio: e.target.value}))}/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Colaborador</label>
                <select className="form-input form-select" value={agForm.colaborador_id} onChange={e => setAgForm(f => ({...f, colaborador_id: e.target.value}))}>
                  <option value="">Qualquer disponível</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-input form-textarea" value={agForm.observacoes} onChange={e => setAgForm(f => ({...f, observacoes: e.target.value}))} placeholder="Observações sobre o atendimento..."/>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--color-primary-light)', borderRadius: 10, fontSize: 13, color: 'var(--color-primary)' }}>
                💡 Uma cobrança será criada automaticamente ao confirmar o agendamento.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !agForm.cliente_id || !agForm.servico_id || !agForm.data || !agForm.hora_inicio} className="btn btn-primary">
                {saving ? 'Agendando…' : 'Confirmar Agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal modal-sm animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'Outfit', fontSize: 18 }}>Finalizar Atendimento</h2>
              <button onClick={() => setShowPaymentModal(false)} className="btn btn-ghost btn-icon-sm">✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, marginBottom: 20 }}>O atendimento foi concluído. O cliente já realizou o pagamento?</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group" style={{ textAlign: 'left' }}>
                  <label className="form-label">Forma de Pagamento</label>
                  <select className="form-input form-select" value={paymentForma} onChange={e => setPaymentForma(e.target.value)}>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                  </select>
                </div>
                
                <button onClick={() => confirmFinalization(true, paymentForma)} className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
                  <CheckCircle size={18}/> Sim, já recebi
                </button>
                <button onClick={() => confirmFinalization(false)} className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}>
                  Receber depois (Pendente)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
