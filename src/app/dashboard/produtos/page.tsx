'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Package, Search, RefreshCw, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'
import { cleanPayload, isPromocaoAtiva, getPrecoAtual } from '@/lib/utils'
import type { Produto } from '@/lib/types'

const categorias = ['Cabelo','Tratamento','Coloração','Unhas','Química','Estética','Outros']
const unidades = ['UN','KG','LT','FR','CX','MT']

const emptyForm = { nome: '', categoria: 'Cabelo', unidade: 'UN', preco_custo: '', preco_venda: '', estoque: '', descricao: '', em_promocao: false, valor_promocao: '', data_fim_promocao: '' }

export default function ProdutosPage() {
  const { empresa } = useApp()
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<Produto | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saveError, setSaveError] = useState('')

  const load = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('produtos').select('*').eq('empresa_id', empresa.id).eq('ativo', true).order('nome')
    setProdutos((data || []) as Produto[])
    setLoading(false)
  }, [empresa])

  useEffect(() => { load() }, [load])

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const openNew = () => { setSelected(null); setForm(emptyForm); setSaveError(''); setShowModal(true) }
  const openEdit = (p: Produto) => {
    setSelected(p)
    setForm({
      nome: p.nome,
      categoria: p.categoria || 'Cabelo',
      unidade: p.unidade || 'UN',
      preco_custo: String(p.preco_custo || ''),
      preco_venda: String(p.preco_venda),
      estoque: String(p.estoque || ''),
      descricao: p.descricao || '',
      em_promocao: !!p.em_promocao,
      valor_promocao: p.valor_promocao !== undefined && p.valor_promocao !== null ? String(p.valor_promocao) : '',
      data_fim_promocao: p.data_fim_promocao || ''
    })
    setSaveError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!empresa) {
      setSaveError('Erro: Empresa não carregada. Tente recarregar a página.')
      return
    }
    if (!form.nome?.trim() || !form.preco_venda?.trim()) {
      setSaveError('Nome e preço de venda são obrigatórios.')
      return
    }
    setSaving(true); setSaveError('')
    const supabase = createClient()
    const payload = cleanPayload({
      nome: form.nome,
      categoria: form.categoria,
      unidade: form.unidade,
      preco_custo: parseFloat(form.preco_custo) || 0,
      preco_venda: parseFloat(form.preco_venda),
      estoque: parseInt(form.estoque) || 0,
      descricao: form.descricao,
      empresa_id: empresa.id,
      em_promocao: !!form.em_promocao,
      valor_promocao: form.em_promocao && form.valor_promocao ? parseFloat(form.valor_promocao) : null,
      data_fim_promocao: form.em_promocao && form.data_fim_promocao ? form.data_fim_promocao : null
    })
    
    let error: any = null
    if (selected) {
      const { error: e } = await supabase.from('produtos').update(payload).eq('id', selected.id)
      error = e
    } else {
      const { error: e } = await supabase.from('produtos').insert({ ...payload, ativo: true, estoque_minimo: 3 })
      error = e
    }
    setSaving(false)
    if (error) {
      console.error('Erro ao salvar produto:', error)
      setSaveError(`Erro: ${error.message}`)
      return
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este produto?')) return
    await createClient().from('produtos').delete().eq('id', id)
    load()
  }

  const searchLower = search.toLowerCase()
  const filtered = produtos.filter(p =>
    !search || [p.nome, p.categoria, p.descricao, p.unidade].some(v => v && v.toLowerCase().includes(searchLower))
  )

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Produtos</h1>
          <p className="page-subtitle">{produtos.length} itens no estoque</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn btn-ghost btn-icon" title="Atualizar"><RefreshCw size={16}/></button>
          <button onClick={openNew} className="btn btn-primary"><Plus size={16}/> Novo Produto</button>
        </div>
      </div>

      <div className="search-input-wrapper" style={{ marginBottom: 20, maxWidth: 440 }}>
        <Search size={16} className="search-icon"/>
        <input 
          id="search-produtos"
          className="form-input" 
          placeholder="Buscar por nome, categoria..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ paddingLeft: 40 }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }}/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="card glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📦</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Nenhum produto encontrado</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Tente outro termo de busca ou cadastre um novo produto.</p>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(p => (
            <div key={p.id} className="card glass-card animate-slideUp">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{p.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>{p.categoria}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEdit(p)} className="btn btn-ghost btn-icon-sm" title="Editar"><Edit2 size={14}/></button>
                  <button onClick={() => handleDelete(p.id)} className="btn btn-ghost btn-icon-sm text-danger" title="Excluir"><Trash2 size={14}/></button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Estoque:</span>
                <span style={{ fontWeight: 700, color: (p.estoque || 0) <= 5 ? '#EF4444' : 'var(--color-text)' }}>{p.estoque || 0} {p.unidade}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>Preço Venda</span>
                <div>
                  {isPromocaoAtiva(p) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: 11, textDecoration: 'line-through', color: 'var(--color-text-muted)', fontWeight: 500 }}>R$ {p.preco_venda}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#E11D48' }}>R$ {p.valor_promocao}</span>
                        <span style={{ fontSize: 9, background: '#FFE4E6', color: '#E11D48', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>PROMO</span>
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>R$ {p.preco_venda}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal animate-slideUp" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">{selected ? 'Editar Produto' : 'Novo Produto'}</h2>
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
                  <label className="form-label" htmlFor="prod-nome">Nome do produto *</label>
                  <input id="prod-nome" className="form-input" required value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Shampoo 500ml" />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="prod-cat">Categoria</label>
                    <select id="prod-cat" className="form-input form-select" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="prod-un">Unidade</label>
                    <select id="prod-un" className="form-input form-select" value={form.unidade} onChange={e => set('unidade', e.target.value)}>
                      {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="prod-custo">Preço Custo (R$)</label>
                    <input id="prod-custo" type="number" className="form-input" value={form.preco_custo} onChange={e => set('preco_custo', e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="prod-venda">Preço Venda (R$) *</label>
                    <input id="prod-venda" type="number" className="form-input" required value={form.preco_venda} onChange={e => set('preco_venda', e.target.value)} placeholder="0.00" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="prod-estoque">Estoque Atual *</label>
                  <input id="prod-estoque" type="number" className="form-input" required value={form.estoque} onChange={e => set('estoque', e.target.value)} placeholder="0" />
                </div>

                <div style={{ background: 'var(--color-surface)', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    <input 
                      type="checkbox" 
                      checked={!!form.em_promocao} 
                      onChange={e => setForm(f => ({ ...f, em_promocao: e.target.checked }))}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                    Ativar promoção especial neste produto
                  </label>
                  
                  {form.em_promocao && (
                    <div className="grid-2 animate-fadeIn" style={{ gap: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" htmlFor="prod-val-promo" style={{ fontSize: 11 }}>Preço Promocional (R$) *</label>
                        <input 
                          id="prod-val-promo" 
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
                        <label className="form-label" htmlFor="prod-data-promo" style={{ fontSize: 11 }}>Data Final da Promoção</label>
                        <input 
                          id="prod-data-promo" 
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
                  <label className="form-label" htmlFor="prod-desc">Descrição</label>
                  <textarea id="prod-desc" className="form-input" style={{ minHeight: 80 }} value={form.descricao} onChange={e => set('descricao', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Salvando...' : 'Salvar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
