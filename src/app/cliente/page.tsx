'use client'
import { useState, useEffect, useCallback } from 'react'
import { Scissors, Calendar, Clock, CheckCircle, ChevronRight, QrCode, CreditCard, Search, MapPin, Phone, Mail, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Service {
  id: string
  nome: string
  preco: number
  duracao_minutos: number
  categoria: string
}

interface Salon {
  id: string
  nome: string
  endereco: string
  telefone: string
  cidade: string
  estado: string
}

export default function ClientePage() {
  const [step, setStep] = useState(0) // 0: Identificação, 1: Empresa, 2: Serviço, 3: Data/Hora, 4: Pagamento
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Identificação
  const [identifier, setIdentifier] = useState('')
  
  // Dados do Cliente (do Banco)
  const [clientRecords, setClientRecords] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<any>(null)
  
  // Seleção
  const [salons, setSalons] = useState<Salon[]>([])
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  // Step 0: Identificar cliente e buscar empresas
  useEffect(() => {
    if (confirmed) {
      const timer = setTimeout(() => {
        window.location.href = '/'
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [confirmed])

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) return
    setLoading(true); setError('')
    
    const supabase = createClient()
    const cleanId = identifier.replace(/\D/g, '')
    
    try {
      // Buscar cliente pelo telefone ou email
      const { data: clients, error: err } = await supabase
        .from('clientes')
        .select('*, empresas(*)')
        .or(`telefone.ilike.%${identifier}%,email.eq.${identifier}`)
      
      if (err) throw err
      
      if (!clients || clients.length === 0) {
        setError('Nenhum cadastro encontrado com esses dados. Verifique ou entre em contato com o salão.')
        setLoading(false)
        return
      }

      setClientRecords(clients)
      
      // Extrair empresas únicas
      const uniqueSalons: Salon[] = []
      const seen = new Set()
      
      clients.forEach(c => {
        if (c.empresas && !seen.has(c.empresas.id)) {
          uniqueSalons.push(c.empresas)
          seen.add(c.empresas.id)
        }
      })

      setSalons(uniqueSalons)
      
      if (uniqueSalons.length === 1) {
        setSelectedSalon(uniqueSalons[0])
        setSelectedClient(clients.find(c => c.empresa_id === uniqueSalons[0].id))
        await loadServices(uniqueSalons[0].id)
        setStep(2) // Pula direto pros serviços
      } else {
        setStep(1) // Escolher empresa
      }
    } catch (err: any) {
      setError('Erro ao buscar dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const loadServices = async (salonId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('servicos')
      .select('*')
      .eq('empresa_id', salonId)
      .eq('ativo', true)
    setServices(data || [])
  }

  const handleSelectSalon = async (salon: Salon) => {
    setSelectedSalon(salon)
    setSelectedClient(clientRecords.find(c => c.empresa_id === salon.id))
    setLoading(true)
    await loadServices(salon.id)
    setLoading(false)
    setStep(2)
  }

  const handleConfirm = async () => {
    if (!selectedSalon || !selectedService || !selectedClient || !selectedDate || !selectedTime) return
    
    setLoading(true); setError('')
    const supabase = createClient()
    
    try {
      // Calcular hora_fim com base na duração do serviço
      const [h, m] = selectedTime.split(':').map(Number)
      const date = new Date()
      date.setHours(h, m + (selectedService?.duracao_minutos || 30), 0, 0)
      const horaFim = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

      const { error: agdErr } = await supabase.from('agendamentos').insert({
        empresa_id: selectedSalon.id,
        cliente_id: selectedClient.id,
        servico_id: selectedService.id,
        data: selectedDate,
        hora_inicio: selectedTime,
        hora_fim: horaFim,
        valor: selectedService.preco,
        status: 'agendado'
      })

      if (agdErr) throw agdErr
      setConfirmed(true)
    } catch (err: any) {
      setError('Erro ao confirmar agendamento: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep(0); setConfirmed(false); setSelectedSalon(null); setSelectedService(null); 
    setSelectedDate(''); setSelectedTime(''); setFormaPagamento(''); setIdentifier('')
  }

  if (confirmed) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="animate-slideUp" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={40} color="#059669"/>
          </div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Tudo Pronto!</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 16, marginBottom: 24 }}>
            Seu horário foi reservado com sucesso no <strong>{selectedSalon?.nome}</strong>.
          </p>
          
          <div className="card" style={{ textAlign: 'left', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Serviço</span>
                <span style={{ fontWeight: 700 }}>{selectedService?.nome}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Data</span>
                <span style={{ fontWeight: 700 }}>{new Date(selectedDate).toLocaleDateString('pt-BR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Horário</span>
                <span style={{ fontWeight: 700 }}>{selectedTime}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                <span style={{ fontWeight: 700 }}>Valor</span>
                <span style={{ fontWeight: 800, color: '#059669' }}>R$ {selectedService?.preco}</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
            Enviamos um lembrete para o seu e-mail/WhatsApp. Te esperamos lá!<br/>
            <span style={{ opacity: 0.7, fontSize: 11 }}>Redirecionando para a página inicial em 5 segundos...</span>
          </p>

          <Link href="/" className="btn btn-primary w-full" style={{ justifyContent: 'center', textDecoration: 'none' }}>
            Finalizar e voltar ao site
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* Header Dinâmico */}
      <div style={{ background: 'var(--color-gradient)', padding: '24px 24px 60px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Scissors size={26} color="white"/>
          </div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: 26, fontWeight: 800, color: 'white', marginBottom: 4 }}>
            {selectedSalon ? selectedSalon.nome : 'Agendamento Online'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
            {selectedSalon ? `${selectedSalon.endereco}, ${selectedSalon.cidade}` : 'Agende seu serviço em poucos segundos'}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '-36px auto 0', padding: '0 24px 48px' }}>
        
        {/* Step 0: Identificação */}
        {step === 0 && (
          <div className="card animate-slideUp">
            <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 8 }}>Para começar...</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Informe seu e-mail ou WhatsApp para localizarmos seu cadastro.
            </p>

            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#FEE2E2', color: '#991B1B', padding: '12px 14px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
                <AlertCircle size={16} />{error}
              </div>
            )}

            <form onSubmit={handleIdentify} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">E-mail ou WhatsApp</label>
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  <input 
                    className="form-input" 
                    style={{ paddingLeft: 40 }}
                    placeholder="Ex: (11) 99999-9999 ou seu@email.com"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Continuar'}
              </button>
            </form>
          </div>
        )}

        {/* Step 1: Escolher Empresa */}
        {step === 1 && (
          <div className="card animate-slideUp">
            <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 8 }}>Escolha o estabelecimento</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Encontramos seu cadastro nos seguintes locais:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {salons.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => handleSelectSalon(s)}
                  className="card-item"
                  style={{ 
                    padding: 16, border: '1px solid var(--color-border)', borderRadius: 12, 
                    cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 14
                  }}
                >
                  <div style={{ width: 44, height: 44, background: 'var(--color-primary-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                    <MapPin size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{s.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{s.cidade} - {s.estado}</div>
                  </div>
                  <ChevronRight size={18} color="var(--color-text-muted)" />
                </div>
              ))}
            </div>
            <button onClick={() => setStep(0)} className="btn btn-ghost w-full" style={{ marginTop: 20, justifyContent: 'center' }}>Voltar</button>
          </div>
        )}

        {/* Step 2: Serviços */}
        {step === 2 && (
          <div className="card animate-slideUp">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20 }}>Escolha o serviço</h2>
              <button onClick={() => setStep(salons.length > 1 ? 1 : 0)} className="btn btn-ghost btn-sm">Trocar salão</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {services.length === 0 ? (
                <p style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>Nenhum serviço disponível no momento.</p>
              ) : services.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelectedService(s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${selectedService?.id === s.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: selectedService?.id === s.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{s.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      <Clock size={12} style={{ display: 'inline', marginRight: 4 }}/>{s.duracao_minutos}min · {s.categoria}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-primary)' }}>R$ {s.preco}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => selectedService && setStep(3)}
              disabled={!selectedService}
              className="btn btn-primary w-full"
              style={{ justifyContent: 'center', marginTop: 20 }}
            >
              Próximo Passo <ChevronRight size={16}/>
            </button>
          </div>
        )}

        {/* Step 3: Data e Hora */}
        {step === 3 && (
          <div className="card animate-slideUp">
            <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 20 }}>Escolha o horário</h2>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Data</label>
              <input type="date" className="form-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>

            {selectedDate && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00']
                    .filter(h => {
                      const isToday = selectedDate === new Date().toISOString().split('T')[0]
                      if (!isToday) return true
                      const [hour, min] = h.split(':').map(Number)
                      const now = new Date()
                      const slot = new Date()
                      slot.setHours(hour, min, 0, 0)
                      return slot > now
                    })
                    .map(h => (
                    <button
                      key={h}
                      onClick={() => setSelectedTime(h)}
                      style={{
                        padding: '12px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: selectedTime === h ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                        color: selectedTime === h ? 'white' : 'var(--color-text)',
                        fontWeight: 700, fontSize: 14, transition: 'all 0.2s'
                      }}
                    >
                      {h}
                    </button>
                  ))}
                </div>
                {['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00']
                  .filter(h => {
                    const isToday = selectedDate === new Date().toISOString().split('T')[0]
                    if (!isToday) return true
                    const [hour, min] = h.split(':').map(Number)
                    const now = new Date()
                    const slot = new Date()
                    slot.setHours(hour, min, 0, 0)
                    return slot > now
                  }).length === 0 && (
                  <p style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
                    Não há mais horários disponíveis para hoje. Por favor, escolha outra data.
                  </p>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => setStep(2)} className="btn btn-ghost flex-1" style={{ justifyContent: 'center' }}>Voltar</button>
              <button onClick={() => setStep(4)} disabled={!selectedDate || !selectedTime} className="btn btn-primary flex-2" style={{ justifyContent: 'center' }}>
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Pagamento */}
        {step === 4 && (
          <div className="card animate-slideUp">
            <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 8 }}>Como deseja pagar?</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>Escolha uma das opções abaixo para seu agendamento.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { value: 'pix', label: 'PIX (Online)', desc: 'Pagar agora e agilizar o atendimento', icon: <QrCode size={20}/> },
                { value: 'local', label: 'Pagar no Salão', desc: 'Pague após o serviço ser realizado', icon: <CreditCard size={20}/> },
              ].map(op => (
                <div
                  key={op.value}
                  onClick={() => setFormaPagamento(op.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '16px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${formaPagamento === op.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: formaPagamento === op.value ? 'var(--color-primary-light)' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ color: 'var(--color-primary)' }}>{op.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{op.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{op.desc}</div>
                  </div>
                  {formaPagamento === op.value && <CheckCircle size={20} color="var(--color-primary)"/>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(3)} className="btn btn-ghost flex-1" style={{ justifyContent: 'center' }}>Voltar</button>
              <button onClick={handleConfirm} disabled={!formaPagamento || loading} className="btn btn-primary flex-2" style={{ justifyContent: 'center' }}>
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Confirmar Agendamento'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

