'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Calendar, Search, RefreshCw, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'
import { cleanPayload } from '@/lib/utils'
import type { Colaborador } from '@/lib/types'

const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const cargos = ['Cabelereira','Manicure','Pedicure','Sobrancelha','Barba','Barbeiro','Esteticista','Recepcionista','Gerente','Outros']

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

const defaultHorarios = diasSemana.map((_, i) => ({
  dia_semana: i, entrada: '08:00', saida: '18:00', ativo: i >= 1 && i <= 5
}))

const emptyForm = {
  nome: '', cargo: 'Cabelereira', telefone: '', email: '',
  salario: '', comissao_percentual: '',
  horarios: defaultHorarios,
}

export default function ColaboradoresPage() {
  const { empresa } = useApp()
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<Colaborador | null>(null)
  const [viewSchedule, setViewSchedule] = useState<Colaborador | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saveError, setSaveError] = useState('')

  const load = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('colaboradores')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('ativo', true)
      .order('nome')
    setColaboradores((data || []) as Colaborador[])
    setLoading(false)
  }, [empresa])

  useEffect(() => { load() }, [load])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const openNew = () => {
    setSelected(null)
    setForm(emptyForm)
    setSaveError('')
    setShowModal(true)
  }

  const openEdit = (c: Colaborador) => {
    setSelected(c)
    setForm({
      nome: c.nome, cargo: c.cargo || 'Cabelereira',
      telefone: c.telefone || '', email: c.email || '',
      salario: String(c.salario || ''),
      comissao_percentual: String(c.comissao_percentual || ''),
      horarios: (c.horarios && c.horarios.length > 0) ? c.horarios : defaultHorarios,
    })
    setSaveError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!empresa) {
      setSaveError('Erro: Empresa não carregada. Tente recarregar a página.')
      return
    }
    if (!form.nome?.trim()) {
      setSaveError('O nome é obrigatório.')
      return
    }
    setSaving(true)
    setSaveError('')
    const supabase = createClient()
    const payload = cleanPayload({
      nome: form.nome,
      cargo: form.cargo,
      telefone: form.telefone,
      email: form.email,
      salario: parseFloat(form.salario) || 0,
      comissao_percentual: parseFloat(form.comissao_percentual) || 0,
      horarios: form.horarios,
      empresa_id: empresa.id
    })
    
    let error: any = null
    if (selected) {
      const { error: e } = await supabase.from('colaboradores').update(payload).eq('id', selected.id)
      error = e
    } else {
      const { error: e } = await supabase.from('colaboradores').insert({ ...payload, ativo: true })
      error = e
    }
    setSaving(false)
    if (error) {
      console.error('Erro ao salvar colaborador:', error)
      setSaveError(`Erro: ${error.message}`)
      return
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este colaborador?')) return
    await createClient().from('colaboradores').update({ ativo: false }).eq('id', id)
    load()
  }

  const searchLower = search.toLowerCase()
  const filtered = colaboradores.filter(c =>
    !search || [c.nome, c.cargo, c.telefone, c.email].some(v => v && v.toLowerCase().includes(searchLower))
  )

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Colaboradores</h1>
          <p className="page-subtitle">{colaboradores.length} colaboradores ativos</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn btn-ghost btn-icon" title="Atualizar"><RefreshCw size={16}/></button>
          <button onClick={openNew} className="btn btn-primary"><Plus size={16}/> Novo Colaborador</button>
        </div>
      </div>

      <div className="search-input-wrapper" style={{ marginBottom: 20, maxWidth: 440 }}>
        <Search size={16} className="search-icon"/>
        <input 
          id="search-colaboradores"
          className="form-input" 
          placeholder="Buscar por nome, cargo, e-mail..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          style={{ paddingLeft: 40 }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }}/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="card glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>👩‍💼</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Nenhum colaborador encontrado</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Tente outro termo de busca ou cadastre um novo colaborador.</p>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(c => (
            <div key={c.id} className="card glass-card animate-slideUp">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, textTransform: 'uppercase' }}>{c.cargo}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setViewSchedule(c)} className="btn btn-ghost btn-icon-sm" title="Horários"><Calendar size={14}/></button>
                  <button onClick={() => openEdit(c)} className="btn btn-ghost btn-icon-sm" title="Editar"><Edit2 size={14}/></button>
                  <button onClick={() => handleDelete(c.id)} className="btn btn-ghost btn-icon-sm text-danger" title="Excluir"><Trash2 size={14}/></button>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>📞 {c.telefone}</div>
                {c.email && <div>✉️ {c.email}</div>}
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span>Comissão: <strong>{c.comissao_percentual}%</strong></span>
                <span>Fixo: <strong>R$ {c.salario}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal animate-slideUp" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 className="modal-title">{selected ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
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
                    <label className="form-label" htmlFor="colab-nome">Nome completo *</label>
                    <input id="col-nome" className="form-input" required value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome do colaborador" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="colab-cargo">Cargo</label>
                    <select id="colab-cargo" className="form-input form-select" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}>
                      {cargos.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="colab-telefone">Telefone *</label>
                    <input id="col-tel" className="form-input" value={form.telefone} onChange={e => set('telefone', formatPhone(e.target.value))} placeholder="(00) 00000-0000" maxLength={15} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="colab-email">E-mail</label>
                    <input id="col-email" type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="colaborador@email.com" />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="colab-salario">Salário Fixo (R$)</label>
                    <input id="col-sal" type="number" className="form-input" value={form.salario} onChange={e => set('salario', e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="colab-comissao">Comissão (%)</label>
                    <input id="col-com" type="number" className="form-input" value={form.comissao_percentual} onChange={e => set('comissao_percentual', e.target.value)} placeholder="0" />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ marginBottom: 12, display: 'block' }}>Horário de Trabalho</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {form.horarios.map((h, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: h.ativo ? 'var(--color-primary-light)' : 'var(--color-surface-hover)', borderRadius: 10, transition: 'all 0.2s' }}>
                        <input type="checkbox" checked={h.ativo} onChange={e => {
                          const next = [...form.horarios]
                          next[i] = { ...next[i], ativo: e.target.checked }
                          setForm({ ...form, horarios: next })
                        }} />
                        <span style={{ width: 40, fontSize: 13, fontWeight: 700 }}>{diasSemana[h.dia_semana]}</span>
                        <input type="time" className="form-input" style={{ padding: '4px 8px', height: 'auto' }} value={h.entrada} disabled={!h.ativo} onChange={e => {
                          const next = [...form.horarios]
                          next[i] = { ...next[i], entrada: e.target.value }
                          setForm({ ...form, horarios: next })
                        }} />
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>até</span>
                        <input type="time" className="form-input" style={{ padding: '4px 8px', height: 'auto' }} value={h.saida} disabled={!h.ativo} onChange={e => {
                          const next = [...form.horarios]
                          next[i] = { ...next[i], saida: e.target.value }
                          setForm({ ...form, horarios: next })
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Salvando...' : 'Salvar Colaborador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {viewSchedule && (
        <div className="modal-overlay" onClick={() => setViewSchedule(null)}>
          <div className="modal modal-sm animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ fontSize: 18 }}>Escala: {viewSchedule.nome}</h2>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{viewSchedule.cargo}</p>
              </div>
              <button onClick={() => setViewSchedule(null)} className="btn btn-ghost btn-icon-sm">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {diasSemana.map((dia, i) => {
                  const h = (viewSchedule.horarios || []).find(h => h.dia_semana === i)
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 6 ? '1px solid var(--color-border)' : 'none' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{dia}</span>
                      {h?.ativo ? (
                        <span style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600 }}>
                          {h.entrada} → {h.saida}
                        </span>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Folga</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setViewSchedule(null)} className="btn btn-ghost">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
