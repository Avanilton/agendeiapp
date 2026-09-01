'use client'
import { useState, useEffect, useCallback } from 'react'
import { QrCode, CheckCircle, Clock, XCircle, Search, RefreshCw, Copy, Loader2, Zap, AlertTriangle, Plus, Trash2, Edit2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'
import Link from 'next/link'

interface Cobranca {
  id: string
  agendamento_id?: string | null
  valor: number
  valor_pago: number
  status: string
  forma_pagamento: string
  vencimento: string
  pago_em?: string
  pix_qr_code?: string
  pix_qr_base64?: string
  pix_txid?: string
  gateway_usado?: string
  observacoes?: string | null
  clientes: { nome: string; email?: string; cpf?: string } | null
  agendamentos: { servicos: { nome: string } | null } | null
}

interface PixData {
  qr_code: string
  qr_base64: string
  qr_url: string
  txid: string
  gateway: string
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pago: { label: 'Pago', color: '#059669', bg: '#D1FAE5', icon: <CheckCircle size={14}/> },
  pendente: { label: 'Pendente', color: '#D97706', bg: '#FEF3C7', icon: <Clock size={14}/> },
  cancelado: { label: 'Cancelado', color: '#DC2626', bg: '#FEE2E2', icon: <XCircle size={14}/> },
}

const formaLabels: Record<string, string> = {
  pix: 'PIX', dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão Crédito', cartao_debito: 'Cartão Debito', pendente: '—'
}

const gatewayLabel: Record<string, string> = {
  mercado_pago: 'Mercado Pago', efibank: 'EfiBank', picpay: 'PicPay',
  pix_estatico: 'PIX', itau: 'Itaú', bradesco: 'Bradesco',
  nubank: 'Nubank', c6bank: 'C6 Bank',
}

export default function CobrancasPage() {
  const { empresa } = useApp()
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')
  const [showPixModal, setShowPixModal] = useState(false)
  const [selected, setSelected] = useState<Cobranca | null>(null)
  const [pixData, setPixData] = useState<PixData | null>(null)
  const [pixLoading, setPixLoading] = useState(false)
  const [pixError, setPixError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [addForm, setAddForm] = useState({ cliente_id: '', descricao: '', valor: '', forma_pagamento: 'dinheiro', status: 'pago', vencimento: new Date().toISOString().split('T')[0] })
  const [dtInicial, setDtInicial] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [dtFinal, setDtFinal] = useState(new Date().toISOString().split('T')[0])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCobranca, setEditingCobranca] = useState<Cobranca | null>(null)
  const [editForm, setEditForm] = useState({ valor: '', vencimento: '', observacoes: '' })

  const load = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('cobrancas')
      .select('*, clientes(nome, email), agendamentos(servicos(nome))')
      .eq('empresa_id', empresa.id)
      .gte('vencimento', dtInicial)
      .lte('vencimento', dtFinal)
      .order('vencimento', { ascending: false })
    setCobrancas((data as unknown as Cobranca[]) || [])
    setLoading(false)
  }, [empresa, dtInicial, dtFinal])

  useEffect(() => { load() }, [load])

  const gerarPix = async (cobranca: Cobranca) => {
    if (cobranca.pix_qr_code) {
      setPixData({
        qr_code: cobranca.pix_qr_code,
        qr_base64: cobranca.pix_qr_base64 || '',
        qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(cobranca.pix_qr_code)}&margin=10`,
        txid: cobranca.pix_txid || '',
        gateway: cobranca.gateway_usado || 'pix_estatico',
      })
      return
    }

    setPixLoading(true)
    setPixError('')
    setPixData(null)

    try {
      const res = await fetch('/api/pix/cobrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cobranca_id: cobranca.id,
          valor: cobranca.valor,
          descricao: (cobranca.agendamentos as any)?.servicos?.nome || 'Serviço Agendei',
          cliente_nome: (cobranca.clientes as any)?.nome || 'Cliente',
          cliente_email: (cobranca.clientes as any)?.email || '',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar PIX')

      setPixData({
        qr_code: data.qr_code,
        qr_base64: data.qr_base64 || '',
        qr_url: data.qr_url,
        txid: data.txid,
        gateway: data.gateway,
      })
      load()
    } catch (err) {
      setPixError(err instanceof Error ? err.message : 'Erro ao gerar PIX')
    }
    setPixLoading(false)
  }

  const openPixModal = (c: Cobranca) => {
    setSelected(c)
    setPixData(null)
    setPixError('')
    setShowPixModal(true)
    gerarPix(c)
  }

  const closePixModal = () => {
    setShowPixModal(false)
    setSelected(null)
    setPixData(null)
    setPixError('')
  }

  const marcarPago = async (id: string, forma: string) => {
    const supabase = createClient()
    await supabase.from('cobrancas').update({
      status: 'pago',
      forma_pagamento: forma,
      pago_em: new Date().toISOString(),
      valor_pago: cobrancas.find(c => c.id === id)?.valor
    }).eq('id', id)
    closePixModal()
    load()
  }

  const reverterPagamento = async (id: string) => {
    if (!confirm('Deseja reverter este pagamento para pendente?')) return
    const supabase = createClient()
    await supabase.from('cobrancas').update({ 
      status: 'pendente', 
      valor_pago: 0, 
      pago_em: null,
      forma_pagamento: 'pendente'
    }).eq('id', id)
    load()
  }

  const excluirCobranca = async (id: string) => {
    if (!confirm('Excluir esta cobrança permanentemente?')) return
    const supabase = createClient()
    await supabase.from('cobrancas').delete().eq('id', id)
    load()
  }

  const openEditModal = (c: Cobranca) => {
    setEditingCobranca(c)
    setEditForm({
      valor: String(c.valor),
      vencimento: c.vencimento,
      observacoes: c.observacoes || ''
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingCobranca || !editForm.valor) return
    setAddLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('cobrancas')
      .update({
        valor: parseFloat(editForm.valor),
        vencimento: editForm.vencimento,
        observacoes: editForm.observacoes
      })
      .eq('id', editingCobranca.id)
    
    if (!error) {
      setShowEditModal(false)
      load()
    }
    setAddLoading(false)
  }

  const openAddModal = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('clientes').select('id, nome').eq('empresa_id', empresa?.id).eq('ativo', true).order('nome')
    setClientes(data || [])
    setAddForm({ cliente_id: '', descricao: '', valor: '', forma_pagamento: 'dinheiro', status: 'pago', vencimento: new Date().toISOString().split('T')[0] })
    setShowAddModal(true)
  }

  const handleSelectClient = async (clientId: string) => {
    setAddForm(f => ({ ...f, cliente_id: clientId }))
    if (!clientId) return
    
    const supabase = createClient()
    const { data: agd } = await supabase
      .from('agendamentos')
      .select('valor, servicos(nome)')
      .eq('cliente_id', clientId)
      .not('status', 'in', '("concluido","cancelado")')
      .order('data', { ascending: false })
      .limit(1)
      .maybeSingle()
      
    if (agd) {
      setAddForm(f => ({ 
        ...f, 
        cliente_id: clientId, 
        descricao: (agd.servicos as any)?.nome || '', 
        valor: agd.valor.toString() 
      }))
    }
  }

  const handleSaveManual = async () => {
    if (!empresa || !addForm.descricao || !addForm.valor) return
    setAddLoading(true)
    const supabase = createClient()
    const payload = {
      empresa_id: empresa.id,
      cliente_id: addForm.cliente_id || null,
      valor: parseFloat(addForm.valor),
      valor_pago: addForm.status === 'pago' ? parseFloat(addForm.valor) : 0,
      status: addForm.status,
      forma_pagamento: addForm.forma_pagamento,
      vencimento: addForm.vencimento,
      pago_em: addForm.status === 'pago' ? new Date().toISOString() : null,
      observacoes: addForm.descricao
    }
    
    await supabase.from('cobrancas').insert(payload)
    setShowAddModal(false)
    setAddLoading(false)
    load()
  }

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  
  const searchLower = search.toLowerCase()
  const filtered = cobrancas.filter(c => {
    const matchesFilter = filter === 'todos' || c.status === filter
    const matchSearch = !search || 
      [(c.clientes as any)?.nome, (c.agendamentos as any)?.servicos?.nome, (c as any).observacoes]
      .some(v => v?.toLowerCase().includes(searchLower))
    
    if (!matchSearch) return false
    
    const isAtrasado = c.status === 'pendente' && new Date(c.vencimento + 'T23:59:59') < new Date()
    
    if (filter === 'atrasado') return isAtrasado
    if (filter === 'todos') return true
    return c.status === filter
  })

  const total = filtered.reduce((s, c) => s + c.valor, 0)
  const recebido = filtered.filter(c => c.status === 'pago').reduce((s, c) => s + c.valor, 0)
  const pendente = filtered.filter(c => c.status === 'pendente').reduce((s, c) => s + c.valor, 0)

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cobranças</h1>
          <p className="page-subtitle">Contas a receber e histórico de pagamentos</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn btn-ghost btn-icon" title="Atualizar"><RefreshCw size={16}/></button>
          <button onClick={openAddModal} className="btn btn-primary"><Plus size={16}/> Nova Cobrança</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
          <div className="stat-label">Total Filtrado</div>
          <div className="stat-value">R$ {fmt(total)}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{filtered.length} cobranças</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="stat-label">Recebido</div>
          <div className="stat-value" style={{ color: '#059669' }}>R$ {fmt(recebido)}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #D97706' }}>
          <div className="stat-label">A Receber</div>
          <div className="stat-value" style={{ color: '#D97706' }}>R$ {fmt(pendente)}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--color-surface)', padding: '6px 12px', borderRadius: 10, border: '1px solid var(--color-border)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>DE</label>
            <input type="date" className="form-input" value={dtInicial} onChange={e => setDtInicial(e.target.value)} style={{ padding: '4px 8px', height: 'auto', fontSize: 13, border: 'none', background: 'transparent' }}/>
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--color-border)' }} />
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 2 }}>ATÉ</label>
            <input type="date" className="form-input" value={dtFinal} onChange={e => setDtFinal(e.target.value)} style={{ padding: '4px 8px', height: 'auto', fontSize: 13, border: 'none', background: 'transparent' }}/>
          </div>
        </div>

        <div className="search-input-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <Search size={16} className="search-icon"/>
          <input className="form-input" placeholder="Buscar por cliente, serviço..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 40 }}/>
        </div>
        <div className="tabs" style={{ flex: 1 }}>
          {['todos','pendente','atrasado','pago','cancelado'].map(f => (
            <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <div style={{ fontSize: 40, opacity: 0.3 }}>💳</div>
          <p>{search || filter !== 'todos' ? 'Nenhuma cobrança encontrada' : 'Nenhuma cobrança lançada'}</p>
          <p style={{ fontSize: 13 }}>As cobranças são criadas automaticamente ao confirmar agendamentos</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Vencimento</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const isAtrasado = c.status === 'pendente' && new Date(c.vencimento + 'T23:59:59') < new Date()
                const sc = statusConfig[c.status] || statusConfig.pendente
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{(c.clientes as any)?.nome || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {(c.agendamentos as any)?.servicos?.nome || '—'}
                    </td>
                    <td style={{ fontWeight: 700, color: isAtrasado ? '#DC2626' : 'inherit' }}>R$ {fmt(c.valor)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: isAtrasado ? '#FEE2E2' : sc.bg, color: isAtrasado ? '#DC2626' : sc.color }}>
                        {isAtrasado ? <AlertTriangle size={14}/> : sc.icon}{isAtrasado ? 'Atrasado' : sc.label}
                      </span>
                      {c.gateway_usado && c.status === 'pendente' && (
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          via {gatewayLabel[c.gateway_usado] || c.gateway_usado}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {c.vencimento ? new Date(c.vencimento + 'T00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.status === 'pendente' && (
                          <>
                            <button onClick={() => openPixModal(c)} className="btn btn-secondary btn-sm" title="Gerar PIX">
                              <QrCode size={14}/>
                            </button>
                            <button onClick={() => marcarPago(c.id, 'dinheiro')} className="btn btn-primary btn-sm">
                              <CheckCircle size={14}/> Receber
                            </button>
                          </>
                        )}
                        {c.status === 'pago' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                              ✓ {c.forma_pagamento && c.forma_pagamento !== 'pendente' ? formaLabels[c.forma_pagamento] : 'Pago'}
                            </span>
                            <button onClick={() => reverterPagamento(c.id)} className="btn btn-ghost btn-icon-sm" title="Reverter para Pendente">
                              <RefreshCw size={14} style={{ color: 'var(--color-text-muted)' }}/>
                            </button>
                          </div>
                        )}
                        <button onClick={() => openEditModal(c)} className="btn btn-ghost btn-icon-sm" title="Editar Cobrança">
                          <Edit2 size={14}/>
                        </button>
                        {!c.agendamento_id && (
                          <button onClick={() => excluirCobranca(c.id)} className="btn btn-ghost btn-icon-sm" style={{ color: '#DC2626' }} title="Excluir Permanentemente">
                            <Trash2 size={14}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PIX Modal */}
      {showPixModal && selected && (
        <div className="modal-overlay" onClick={closePixModal}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontFamily: 'Outfit', fontSize: 20 }}>Cobrar via PIX</h2>
                {pixData && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>via {gatewayLabel[pixData.gateway] || pixData.gateway}</p>}
              </div>
              <button onClick={closePixModal} className="btn btn-ghost btn-icon-sm">✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                {(selected.clientes as any)?.nome}
              </p>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-primary)', marginBottom: 20 }}>
                R$ {fmt(selected.valor)}
              </div>

              {pixLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
                  <Loader2 size={40} className="animate-spin" color="var(--color-primary)"/>
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Gerando QR Code PIX...</p>
                </div>
              )}

              {pixError && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', padding: '16px 0' }}>
                  <div style={{ display: 'flex', gap: 8, padding: '12px 14px', background: '#FEE2E2', borderRadius: 10, fontSize: 13, color: '#991B1B', textAlign: 'left' }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }}/>
                    <div>
                      <strong>Erro:</strong> {pixError}
                      {pixError.includes('Configuração PIX') && (
                        <div style={{ marginTop: 8 }}>
                          <Link href="/dashboard/configuracoes" style={{ color: '#1D4ED8', fontWeight: 600 }}>
                            → Configurar PIX nas Configurações
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {pixData && !pixLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {pixData.qr_base64 ? (
                      <img
                        src={`data:image/png;base64,${pixData.qr_base64}`}
                        alt="QR Code PIX"
                        style={{ width: 200, height: 200, borderRadius: 12, border: '2px solid var(--color-border)' }}
                      />
                    ) : (
                      <img
                        src={pixData.qr_url}
                        alt="QR Code PIX"
                        style={{ width: 200, height: 200, borderRadius: 12, border: '2px solid var(--color-border)' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    Escaneie o QR Code ou use o código abaixo
                  </p>

                  <div style={{ background: 'var(--color-surface-hover)', borderRadius: 10, padding: '10px 12px', textAlign: 'left', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Código PIX (Copia e Cola)</div>
                    <div style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--color-text)', fontFamily: 'monospace', maxHeight: 60, overflow: 'hidden', lineHeight: 1.4 }}>
                      {pixData.qr_code.slice(0, 80)}...
                    </div>
                  </div>

                  <button
                    onClick={() => copy(pixData.qr_code)}
                    className={`btn w-full ${copied ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ justifyContent: 'center' }}
                  >
                    <Copy size={14}/>
                    {copied ? '✓ Código copiado!' : 'Copiar código PIX'}
                  </button>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '8px 10px', background: '#F0FDF4', borderRadius: 8, fontSize: 12, color: '#166534' }}>
                    <Zap size={13}/>
                    O código expira em <strong>1 hora</strong>. Pagamento confirmado automaticamente.
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={closePixModal} className="btn btn-ghost">Fechar</button>
              {selected && (
                <button
                  onClick={() => marcarPago(selected.id, 'pix')}
                  className="btn btn-primary"
                >
                  <CheckCircle size={15}/> Confirmar Recebimento PIX
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Add Manual Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal animate-slideUp" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20 }}>Lançar Cobrança Manual</h2>
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost btn-icon-sm">✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Cliente (Opcional)</label>
                <select className="form-input form-select" value={addForm.cliente_id} onChange={e => handleSelectClient(e.target.value)}>
                  <option value="">Venda Avulsa / Balcão</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Descrição do Serviço/Venda *</label>
                <input className="form-input" placeholder="Ex: Corte masculino, Venda de Produto..." value={addForm.descricao} onChange={e => setAddForm(f => ({...f, descricao: e.target.value}))}/>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Valor (R$) *</label>
                  <input type="number" className="form-input" placeholder="0.00" value={addForm.valor} onChange={e => setAddForm(f => ({...f, valor: e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Data</label>
                  <input type="date" className="form-input" value={addForm.vencimento} onChange={e => setAddForm(f => ({...f, vencimento: e.target.value}))}/>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Forma de Pagamento</label>
                  <select className="form-input form-select" value={addForm.forma_pagamento} onChange={e => setAddForm(f => ({...f, forma_pagamento: e.target.value}))}>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input form-select" value={addForm.status} onChange={e => setAddForm(f => ({...f, status: e.target.value}))}>
                    <option value="pago">Já foi Pago</option>
                    <option value="pendente">Pendente (Receber depois)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAddModal(false)} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleSaveManual} disabled={addLoading || !addForm.descricao || !addForm.valor} className="btn btn-primary">
                {addLoading ? 'Salvando...' : 'Salvar Cobrança'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal animate-slideUp" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20 }}>Editar Cobrança</h2>
              <button onClick={() => setShowEditModal(false)} className="btn btn-ghost btn-icon-sm">✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '10px 12px', background: 'var(--color-surface-hover)', borderRadius: 10, fontSize: 13 }}>
                <strong>Cliente:</strong> {(editingCobranca?.clientes as any)?.nome || 'Venda Avulsa'}
              </div>
              
              <div className="form-group">
                <label className="form-label">Valor (R$) *</label>
                <input type="number" step="0.01" className="form-input" value={editForm.valor} onChange={e => setEditForm(f => ({...f, valor: e.target.value}))}/>
              </div>

              <div className="form-group">
                <label className="form-label">Data de Vencimento</label>
                <input type="date" className="form-input" value={editForm.vencimento} onChange={e => setEditForm(f => ({...f, vencimento: e.target.value}))}/>
              </div>

              <div className="form-group">
                <label className="form-label">Observações / Descrição</label>
                <input className="form-input" value={editForm.observacoes} onChange={e => setEditForm(f => ({...f, observacoes: e.target.value}))}/>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowEditModal(false)} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleSaveEdit} disabled={addLoading || !editForm.valor} className="btn btn-primary">
                {addLoading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
