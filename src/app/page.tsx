'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Scissors, Star, Shield, Calendar, Users, TrendingUp, ChevronRight, Sparkles, CheckCircle } from 'lucide-react'

import { useApp } from '@/contexts/AppContext'

export default function HomePage() {
  const { themeMode } = useApp()
  const [activeFeature, setActiveFeature] = useState(0)

  const logoUrl = 'https://wldifxcwobyeqbvwatgr.supabase.co/storage/v1/object/public/img/logo.png'

  const features = [
    { icon: <Calendar size={24} />, title: 'Agenda Inteligente', desc: 'Visualize e gerencie todos os agendamentos do seu salão em tempo real.' },
    { icon: <Users size={24} />, title: 'Gestão de Clientes', desc: 'Cadastro completo com ficha de anamnese e histórico de serviços.' },
    { icon: <TrendingUp size={24} />, title: 'Relatórios', desc: 'Acompanhe ganhos, serviços populares e desempenho do seu negócio.' },
    { icon: <Shield size={24} />, title: 'Multi-empresa', desc: 'Cada salão tem seu ambiente isolado com dados seguros e privados.' },
  ]

  const plans = [
    { feature: 'Agenda de Agendamentos', ok: true },
    { feature: 'Cadastro de Clientes', ok: true },
    { feature: 'Gestão de Serviços', ok: true },
    { feature: 'Controle Financeiro', ok: true },
    { feature: 'Relatórios Completos', ok: true },
    { feature: 'Mensagens para Clientes', ok: true },
    { feature: 'Cadastro de Colaboradores', ok: true },
    { feature: 'Tema Personalizado', ok: true },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* Nav */}
      <nav className="nav-header" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center',
        height: 64, gap: 12
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', flex: 1, textDecoration: 'none', color: 'inherit' }}>
          <img src={logoUrl} alt="Agendei" style={{ width: 180, height: 'auto', maxHeight: 60, objectFit: 'contain', transform: 'scale(1.2)', transformOrigin: 'left center' }} />
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/cliente" className="btn btn-ghost btn-sm hide-on-mobile">Área do Cliente</Link>
          <Link href="/auth/login" className="btn btn-ghost btn-sm">Entrar</Link>
          <Link href="/auth/cadastro" className="btn btn-primary btn-sm">Começar Grátis</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: '80px 24px 60px',
        maxWidth: 1200, margin: '0 auto',
        textAlign: 'center'
      }}>
        <div className="animate-fadeIn" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          padding: '6px 16px', borderRadius: 99,
          fontSize: 13, fontWeight: 600, marginBottom: 24
        }}>
          <Sparkles size={14} />
          Sistema completo para profissionais de beleza
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontFamily: 'Outfit', fontWeight: 800, marginBottom: 20, lineHeight: 1.1 }}>
          Gerencie seu salão<br />
          <span className="gradient-text">com inteligência</span>
        </h1>
        <p style={{ fontSize: 18, color: 'var(--color-text-muted)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
          Agenda, clientes, financeiro, colaboradores e muito mais. Tudo em um só lugar, personalizado com as cores do seu salão.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth/cadastro" className="btn btn-primary btn-lg">
            Criar minha conta <ChevronRight size={18} />
          </Link>
          <Link href="/auth/login" className="btn btn-ghost btn-lg">
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* Mock Dashboard Preview */}
      <section style={{ maxWidth: 1100, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{
          background: 'var(--color-gradient)',
          borderRadius: 24, padding: 3,
          boxShadow: '0 32px 80px rgba(124,58,237,0.3)'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: 22, padding: 24,
          }} className="grid-4">
            {[
              { label: 'Agendamentos hoje', value: '12', color: '#7C3AED' },
              { label: 'A receber hoje', value: 'R$ 840', color: '#EC4899' },
              { label: 'Clientes ativos', value: '238', color: '#0891B2' },
              { label: 'Taxa de retorno', value: '87%', color: '#059669' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ border: `1px solid ${s.color}22`, gap: 6 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Outfit', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: '0 auto 80px', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(28px, 6vw, 36px)', fontFamily: 'Outfit', marginBottom: 48 }}>
          Tudo que você precisa para <span className="gradient-text">crescer</span>
        </h2>
        <div className="grid-4">
          {features.map((f, i) => (
            <div
              key={i}
              className="card"
              onClick={() => setActiveFeature(i)}
              style={{
                cursor: 'pointer',
                borderColor: activeFeature === i ? 'var(--color-primary)' : undefined,
                boxShadow: activeFeature === i ? 'var(--shadow-colored)' : undefined,
              }}
            >
              <div style={{
                width: 52, height: 52,
                background: 'var(--color-gradient)',
                borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', marginBottom: 16
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Incluso */}
      <section style={{ maxWidth: 600, margin: '0 auto 80px', padding: '0 24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <Star size={32} color="var(--color-primary)" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: 28, fontFamily: 'Outfit', marginBottom: 8 }}>Tudo incluso</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>Sem surpresas. Todos os módulos disponíveis.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            {plans.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <CheckCircle size={18} color="#059669" style={{ flexShrink: 0 }} />
                {p.feature}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <Link href="/auth/cadastro" className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
              Cadastrar meu salão agora <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--color-text-muted)',
        fontSize: 13
      }}>
        © 2026 Agendei · Sistema de Gestão para Serviços de Beleza e Estética!
      </footer>
    </div>
  )
}

