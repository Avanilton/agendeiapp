'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Search, RefreshCw, AlertCircle, Calendar, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'
import { cleanPayload } from '@/lib/utils'
import type { Despesa } from '@/lib/types'

const tipos = ['aluguel','salario','produto','equipamento','marketing','agua','energia','internet','outros']

const emptyForm = { descricao: '', valor: '', tipo: 'outros', vencimento: '', recorrente: false, periodicidade: 'mensal', pago: false }

export default function DespesasPage() {
  const { empresa } = useApp()
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<Despesa | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [saveError, setSaveError] = useState('')
  const [dtInicial, setDtInicial] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [dtFinal, setDtFinal] = useState(new Date().toISOString().split('T')[0])

  const load = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('despesas')
      .select('*')
      .eq('empresa_id', empresa.id)
      .gte('vencimento', dtInicial)
      .lte('vencimento', dtFinal)
      .order('vencimento')
    setDespesas((data || []) as Despesa[])
    setLoading(false)
  }, [empresa, dtInicial, dtFinal])

  useEffect(() => { load() }, [load])

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))
  
  const openNew = () => { setSelected(null); setForm(emptyForm); setSaveError(''); setShowModal(true) }
  const openEdit = (d: Despesa) => { setSelected(d); setForm({ ...d, valor: d.valor.toString(), periodicidade: d.periodicidade || 'mensal' }); setSaveError(''); setShowModal(true) }

  const handleSave = async () => {
    if (!empresa) {
      setSaveError('Erro: Empresa não carregada. Tente recarregar a página.')
      return
    }
    if (!form.descricao?.trim() || !form.valor?.toString().trim() || !form.vencimento?.trim()) {
      setSaveError('Descrição, valor e vencimento são obrigatórios.')
      return
    }
    setSaving(true); setSaveError('')
    const supabase = createClient()
    const payload = cleanPayload({
      empresa_id: empresa.id,
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      tipo: form.tipo,
      vencimento: form.vencimento,
      recorrente: form.recorrente,
      pago: form.pago,
      pago_em: form.pago ? new Date().toISOString() : null,
    })
    
    if (selected) {
        await supabase.from('despesas').update(payload).eq('id', selected.id)
    } else if (form.recorrente) {
        // Lógica para gerar 12 meses de despesas
        const payloads = []
        const baseDate = new Date(form.vencimento + 'T12:00:00')
        
        for (let i = 0; i < 12; i++) {
          const venc = new Date(baseDate)
          venc.setMonth(baseDate.getMonth() + i)
          payloads.push({
            ...payload,
            vencimento: venc.toISOString().split('T')[0],
            pago: i === 0 ? form.pago : false // Apenas a primeira pode vir paga
          })
        }
        await supabase.from('despesas').insert(payloads)
    } else {
        await supabase.from('despesas').insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta despesa?')) return
    await createClient().from('despesas').delete().eq('id', id)
    load()
  }

  const togglePago = async (d: Despesa) => {
    await createClient().from('despesas').update({ pago: !d.pago, pago_em: !d.pago ? new Date().toISOString() : null }).eq('id', d.id)
    load()
  }

  const searchLower = search.toLowerCase()
  const filtered = despesas.filter(d =>
    !search || [d.descricao, d.tipo].some(v => v && v.toLowerCase().includes(searchLower)) || d.valor.toString().includes(search)
  )

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Despesas</h1>
          <p className="page-subtitle">Controle de gastos e contas a pagar</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} className="btn btn-ghost btn-icon" title="Atualizar"><RefreshCw size={16}/></button>
          <button onClick={openNew} className="btn btn-primary"><Plus size={16}/> Nova Despesa</button>
        </div>
      </div>

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

        <div className="search-input-wrapper" style={{ flex: 1, maxWidth: 440 }}>
          <Search size={16} className="search-icon"/>
          <input 
            id="search-despesas"
            className="form-input" 
            placeholder="Buscar por descrição, tipo..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }}/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="card glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💸</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Nenhuma despesa encontrada</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Tente outro termo de busca ou registre uma nova despesa.</p>
        </div>
      ) : (
        <div className="card glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className={d.pago ? 'opacity-50' : ''}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {d.descricao}
                        {d.recorrente && <RefreshCw size={12} style={{ color: 'var(--color-primary)' }}/>}
                      </div>
                    </td>
                    <td><span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--color-surface-hover)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{d.tipo}</span></td>
                    <td style={{ fontWeight: 700, color: '#DC2626' }}>- R$ {d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style={{ fontSize: 13 }}>{new Date(d.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td>
                      <button onClick={() => togglePago(d)} className={`btn btn-sm ${d.pago ? 'btn-ghost' : 'btn-primary'}`} style={{ fontSize: 10, padding: '4px 10px', height: 'auto' }}>
                        {d.pago ? 'Paga' : 'Marcar como Paga'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(d)} className="btn btn-ghost btn-icon-sm" title="Editar"><Edit2 size={14}/></button>
                        <button onClick={() => handleDelete(d.id)} className="btn btn-ghost btn-icon-sm text-danger" title="Excluir"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal animate-slideUp" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">{selected ? 'Editar Despesa' : 'Nova Despesa'}</h2>
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
                  <label className="form-label" htmlFor="exp-desc">Descrição *</label>
                  <input id="exp-desc" className="form-input" required value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex: Aluguel do mês" />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="exp-tipo">Tipo</label>
                    <select id="exp-tipo" className="form-input form-select" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                      {tipos.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="exp-valor">Valor (R$) *</label>
                    <input id="exp-valor" type="number" className="form-input" required value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0.00" />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="exp-venc">Vencimento *</label>
                    <input id="exp-venc" type="date" className="form-input" required value={form.vencimento} onChange={e => set('vencimento', e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input id="exp-pago" type="checkbox" checked={form.pago} onChange={e => setForm({...form, pago: e.target.checked})} />
                      <label className="form-label" htmlFor="exp-pago" style={{ marginBottom: 0, cursor: 'pointer', fontSize: 13 }}>Já está paga?</label>
                    </div>
                    {!selected && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input id="exp-rec" type="checkbox" checked={form.recorrente} onChange={e => setForm({...form, recorrente: e.target.checked})} />
                        <label className="form-label" htmlFor="exp-rec" style={{ marginBottom: 0, cursor: 'pointer', fontSize: 13, color: 'var(--color-primary)', fontWeight: 600 }}>Repetir por 12 meses?</label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Salvando...' : 'Salvar Despesa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
