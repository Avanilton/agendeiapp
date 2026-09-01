'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, FileText, Edit2, Trash2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'
import { cleanPayload } from '@/lib/utils'
import type { Cliente } from '@/lib/types'

const anamneseFields = [
  { key: 'alergias', label: 'Alergias' },
  { key: 'problemas_capilares', label: 'Problemas Capilares' },
  { key: 'quimicas_recentes', label: 'Químicas Recentes' },
  { key: 'medicamentos', label: 'Medicamentos em uso' },
  { key: 'gestante', label: 'Gestante?', tipo: 'select' },
  { key: 'sensibilidade', label: 'Sensibilidade no couro cabeludo' },
  { key: 'observacoes', label: 'Observações adicionais', tipo: 'textarea' },
]

const emptyForm = { 
  nome: '', 
  telefone: '', 
  email: '', 
  data_nascimento: '', 
  sexo: '', 
  cpf_cnpj: '', 
  endereco: '', 
  cidade: '', 
  estado: '', 
  cep: '', 
  observacoes: '' 
}

// Phone mask: (00) 00000-0000
function formatPhone(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

export default function ClientesPage() {
  const { empresa } = useApp()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showAnamnese, setShowAnamnese] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [anamnese, setAnamnese] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState('')

  const load = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('nome')
    if (!error) setClientes(data || [])
    setLoading(false)
  }, [empresa])

  useEffect(() => { load() }, [load])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const openNew = () => {
    setSelectedClient(null)
    setForm({ nome: '', telefone: '', email: '', data_nascimento: '', sexo: '', cpf_cnpj: '', endereco: '', cidade: '', estado: '', cep: '', observacoes: '' })
    setSaveError('')
    setShowModal(true)
  }
  const openEdit = (c: Cliente) => {
    setSelectedClient(c)
    setForm({ 
      nome: c.nome || '', 
      telefone: c.telefone || '', 
      email: c.email || '', 
      data_nascimento: c.data_nascimento || '', 
      sexo: c.sexo || '', 
      cpf_cnpj: c.cpf_cnpj || '', 
      endereco: c.endereco || '', 
      cidade: c.cidade || '', 
      estado: c.estado || '', 
      cep: c.cep || '', 
      observacoes: c.observacoes || '' 
    })
    setSaveError('')
    setShowModal(true)
  }
  const openAnamnese = (c: Cliente) => { setSelectedClient(c); setAnamnese((c.anamnese as Record<string,string>) || {}); setShowAnamnese(true) }

  const handleSave = async () => {
    if (!empresa) {
      setSaveError('Erro: Empresa não carregada. Tente recarregar a página.')
      return
    }
    if (!form.nome?.trim() || !form.telefone?.trim()) {
      setSaveError('Nome e telefone são obrigatórios.')
      return
    }
    setSaving(true)
    setSaveError('')
    const supabase = createClient()
    
    // Limpar campos vazios para não dar erro de constraint (ex: data_nascimento, sexo)
    const payload = cleanPayload({ ...form, empresa_id: empresa.id })
    
    let error: any = null
    if (selectedClient) {
      const { error: e } = await supabase.from('clientes').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', selectedClient.id)
      error = e
    } else {
      const { error: e } = await supabase.from('clientes').insert({ ...payload, ativo: true })
      error = e
    }
    setSaving(false)
    if (error) {
      console.error('Erro ao salvar cliente:', error)
      setSaveError(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`)
      return
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este cliente? Esta ação não pode ser desfeita.')) return
    const supabase = createClient()
    await supabase.from('clientes').delete().eq('id', id)
    load()
  }

  const handleSaveAnamnese = async () => {
    if (!selectedClient) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('clientes').update({ anamnese, updated_at: new Date().toISOString() }).eq('id', selectedClient.id)
    setSaving(false)
    setShowAnamnese(false)
    load()
  }

  // Search across all text fields
  const searchLower = search.toLowerCase()
  const filtered = clientes.filter(c =>
    !search || [c.nome, c.telefone, c.email, c.endereco, c.cidade, c.estado, c.observacoes].some(v => v && v.toLowerCase().includes(searchLower))
  )

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">{clientes.length} clientes cadastrados</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn btn-ghost btn-icon" title="Atualizar"><RefreshCw size={16}/></button>
          <button onClick={openNew} className="btn btn-primary"><Plus size={16}/> Novo Cliente</button>
        </div>
      </div>

      <div className="search-input-wrapper" style={{ marginBottom: 20, maxWidth: 440 }}>
        <Search size={16} className="search-icon"/>
        <input 
          id="search-clientes"
          name="search-clientes"
          autoComplete="off"
          className="form-input" 
          placeholder="Buscar por nome, telefone, email, endereço..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ paddingLeft: 40 }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }}/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="card glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👥</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Nenhum cliente encontrado</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Tente outro termo de busca ou cadastre um novo cliente.</p>
        </div>
      ) : (
        <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th>Localização</th>
                  <th>Aniversário</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nome}</div>
                      {c.observacoes && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.observacoes}</div>}
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{c.telefone}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.email}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{c.cidade} - {c.estado}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{c.data_nascimento ? new Date(c.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : '-'}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => openAnamnese(c)} className="btn btn-ghost btn-icon-sm" title="Anamnese"><FileText size={14}/></button>
                        <button onClick={() => openEdit(c)} className="btn btn-ghost btn-icon-sm" title="Editar"><Edit2 size={14}/></button>
                        <button onClick={() => handleDelete(c.id)} className="btn btn-ghost btn-icon-sm text-danger" title="Excluir"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal animate-slideUp" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-icon-sm">✕</button>
            </div>
            
            <div className="modal-body">
              {saveError && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <AlertCircle size={16}/> {saveError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="client-nome">Nome completo *</label>
                    <input 
                      id="client-nome"
                      name="client-nome"
                      autoComplete="name"
                      className="form-input" 
                      required 
                      value={form.nome} 
                      onChange={e => set('nome', e.target.value)} 
                      placeholder="Nome do cliente" 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="client-telefone">Telefone *</label>
                    <input 
                      id="client-telefone"
                      name="client-telefone"
                      autoComplete="tel"
                      className="form-input" 
                      required 
                      value={form.telefone} 
                      onChange={e => set('telefone', formatPhone(e.target.value))} 
                      placeholder="(00) 00000-0000" 
                      maxLength={15} 
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="client-email">E-mail</label>
                    <input 
                      id="client-email"
                      name="client-email"
                      autoComplete="email"
                      type="email" 
                      className="form-input" 
                      value={form.email} 
                      onChange={e => set('email', e.target.value)} 
                      placeholder="cliente@email.com" 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="client-nascimento">Data de Nascimento</label>
                    <input 
                      id="client-nascimento"
                      name="client-nascimento"
                      autoComplete="bday"
                      type="date" 
                      className="form-input" 
                      value={form.data_nascimento} 
                      onChange={e => set('data_nascimento', e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="client-sexo">Sexo</label>
                    <select 
                      id="client-sexo"
                      name="client-sexo"
                      autoComplete="sex"
                      className="form-input form-select" 
                      value={form.sexo} 
                      onChange={e => set('sexo', e.target.value)} 
                    >
                      <option value="">Selecione</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="O">Outro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="client-endereco">Endereço</label>
                    <input 
                      id="client-endereco"
                      name="client-endereco"
                      autoComplete="street-address"
                      className="form-input" 
                      value={form.endereco} 
                      onChange={e => set('endereco', e.target.value)} 
                      placeholder="Rua, número, bairro" 
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="client-cidade">Cidade</label>
                    <input 
                      id="client-cidade"
                      name="client-cidade"
                      autoComplete="address-level2"
                      className="form-input" 
                      value={form.cidade} 
                      onChange={e => set('cidade', e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="client-estado">Estado</label>
                    <select 
                      id="client-estado"
                      name="client-estado"
                      autoComplete="address-level1"
                      className="form-input form-select" 
                      value={form.estado} 
                      onChange={e => set('estado', e.target.value)} 
                    >
                      <option value="">Selecione</option>
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="client-obs">Observações</label>
                  <textarea 
                    id="client-obs"
                    name="client-obs"
                    className="form-input" 
                    style={{ minHeight: 80, resize: 'vertical' }} 
                    value={form.observacoes} 
                    onChange={e => set('observacoes', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Salvando...' : 'Salvar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anamnese Modal */}
      {showAnamnese && selectedClient && (
        <div className="modal-overlay" onClick={() => setShowAnamnese(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontFamily: 'Outfit', fontSize: 20 }}>Ficha de Anamnese</h2>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{selectedClient.nome}</p>
              </div>
              <button onClick={() => setShowAnamnese(false)} className="btn btn-ghost btn-icon-sm">✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '12px 14px', background: 'var(--color-primary-light)', borderRadius: 10, fontSize: 13, color: 'var(--color-primary)' }}>
                📋 Esta ficha ajuda a personalizar o atendimento e garantir a segurança do cliente.
              </div>
              {anamneseFields.map(f => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  {f.tipo === 'select' ? (
                    <select className="form-input form-select" value={anamnese[f.key] || ''} onChange={e => setAnamnese(a => ({ ...a, [f.key]: e.target.value }))}>
                      <option value="">Não informado</option>
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                      <option value="nao_sei">Não sei</option>
                    </select>
                  ) : f.tipo === 'textarea' ? (
                    <textarea className="form-input form-textarea" value={anamnese[f.key] || ''} onChange={e => setAnamnese(a => ({ ...a, [f.key]: e.target.value }))} placeholder={`Informe ${f.label.toLowerCase()}...`}/>
                  ) : (
                    <input className="form-input" value={anamnese[f.key] || ''} onChange={e => setAnamnese(a => ({ ...a, [f.key]: e.target.value }))} placeholder={`Informe ${f.label.toLowerCase()}...`}/>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAnamnese(false)} className="btn btn-ghost">Fechar</button>
              <button onClick={handleSaveAnamnese} disabled={saving} className="btn btn-primary">
                {saving ? 'Salvando…' : 'Salvar Ficha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
