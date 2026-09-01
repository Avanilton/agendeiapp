'use client'
import { useState, useEffect, useCallback } from 'react'
import { Calendar, Users, CreditCard, TrendingUp, TrendingDown, ChevronRight, Star, CheckCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'
import MotivationalModal from '@/components/MotivationalModal'

const today = new Date()
const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  agendado: { label: 'Agendado', color: '#2563EB', bg: '#DBEAFE' },
  confirmado: { label: 'Confirmado', color: '#059669', bg: '#D1FAE5' },
  em_atendimento: { label: 'Em Atendimento', color: '#D97706', bg: '#FEF3C7' },
  concluido: { label: 'Concluído', color: '#6B7280', bg: '#F3F4F6' },
  cancelado: { label: 'Cancelado', color: '#DC2626', bg: '#FEE2E2' },
}

interface Agendamento {
  id: string
  hora_inicio: string
  hora_fim: string
  valor: number
  status: string
  clientes: { nome: string } | null
  servicos: { nome: string } | null
  colaboradores: { nome: string } | null
}

interface Stats {
  agendamentosHoje: number
  aReceberHoje: number
  totalClientes: number
  receitaMes: number
  aReceber: number
  recebido: number
}

export default function DashboardPage() {
  const { empresa, loading: empLoading } = useApp()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [stats, setStats] = useState<Stats>({ agendamentosHoje: 0, aReceberHoje: 0, totalClientes: 0, receitaMes: 0, aReceber: 0, recebido: 0 })
  const [aniversariantes, setAniversariantes] = useState<Array<{ nome: string; data_nascimento: string; telefone: string }>>([])
  const [loadingData, setLoadingData] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [finishingId, setFinishingId] = useState<string | null>(null)
  const [paymentForma, setPaymentForma] = useState('dinheiro')

  const todayStr = today.toISOString().split('T')[0]
  const mesAtual = today.getMonth() + 1

  const loadData = useCallback(async () => {
    if (!empresa || empLoading) return
    const supabase = createClient()

    // Agendamentos de hoje
    const { data: agds } = await supabase
      .from('agendamentos')
      .select('id, hora_inicio, hora_fim, valor, status, clientes(nome), servicos(nome), colaboradores(nome)')
      .eq('empresa_id', empresa.id)
      .eq('data', todayStr)
      .order('hora_inicio')

    const agendamentosFormatados = (agds as unknown as Agendamento[]) || []
    
    // Lógica de Auto-Finalização: Se o horário de fim já passou, marca como concluído
    const now = new Date()
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    const aFinalizar = agendamentosFormatados.filter(a => 
      a.status !== 'concluido' && a.status !== 'cancelado' && a.hora_fim && a.hora_fim < nowTime
    )

    if (aFinalizar.length > 0) {
      await supabase
        .from('agendamentos')
        .update({ status: 'concluido' })
        .in('id', aFinalizar.map(f => f.id))
      
      const { data: updatedAgds } = await supabase
        .from('agendamentos')
        .select('id, hora_inicio, hora_fim, valor, status, clientes(nome), servicos(nome), colaboradores(nome)')
        .eq('empresa_id', empresa.id)
        .eq('data', todayStr)
        .order('hora_inicio')
      setAgendamentos((updatedAgds as unknown as Agendamento[]) || [])
    } else {
      setAgendamentos(agendamentosFormatados)
    }

    const { count: clienteCount } = await supabase
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresa.id)
      .eq('ativo', true)

    const { data: cobrancas } = await supabase
      .from('cobrancas')
      .select('valor, valor_pago, status')
      .eq('empresa_id', empresa.id)
      .gte('vencimento', `${today.getFullYear()}-${String(mesAtual).padStart(2,'0')}-01`)

    const recebidoMes = cobrancas?.filter(c => c.status === 'pago').reduce((s, c) => s + c.valor, 0) || 0
    const aReceberMes = cobrancas?.filter(c => c.status === 'pendente').reduce((s, c) => s + c.valor, 0) || 0
    const aReceberHoje = agendamentosFormatados.filter(a => a.status !== 'concluido' && a.status !== 'cancelado').reduce((s: number, a: any) => s + (a.valor || 0), 0)

    setStats({
      agendamentosHoje: agds?.length || 0,
      aReceberHoje,
      totalClientes: clienteCount || 0,
      receitaMes: recebidoMes + aReceberMes,
      recebido: recebidoMes,
      aReceber: aReceberMes,
    })

    const { data: clientes } = await supabase
      .from('clientes')
      .select('nome, data_nascimento, telefone')
      .eq('empresa_id', empresa.id)
      .not('data_nascimento', 'is', null)
      .like('data_nascimento', `%-${String(mesAtual).padStart(2, '0')}-%`)
      .limit(100)

    const aniv = (clientes || []).filter(c => {
      if (!c.data_nascimento) return false
      const mes = parseInt(c.data_nascimento.split('-')[1])
      return mes === mesAtual
    }).slice(0, 5)

    setAniversariantes(aniv)
    setLoadingData(false)
  }, [empresa, empLoading, todayStr, mesAtual])

  useEffect(() => { loadData() }, [loadData])

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
      const agd = agendamentos.find(a => a.id === finishingId)
      await supabase.from('cobrancas').update({
        status: 'pago',
        forma_pagamento: forma,
        valor_pago: agd?.valor,
        pago_em: new Date().toISOString()
      }).eq('agendamento_id', finishingId)
    }

    setAgendamentos(prev => prev.map(a => a.id === finishingId ? { ...a, status: 'concluido' } : a))
    loadData()
    setShowPaymentModal(false)
    setFinishingId(null)
  }

  const excluirAgendamento = async (id: string) => {
    if (!confirm('Deseja excluir este agendamento permanentemente? A cobrança vinculada também será excluída.')) return
    const supabase = createClient()
    await supabase.from('cobrancas').delete().eq('agendamento_id', id)
    const { error } = await supabase.from('agendamentos').delete().eq('id', id)
    if (!error) loadData()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  return (
    <div className="animate-fadeIn">
      <MotivationalModal />
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {empLoading ? 'Carregando…' : `Bom dia! ${empresa?.nome ? empresa.nome.split(' ')[0] : ''} 👋`}
          </h1>
          <p className="page-subtitle">
            {dayNames[today.getDay()]}, {today.getDate()} de {monthNames[today.getMonth()]} de {today.getFullYear()}
          </p>
        </div>
        <Link href="/dashboard/agenda" className="btn btn-primary">
          <Calendar size={16}/> Nova Agenda
        </Link>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: <Calendar size={22}/>, label: 'Agendamentos Hoje', value: loadingData ? '…' : String(stats.agendamentosHoje) },
          { icon: <CreditCard size={22}/>, label: 'A Receber Hoje', value: loadingData ? '…' : `R$ ${fmt(stats.aReceberHoje)}` },
          { icon: <Users size={22}/>, label: 'Clientes Ativos', value: loadingData ? '…' : String(stats.totalClientes) },
          { icon: <TrendingUp size={22}/>, label: 'Receita do Mês', value: loadingData ? '…' : `R$ ${fmt(stats.receitaMes)}` },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-layout">
        {/* Appointments today */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontFamily: 'Outfit' }}>Agenda de Hoje</h2>
            <Link href="/dashboard/agenda" className="btn btn-secondary btn-sm">
              Ver completa <ChevronRight size={14}/>
            </Link>
          </div>

          {loadingData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }}/>)}
            </div>
          ) : agendamentos.length === 0 ? (
            <div className="empty-state">
              <Calendar size={40} style={{ opacity: 0.3 }}/>
              <p>Nenhum agendamento para hoje</p>
              <Link href="/dashboard/agenda" className="btn btn-primary btn-sm">Agendar agora</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {agendamentos.map((a) => {
                const sc = statusConfig[a.status] || statusConfig.agendado
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--color-surface-hover)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                    <div style={{ textAlign: 'center', minWidth: 50 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>{a.hora_inicio}</div>
                    </div>
                    <div style={{ width: 3, height: 40, borderRadius: 99, background: sc.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{(a.clientes as any)?.nome || 'Cliente'}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        {(a.servicos as any)?.nome || 'Serviço'} {(a.colaboradores as any)?.nome ? `· ${(a.colaboradores as any).nome}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>R$ {fmt(a.valor)}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {a.status !== 'concluido' && a.status !== 'cancelado' && (
                          <button 
                            onClick={() => handleFinalizarManual(a.id)}
                            className="btn btn-secondary" 
                            style={{ padding: '2px 8px', fontSize: 11, height: 'auto' }}
                          >
                            Finalizar
                          </button>
                        )}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: sc.bg, color: sc.color }}>{sc.label}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); excluirAgendamento(a.id) }}
                            className="btn btn-ghost btn-icon-sm text-danger"
                            title="Excluir"
                            style={{ padding: 0, height: 'auto' }}
                          >
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick actions */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontFamily: 'Outfit', marginBottom: 14 }}>Ações Rápidas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: <Calendar size={16}/>, label: 'Novo Agendamento', href: '/dashboard/agenda' },
                { icon: <Users size={16}/>, label: 'Novo Cliente', href: '/dashboard/clientes' },
                { icon: <CreditCard size={16}/>, label: 'Registrar Pagamento', href: '/dashboard/cobrancas' },
                { icon: <TrendingDown size={16}/>, label: 'Lançar Despesa', href: '/dashboard/despesas' },
              ].map((action, i) => (
                <Link key={i} href={action.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--color-surface-hover)', borderRadius: 10, fontSize: 13, fontWeight: 500, color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-primary)' }}>{action.icon}</span>
                  {action.label}
                  <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }}/>
                </Link>
              ))}
            </div>
          </div>

          {/* Birthdays */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontFamily: 'Outfit', marginBottom: 14 }}>🎂 Aniversariantes do Mês</h3>
            {loadingData ? (
              <div className="skeleton" style={{ height: 80, borderRadius: 10 }}/>
            ) : aniversariantes.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Nenhum aniversariante este mês</p>
            ) : (
              aniversariantes.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < aniversariantes.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                    {b.nome[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{b.data_nascimento?.slice(5).replace('-', '/')}</div>
                  </div>
                  <Star size={14} color="#F59E0B"/>
                </div>
              ))
            )}
          </div>

          {/* Financial summary */}
          <div className="card" style={{ background: 'var(--color-gradient)', border: 'none' }}>
            <div style={{ color: 'white' }}>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Resumo do Mês</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Outfit', marginBottom: 12 }}>
                R$ {fmt(stats.receitaMes)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, opacity: 0.9 }}>
                <div><div style={{ opacity: 0.7, marginBottom: 2 }}>Recebido</div><div style={{ fontWeight: 700 }}>R$ {fmt(stats.recebido)}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ opacity: 0.7, marginBottom: 2 }}>A receber</div><div style={{ fontWeight: 700 }}>R$ {fmt(stats.aReceber)}</div></div>
              </div>
              {stats.receitaMes > 0 && (
                <div style={{ marginTop: 12, height: 6, background: 'rgba(255,255,255,0.3)', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${Math.round((stats.recebido / stats.receitaMes) * 100)}%`, background: 'white', borderRadius: 99 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
