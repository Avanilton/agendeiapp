'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, DollarSign, Clock, RefreshCw, Search, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'
import { cleanPayload, isPromocaoAtiva, getPrecoAtual } from '@/lib/utils'
import type { Servico, Pacote } from '@/lib/types'

const categorias = ['Corte','Coloração','Tratamento','Unhas','Estética','Sobrancelha','Barba','Outros']
const emptyServico = { nome: '', categoria: 'Corte', preco: '', duracao_minutos: '60', descricao: '', em_promocao: false, valor_promocao: '', data_fim_promocao: '' }

export default function ServicosPage() {
  const { empresa } = useApp()
  const [tab, setTab] = useState<'servicos' | 'pacotes'>('servicos')
  const [servicos, setServicos] = useState<Servico[]>([])
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showPacoteModal, setShowPacoteModal] = useState(false)
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null)
  const [selectedPacote, setSelectedPacote] = useState<Pacote | null>(null)
  const [form, setForm] = useState(emptyServico)
  const [search, setSearch] = useState('')
  const [saveError, setSaveError] = useState('')

  const [pacoteForm, setPacoteForm] = useState({
    nome: '', preco: '', validade_dias: '30', recorrente: false, descricao: '',
    servicos_ids: [] as string[]
  })

  const load = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const [{ data: svcs }, { data: pkgs }] = await Promise.all([
      supabase.from('servicos').select('*').eq('empresa_id', empresa.id).order('nome'),
      supabase.from('pacotes').select('*').eq('empresa_id', empresa.id).order('nome'),
    ])
    setServicos((svcs || []) as Servico[])
    setPacotes((pkgs || []) as Pacote[])
    setLoading(false)
  }, [empresa])

  useEffect(() => { load() }, [load])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const openNew = () => { setSelectedServico(null); setForm(emptyServico); setSaveError(''); setShowModal(true) }
  const openEdit = (s: Servico) => {
    setSelectedServico(s)
    setForm({
      nome: s.nome,
      categoria: s.categoria || 'Corte',
      preco: String(s.preco),
      duracao_minutos: String(s.duracao_minutos),
      descricao: s.descricao || '',
      em_promocao: !!s.em_promocao,
      valor_promocao: s.valor_promocao !== undefined && s.valor_promocao !== null ? String(s.valor_promocao) : '',
      data_fim_promocao: s.data_fim_promocao || ''
    })
    setSaveError('')
    setShowModal(true)
  }

  const openNewPacote = () => {
    setSelectedPacote(null)
    setPacoteForm({ nome: '', preco: '', validade_dias: '30', recorrente: false, descricao: '', servicos_ids: [] })
    setSaveError('')
    setShowPacoteModal(true)
  }

  const openEditPacote = (p: Pacote) => {
    setSelectedPacote(p)
    setPacoteForm({
      nome: p.nome,
      preco: String(p.preco),
      validade_dias: String(p.validade_dias),
      recorrente: p.recorrente,
      descricao: p.descricao || '',
      servicos_ids: p.servicos_ids || []
    })
    setSaveError('')
    setShowPacoteModal(true)
  }

  const handleSave = async () => {
    if (!empresa) {
      setSaveError('Erro: Empresa não carregada. Tente recarregar a página.')
      return
    }
    if (!form.nome?.trim() || !form.preco?.trim()) {
      setSaveError('Nome e preço são obrigatórios.')
      return
    }
    setSaving(true); setSaveError('')
    const supabase = createClient()
    const payload = cleanPayload({ 
      nome: form.nome, 
      categoria: form.categoria, 
      preco: parseFloat(form.preco), 
      duracao_minutos: parseInt(form.duracao_minutos), 
      descricao: form.descricao,
      empresa_id: empresa.id,
      em_promocao: !!form.em_promocao,
      valor_promocao: form.em_promocao && form.valor_promocao ? parseFloat(form.valor_promocao) : null,
      data_fim_promocao: form.em_promocao && form.data_fim_promocao ? form.data_fim_promocao : null
    })
    
    let error: any = null
    if (selectedServico) {
      const { error: e } = await supabase.from('servicos').update(payload).eq('id', selectedServico.id)
      error = e
    } else {
      const { error: e } = await supabase.from('servicos').insert({ ...payload, ativo: true })
      error = e
    }
    setSaving(false)
    if (error) {
      console.error('Erro ao salvar serviço:', error)
      setSaveError(`Erro: ${error.message}`)
      return
    }
    setShowModal(false)
    load()
  }

  const handleSavePacote = async () => {
    if (!empresa || !pacoteForm.nome || !pacoteForm.preco) {
      setSaveError('Nome e preço são obrigatórios.')
      return
    }
    setSaving(true); setSaveError('')
    const supabase = createClient()
    const payload = cleanPayload({
      empresa_id: empresa.id,
      nome: pacoteForm.nome,
      preco: parseFloat(pacoteForm.preco),
      validade_dias: parseInt(pacoteForm.validade_dias),
      recorrente: pacoteForm.recorrente,
      descricao: pacoteForm.descricao,
      servicos_ids: pacoteForm.servicos_ids,
      ativo: true
    })
    
    let error: any = null
    if (selectedPacote) {
      const { error: e } = await supabase.from('pacotes').update(payload).eq('id', selectedPacote.id)
      error = e
    } else {
      const { error: e } = await supabase.from('pacotes').insert(payload)
      error = e
    }
    
    setSaving(false)
    if (error) {
      console.error('Erro ao salvar pacote:', error)
      setSaveError(`Erro: ${error.message}`)
      return
    }
    setShowPacoteModal(false)
    load()
  }

  const searchLower = search.toLowerCase()
  const filteredServicos = servicos.filter(s => 
    !search || [s.nome, s.categoria, s.descricao].some(v => v && v.toLowerCase().includes(searchLower))
  )
  const filteredPacotes = pacotes.filter(p =>
    !search || [p.nome, p.descricao].some(v => v && v.toLowerCase().includes(searchLower))
  )

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este serviço?')) return
    await createClient().from('servicos').delete().eq('id', id)
    load()
  }

  const handleDeletePacote = async (id: string) => {
    if (!confirm('Excluir este pacote?')) return
    await createClient().from('pacotes').delete().eq('id', id)
    load()
  }

  const toggleAtivo = async (s: Servico) => {
    await createClient().from('servicos').update({ ativo: !s.ativo }).eq('id', s.id)
    load()
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Serviços & Pacotes</h1>
          <p className="page-subtitle">Configure seu catálogo de atendimentos</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn btn-ghost btn-icon" title="Atualizar"><RefreshCw size={16}/></button>
          <button onClick={tab === 'servicos' ? openNew : openNewPacote} className="btn btn-primary">
            <Plus size={16}/> {tab === 'servicos' ? 'Novo Serviço' : 'Novo Pacote'}
          </button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24, maxWidth: 320 }}>
        <button className={`tab ${tab === 'servicos' ? 'active' : ''}`} onClick={() => setTab('servicos')}>Serviços</button>
        <button className={`tab ${tab === 'pacotes' ? 'active' : ''}`} onClick={() => setTab('pacotes')}>Pacotes</button>
      </div>

      <div className="search-input-wrapper" style={{ marginBottom: 20, maxWidth: 440 }}>
        <Search size={16} className="search-icon"/>
        <input 
          id="search-servicos"
          className="form-input" 
          placeholder="Buscar por nome, categoria..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ paddingLeft: 40 }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }}/>)}</div>
      ) : tab === 'servicos' ? (
        filteredServicos.length === 0 ? (
          <div className="card glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✂️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Nenhum serviço encontrado</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Tente outro termo de busca ou cadastre um novo serviço.</p>
          </div>
        ) : (
          <div className="grid-3">
            {filteredServicos.map(s => (
              <div key={s.id} className={`card glass-card animate-slideUp ${!s.ativo ? 'opacity-50' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{s.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>{s.categoria}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEdit(s)} className="btn btn-ghost btn-icon-sm" title="Editar"><Edit2 size={14}/></button>
                    <button onClick={() => handleDelete(s.id)} className="btn btn-ghost btn-icon-sm text-danger" title="Excluir"><Trash2 size={14}/></button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <div>
                    {isPromocaoAtiva(s) ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 11, textDecoration: 'line-through', color: 'var(--color-text-muted)', fontWeight: 500 }}>R$ {s.preco}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: '#E11D48' }}>R$ {s.valor_promocao}</span>
                          <span style={{ fontSize: 9, background: '#FFE4E6', color: '#E11D48', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>PROMO</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>R$ {s.preco}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={12}/> {s.duracao_minutos} min
                  </div>
                </div>
                <button onClick={() => toggleAtivo(s)} className={`btn btn-sm ${s.ativo ? 'btn-ghost' : 'btn-primary'}`} style={{ width: '100%', marginTop: 16, justifyContent: 'center', fontSize: 11 }}>
                  {s.ativo ? 'Pausar Serviço' : 'Ativar Serviço'}
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        filteredPacotes.length === 0 ? (
          <div className="card glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎁</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Nenhum pacote encontrado</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Tente outro termo de busca ou cadastre um novo pacote.</p>
          </div>
        ) : (
          <div className="grid-3">
            {filteredPacotes.map(p => (
              <div key={p.id} className="card glass-card animate-slideUp">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{p.nome}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEditPacote(p)} className="btn btn-ghost btn-icon-sm" title="Editar"><Edit2 size={14}/></button>
                    <button onClick={() => handleDeletePacote(p.id)} className="btn btn-ghost btn-icon-sm text-danger" title="Excluir"><Trash2 size={14}/></button>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>{p.descricao}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>R$ {p.preco}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    {p.validade_dias} dias
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal Serviço */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal animate-slideUp" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedServico ? 'Editar Serviço' : 'Novo Serviço'}</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon-sm">✕</button>
            </div>
            
            <div className="modal-body">
              {saveError && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <AlertCircle size={16}/> {saveError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="svc-nome">Nome do serviço *</label>
                  <input id="svc-nome" className="form-input" required value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Corte Feminino" />
                </div>
                
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="svc-cat">Categoria</label>
                    <select id="svc-cat" className="form-input form-select" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="svc-preco">Preço (R$) *</label>
                    <input id="svc-preco" type="number" className="form-input" required value={form.preco} onChange={e => set('preco', e.target.value)} placeholder="0.00" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="svc-duracao">Duração (minutos)</label>
                  <select id="svc-duracao" className="form-input form-select" value={form.duracao_minutos} onChange={e => set('duracao_minutos', e.target.value)}>
                    {[15,30,45,60,75,90,120,150,180,240].map(m => <option key={m} value={m}>{m} minutos</option>)}
                  </select>
                </div>

                <div style={{ background: 'var(--color-surface)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    <input 
                      type="checkbox" 
                      checked={!!form.em_promocao} 
                      onChange={e => setForm(f => ({ ...f, em_promocao: e.target.checked }))}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                    Ativar promoção especial neste serviço
                  </label>
                  
                  {form.em_promocao && (
                    <div className="grid-2 animate-fadeIn" style={{ gap: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="svc-val-promo" style={{ fontSize: 11 }}>Preço Promocional (R$) *</label>
                        <input 
                          id="svc-val-promo" 
                          type="number" 
                          className="form-input" 
                          required 
                          value={form.valor_promocao} 
                          onChange={e => set('valor_promocao', e.target.value)} 
                          placeholder="0.00" 
                          style={{ height: 36, fontSize: 12 }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="svc-data-promo" style={{ fontSize: 11 }}>Data Final da Promoção</label>
                        <input 
                          id="svc-data-promo" 
                          type="date" 
                          className="form-input" 
                          value={form.data_fim_promocao} 
                          onChange={e => set('data_fim_promocao', e.target.value)} 
                          style={{ height: 36, fontSize: 12 }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="svc-desc">Descrição</label>
                  <textarea id="svc-desc" className="form-input" style={{ minHeight: 80 }} value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Breve descrição do serviço..." />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Salvando...' : 'Salvar Serviço'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pacote */}
      {showPacoteModal && (
        <div className="modal-overlay">
          <div className="modal animate-slideUp" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedPacote ? 'Editar Pacote' : 'Novo Pacote'}</h2>
              <button onClick={() => setShowPacoteModal(false)} className="btn btn-ghost btn-icon-sm">✕</button>
            </div>

            <div className="modal-body">
              {saveError && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <AlertCircle size={16}/> {saveError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="pkg-nome">Nome do pacote *</label>
                  <input id="pkg-nome" className="form-input" required value={pacoteForm.nome} onChange={e => setPacoteForm({...pacoteForm, nome: e.target.value})} placeholder="Ex: Combo Noiva" />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="pkg-preco">Preço promocional (R$) *</label>
                    <input id="pkg-preco" type="number" className="form-input" required value={pacoteForm.preco} onChange={e => setPacoteForm({...pacoteForm, preco: e.target.value})} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="pkg-validade">Validade (dias)</label>
                    <input id="pkg-validade" type="number" className="form-input" value={pacoteForm.validade_dias} onChange={e => setPacoteForm({...pacoteForm, validade_dias: e.target.value})} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Serviços Inclusos</label>
                  <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 10, padding: 8 }}>
                    {servicos.map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={pacoteForm.servicos_ids.includes(s.id)}
                          onChange={e => {
                            const ids = e.target.checked 
                              ? [...pacoteForm.servicos_ids, s.id]
                              : pacoteForm.servicos_ids.filter(id => id !== s.id)
                            setPacoteForm({...pacoteForm, servicos_ids: ids})
                          }}
                        />
                        <span style={{ fontSize: 13 }}>{s.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="pkg-desc">Descrição</label>
                  <textarea id="pkg-desc" className="form-input" style={{ minHeight: 80 }} value={pacoteForm.descricao} onChange={e => setPacoteForm({...pacoteForm, descricao: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowPacoteModal(false)} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleSavePacote} disabled={saving} className="btn btn-primary">
                {saving ? 'Salvando...' : 'Salvar Pacote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
