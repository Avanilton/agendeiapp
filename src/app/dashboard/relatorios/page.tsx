'use client'
import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, DollarSign, Users, Star, Gift, BarChart2, Award, Loader2, AlertCircle } from 'lucide-react'
import { useApp } from '@/contexts/AppContext'
import { createClient } from '@/lib/supabase/client'

export default function RelatoriosPage() {
  const { empresa } = useApp()
  const [activeTab, setActiveTab] = useState('financeiro')
  const [loading, setLoading] = useState(true)
  const [dtInicial, setDtInicial] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
  const [dtFinal, setDtFinal] = useState(new Date().toISOString().split('T')[0])

  // Estados dos Dados Reais
  const [financeiro, setFinanceiro] = useState({
    receita: 0,
    despesas: 0,
    despesasAberto: 0,
    lucro: 0,
    ticketMedio: 0,
    porForma: [] as { forma: string, valor: number, pct: number, color: string }[],
    recebido: 0,
    aReceber: 0
  })

  const [topServicos, setTopServicos] = useState<any[]>([])
  const [topClientes, setTopClientes] = useState<any[]>([])
  const [aniversariantes, setAniversariantes] = useState<any[]>([])

  const loadData = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    
    try {
      // 1. Agendamentos no período (com relações de ativos)
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('*, servicos(id, nome, ativo), clientes(id, nome, ativo)')
        .eq('empresa_id', empresa.id)
        .gte('data', dtInicial)
        .lte('data', dtFinal)
      
      // 2. Despesas no período
      const { data: despesas } = await supabase
        .from('despesas')
        .select('*')
        .eq('empresa_id', empresa.id)
        .gte('vencimento', dtInicial)
        .lte('vencimento', dtFinal)

      // 3. Cobranças no período (todas as cobranças para faturamento real)
      const { data: cobrancas } = await supabase
        .from('cobrancas')
        .select('*')
        .eq('empresa_id', empresa.id)
        .gte('vencimento', dtInicial)
        .lte('vencimento', dtFinal)

      // 4. Apenas campos necessários dos Clientes ativos (para aniversariantes)
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome, data_nascimento, telefone')
        .eq('empresa_id', empresa.id)
        .eq('ativo', true)

      if (agendamentos) {
        // Cálculo Financeiro
        const concluídos = agendamentos.filter(a => a.status === 'concluido')
        const pendentes = agendamentos.filter(a => ['agendado', 'confirmado', 'em_atendimento'].includes(a.status))
        
        const receitaTotal = cobrancas
          ?.filter(c => c.status !== 'cancelado')
          .reduce((acc, c) => acc + Number(c.valor), 0) || 0
        
        const valorRecebido = cobrancas
          ?.filter(c => c.status === 'pago')
          .reduce((acc, c) => acc + Number(c.valor), 0) || 0
        
        const valorAReceber = cobrancas
          ?.filter(c => c.status === 'pendente')
          .reduce((acc, c) => acc + Number(c.valor), 0) || 0
        const totalDespesasPagas = despesas?.filter(d => d.pago === true).reduce((acc, d) => acc + Number(d.valor), 0) || 0
        const totalDespesasAberto = despesas?.filter(d => d.pago !== true).reduce((acc, d) => acc + Number(d.valor), 0) || 0
        
        // Formas de Pagamento REAIS (agregando da tabela cobrancas)
        const formaMap: any = { 
          pix: { label: 'PIX', valor: 0, color: '#7C3AED' },
          dinheiro: { label: 'Dinheiro', valor: 0, color: '#059669' },
          cartao_credito: { label: 'Cartão Crédito', valor: 0, color: '#2563EB' },
          cartao_debito: { label: 'Cartão Débito', valor: 0, color: '#3B82F6' },
        }

        let totalPagoReal = 0
        cobrancas?.filter(c => c.status === 'pago').forEach(c => {
          const f = c.forma_pagamento || 'dinheiro'
          if (formaMap[f]) {
            formaMap[f].valor += Number(c.valor)
            totalPagoReal += Number(c.valor)
          }
        })

        const porFormaArray = Object.values(formaMap)
          .filter((f: any) => f.valor > 0)
          .map((f: any) => ({
            forma: f.label,
            valor: f.valor,
            pct: totalPagoReal > 0 ? (f.valor / totalPagoReal) * 100 : 0,
            color: f.color
          }))
          .sort((a: any, b: any) => b.valor - a.valor)

        setFinanceiro({
          receita: receitaTotal,
          despesas: totalDespesasPagas,
          despesasAberto: totalDespesasAberto,
          lucro: receitaTotal - totalDespesasPagas,
          ticketMedio: concluídos.length > 0 ? (valorRecebido / concluídos.length) : 0,
          recebido: valorRecebido,
          aReceber: valorAReceber,
          porForma: porFormaArray.length > 0 ? porFormaArray : [
            { forma: 'Sem dados', valor: 0, pct: 0, color: '#cbd5e1' }
          ]
        })

        // Ranking de Serviços (apenas ativos)
        const svcMap: any = {}
        concluídos.forEach(a => {
          if (a.servicos && a.servicos.ativo !== false) {
            const s = a.servicos
            if (!svcMap[s.id]) svcMap[s.id] = { nome: s.nome, count: 0, receita: 0 }
            svcMap[s.id].count++
            svcMap[s.id].receita += Number(a.valor)
          }
        })
        const svcArray = Object.values(svcMap).sort((a: any, b: any) => b.receita - a.receita).slice(0, 5)
        const maxReceita = svcArray.length > 0 ? (svcArray[0] as any).receita : 1
        setTopServicos(svcArray.map((s: any) => ({ ...s, pct: (s.receita / maxReceita) * 100 })))

        // Melhores Clientes (apenas ativos)
        const cliMap: any = {}
        concluídos.forEach(a => {
          if (a.clientes && a.clientes.ativo !== false) {
            const c = a.clientes
            if (!cliMap[c.id]) cliMap[c.id] = { nome: c.nome, visitas: 0, gasto: 0, avatar: c.nome[0] }
            cliMap[c.id].visitas++
            cliMap[c.id].gasto += Number(a.valor)
          }
        })
        setTopClientes(Object.values(cliMap).sort((a: any, b: any) => b.gasto - a.gasto).slice(0, 5))
      }

      if (clientes) {
        // Lógica de aniversariantes no período (comparando apenas dia e mês)
        const dIni = new Date(dtInicial + 'T00:00:00')
        const dFin = new Date(dtFinal + 'T23:59:59')
        
        const niverNoPeriodo = clientes.filter(c => {
          if (!c.data_nascimento) return false
          const bday = new Date(c.data_nascimento)
          
          // Criar uma data de aniversário no ano da consulta para comparar
          const currentYearBday = new Date(dIni.getFullYear(), bday.getUTCMonth(), bday.getUTCDate())
          
          return currentYearBday >= dIni && currentYearBday <= dFin
        })
        setAniversariantes(niverNoPeriodo)
      }

    } catch (err) {
      console.error('Erro ao carregar relatórios:', err)
    } finally {
      setLoading(false)
    }
  }, [empresa, dtInicial, dtFinal])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <p style={{ color: 'var(--color-text-muted)' }}>Gerando relatórios...</p>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Análise completa do seu negócio em tempo real</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface)', padding: '6px 12px', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <input type="date" className="form-input" style={{ border: 'none', padding: 0, background: 'transparent', width: 120 }} value={dtInicial} onChange={e => setDtInicial(e.target.value)}/>
            <span style={{ color: 'var(--color-text-muted)' }}>até</span>
            <input type="date" className="form-input" style={{ border: 'none', padding: 0, background: 'transparent', width: 120 }} value={dtFinal} onChange={e => setDtFinal(e.target.value)}/>
          </div>
          <button onClick={loadData} className="btn btn-secondary btn-sm">Filtrar</button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        {[
          { key: 'financeiro', label: '💰 Financeiro' },
          { key: 'servicos', label: '✂️ Serviços' },
          { key: 'clientes', label: '👥 Clientes' },
          { key: 'aniversariantes', label: '🎂 Aniversariantes' },
        ].map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Financial */}
      {activeTab === 'financeiro' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 8 }}>
            {[
              { label: 'Receita Bruta', value: `R$ ${financeiro.receita.toLocaleString('pt-BR')}`, icon: <DollarSign size={22}/>, color: '#059669' },
              { label: 'Despesas Pagas', value: `R$ ${financeiro.despesas.toLocaleString('pt-BR')}`, icon: <TrendingUp size={22}/>, color: '#DC2626' },
              { label: 'Despesas em Aberto', value: `R$ ${financeiro.despesasAberto.toLocaleString('pt-BR')}`, icon: <AlertCircle size={22}/>, color: '#EA580C' },
              { label: 'Lucro Estimado', value: `R$ ${financeiro.lucro.toLocaleString('pt-BR')}`, icon: <BarChart2 size={22}/>, color: '#7C3AED' },
              { label: 'Ticket Médio', value: `R$ ${financeiro.ticketMedio.toFixed(2)}`, icon: <Star size={22}/>, color: '#D97706' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-icon" style={{ background: `${s.color}15` }}><span style={{ color: s.color }}>{s.icon}</span></div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 style={{ fontFamily: 'Outfit', fontSize: 16, marginBottom: 16 }}>Status de Recebimento</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Concluído (Em Caixa)', valor: financeiro.recebido, total: financeiro.receita, color: '#059669' },
                  { label: 'Agendado (A Receber)', valor: financeiro.aReceber, total: financeiro.receita, color: '#D97706' },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: item.color }}>{item.label}</span>
                      <span style={{ fontWeight: 700 }}>R$ {item.valor.toLocaleString('pt-BR')}</span>
                    </div>
                    <div style={{ height: 10, background: 'var(--color-surface-hover)', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${(item.valor / (item.total || 1)) * 100}%`, background: item.color, borderRadius: 99 }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontFamily: 'Outfit', fontSize: 16, marginBottom: 16 }}>Formas de Pagamento</h3>
              {financeiro.porForma.map((f, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{f.forma}</span>
                    <span style={{ fontWeight: 700, color: f.color }}>R$ {f.valor.toLocaleString('pt-BR')}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--color-surface-hover)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${f.pct}%`, background: f.color, borderRadius: 99 }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Services */}
      {activeTab === 'servicos' && (
        <div className="card">
          <h3 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 20 }}>🏆 Ranking de Serviços</h3>
          {topServicos.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>Sem dados de serviços concluídos.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topServicos.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: i === 0 ? '#FEF3C7' : i === 1 ? '#F3F4F6' : i === 2 ? '#FEE2E2' : 'var(--color-surface-hover)',
                    color: i === 0 ? '#D97706' : i === 1 ? '#6B7280' : i === 2 ? '#DC2626' : 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 14, flexShrink: 0
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{s.nome}</span>
                      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{s.count} atendimentos · <strong style={{ color: '#059669' }}>R$ {s.receita.toLocaleString('pt-BR')}</strong></span>
                    </div>
                    <div style={{ height: 8, background: 'var(--color-surface-hover)', borderRadius: 99 }}>
                      <div style={{ height: '100%', width: `${s.pct}%`, background: 'var(--color-gradient)', borderRadius: 99, transition: 'width 0.6s' }}/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clients */}
      {activeTab === 'clientes' && (
        <div className="card">
          <h3 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 20 }}>⭐ Melhores Clientes</h3>
          {topClientes.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>Sem dados de clientes registrados.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topClientes.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--color-surface-hover)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: i === 0 ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'var(--color-gradient)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 16, flexShrink: 0
                  }}>
                    {c.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.visitas} visitas</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#059669' }}>R$ {c.gasto.toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Birthdays */}
      {activeTab === 'aniversariantes' && (
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 32 }}>🎂</div>
            <div>
              <h3 style={{ fontFamily: 'Outfit', fontSize: 18 }}>Aniversariantes no Período</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{aniversariantes.length} clientes fazem aniversário entre as datas selecionadas</p>
            </div>
          </div>
          <div className="grid-2">
            {aniversariantes.length === 0 ? <p style={{ color: 'var(--color-text-muted)', gridColumn: '1/-1' }}>Nenhum aniversariante encontrado para este mês.</p> : aniversariantes.map((a: any, i: number) => (
              <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #F59E0B, #EC4899)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  🎂
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a.nome}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Dia {new Date(a.data_nascimento).getUTCDate()}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{a.telefone}</div>
                </div>
                <button className="btn btn-secondary btn-sm">Enviar WhatsApp</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

