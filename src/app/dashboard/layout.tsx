'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar, Users, CreditCard, MessageSquare,
  Package, ShoppingBag, TrendingDown, UserCheck,
  BarChart2, Settings, Scissors, ChevronLeft,
  ChevronRight, Bell, Sun, Moon, Menu, X, HelpCircle, LogOut, ArrowLeft, CheckCircle
} from 'lucide-react'
import { useApp } from '@/contexts/AppContext'

const navItems = [
  { section: 'Principal', items: [
    { icon: <Calendar size={18}/>, label: 'Agenda', href: '/dashboard' },
    { icon: <Users size={18}/>, label: 'Clientes', href: '/dashboard/clientes' },
    { icon: <CreditCard size={18}/>, label: 'Cobranças', href: '/dashboard/cobrancas' },
    { icon: <MessageSquare size={18}/>, label: 'Mensagens', href: '/dashboard/mensagens' },
  ]},
  { section: 'Gestão', items: [
    { icon: <Package size={18}/>, label: 'Serviços / Pacotes', href: '/dashboard/servicos' },
    { icon: <ShoppingBag size={18}/>, label: 'Produtos', href: '/dashboard/produtos' },
    { icon: <TrendingDown size={18}/>, label: 'Despesas', href: '/dashboard/despesas' },
    { icon: <UserCheck size={18}/>, label: 'Colaboradores', href: '/dashboard/colaboradores' },
  ]},
  { section: 'Análise', items: [
    { icon: <BarChart2 size={18}/>, label: 'Relatórios', href: '/dashboard/relatorios' },
  ]},
  { section: 'Sistema', items: [
    { icon: <Settings size={18}/>, label: 'Configurações', href: '/dashboard/configuracoes' },
    { icon: <HelpCircle size={18}/>, label: 'Ajuda & Suporte', href: '/dashboard/ajuda' },
  ]},
]

import { createClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { empresa, themeMode, setThemeMode, sidebarCollapsed, setSidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen, loading, logout } = useApp()
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  const logoUrl = themeMode === 'dark'
    ? 'https://wldifxcwobyeqbvwatgr.supabase.co/storage/v1/object/public/img/logo.png'
    : 'https://wldifxcwobyeqbvwatgr.supabase.co/storage/v1/object/public/img/logopb.png'

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!empresa) return
    const supabase = createClient()
    
    const loadRecent = async () => {
      const { data } = await supabase
        .from('agendamentos')
        .select('id, data, hora_inicio, clientes(nome), servicos(nome)')
        .eq('empresa_id', empresa.id)
        .order('id', { ascending: false })
        .limit(3)
      if (data) {
        setNotifications(data.map((a: any) => ({
          id: a.id,
          title: 'Novo Agendamento',
          desc: `${a.clientes?.nome || 'Cliente'} marcou ${a.servicos?.nome || 'Serviço'}`,
          time: `${a.data.split('-').reverse().join('/')} às ${a.hora_inicio}`,
          read: true
        })))
      }
    }
    loadRecent()

    const channel = supabase.channel('notificacoes-agendamento')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'agendamentos',
        filter: `empresa_id=eq.${empresa.id}` 
      }, async (payload) => {
        const { data } = await supabase
          .from('agendamentos')
          .select('id, data, hora_inicio, clientes(nome), servicos(nome)')
          .eq('id', payload.new.id)
          .single()
        
        if (data) {
          setNotifications(prev => [{
            id: data.id,
            title: 'Novo Agendamento',
            desc: `${(data.clientes as any)?.nome || 'Cliente'} marcou ${(data.servicos as any)?.nome || 'Serviço'}`,
            time: `${data.data.split('-').reverse().join('/')} às ${data.hora_inicio}`,
            read: false
          }, ...prev].slice(0, 5))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [empresa])

  const isActive = (href: string) => href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const [showWelcome, setShowWelcome] = useState(false)
  
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('just_logged_in') === 'true') {
      setShowWelcome(true)
      sessionStorage.removeItem('just_logged_in')
      const t = setTimeout(() => setShowWelcome(false), 4000)
      return () => clearTimeout(t)
    }
  }, [])

  const sidebarClasses = [
    'sidebar',
    sidebarCollapsed && !isMobile ? 'collapsed' : '',
    isMobile && mobileSidebarOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="app-layout">
      {/* Toast de Boas-vindas */}
      {showWelcome && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: 'var(--color-primary)', color: 'white',
          padding: '16px 24px', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: '50%' }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Bem-vindo de volta!</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Login realizado com sucesso no Agendei.</div>
          </div>
          <button onClick={() => setShowWelcome(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4, marginLeft: 8 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* Sidebar */}
      <aside className={sidebarClasses}>
        <div className="sidebar-header">
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }} title="Ir para o Início">
            <div className="sidebar-brand" style={{ overflow: 'hidden', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <img 
                src={empresa?.logo_url || logoUrl} 
                alt={empresa?.nome || "Agendei"} 
                style={
                  empresa?.logo_url 
                    ? { width: '100%', maxWidth: 160, height: 'auto', maxHeight: 48, objectFit: 'contain', objectPosition: 'left' }
                    : { width: '100%', maxWidth: 160, height: 'auto', maxHeight: 48, objectFit: 'contain', objectPosition: 'left', transform: 'scale(1.3)', transformOrigin: 'left center' }
                } 
              />
              {empresa && (
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 4 }}>
                  {empresa.nome}
                </div>
              )}
            </div>
          </Link>
          {!isMobile && (
            <button
              id="sidebar-toggle-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="btn btn-ghost btn-icon-sm"
              style={{ flexShrink: 0 }}
              title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {sidebarCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
            </button>
          )}
          {isMobile && (
            <button onClick={() => setMobileSidebarOpen(false)} className="btn btn-ghost btn-icon-sm">
              <X size={16}/>
            </button>
          )}
        </div>

        <div style={{ padding: '0 8px 12px' }}>
          <Link href="/" className="btn btn-ghost btn-sm w-full" style={{ justifyContent: 'flex-start', gap: 8, fontSize: 12, opacity: 0.7 }} title={sidebarCollapsed && !isMobile ? "Voltar para o Site" : undefined}>
             <ArrowLeft size={14} style={{ flexShrink: 0 }}/>
             <span className="nav-label" style={{ whiteSpace: 'nowrap' }}>Voltar para o Site</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(section => (
            <div key={section.section} className="nav-section">
              <div className="nav-section-label">{section.section}</div>
              {section.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                  onClick={() => isMobile && setMobileSidebarOpen(false)}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User info & Logout */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, background: 'var(--color-gradient)',
              borderRadius: 10, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'white', fontSize: 12,
              fontWeight: 700, flexShrink: 0, overflow: 'hidden'
            }}>
              {empresa?.foto_perfil_url ? (
                <img src={empresa.foto_perfil_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Perfil" />
              ) : (
                loading ? '…' : empresa?.nome?.[0] || 'A'
              )}
            </div>
            <div className="nav-label" style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {empresa?.nome || 'Minha Empresa'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Administrador</div>
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              logout()
            }}
            className="btn btn-ghost btn-sm w-full"
            style={{ 
              justifyContent: 'flex-start', 
              gap: 10, 
              color: 'var(--color-text-muted)',
              padding: '10px 12px',
              height: 'auto'
            }}
            title="Sair do sistema"
          >
            <LogOut size={16}/>
            <span className="nav-label">Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* Floating expand button */}
      {!isMobile && sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="animate-fadeIn"
          title="Expandir menu"
          style={{
            position: 'fixed',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 999,
            width: 30,
            height: 60,
            background: 'var(--color-primary)',
            border: 'none',
            borderRadius: '0 10px 10px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '4px 0 12px rgba(0,0,0,0.2)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.width = '40px'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.width = '30px'}
        >
          <ChevronRight size={20}/>
        </button>
      )}

      {/* Main */}
      <div className={`main-content ${sidebarCollapsed && !isMobile ? 'sidebar-collapsed' : ''}`}>
        {/* Header */}
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <button onClick={() => setMobileSidebarOpen(true)} className="btn btn-ghost btn-icon">
                <Menu size={20}/>
              </button>
            )}
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }} title="Página Inicial">
              <img 
                src={empresa?.logo_url || logoUrl} 
                alt={empresa?.nome || "Agendei"} 
                style={
                  empresa?.logo_url
                    ? { width: 140, height: 'auto', maxHeight: 44, objectFit: 'contain' }
                    : { width: 140, height: 'auto', maxHeight: 44, objectFit: 'contain', transform: 'scale(1.3)', transformOrigin: 'left center' }
                } 
              />
            </Link>
          </div>

          <div className="header-actions">
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-ghost btn-icon" 
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu)
                  if (!showNotifMenu) {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                  }
                }}
                style={{ position: 'relative' }} 
                id="notif-bell-btn" 
                title="Notificações"
              >
                <Bell size={18}/>
                {unreadCount > 0 && (
                  <span className="notif-dot" style={{ 
                    position: 'absolute', top: 4, right: 4, width: 8, height: 8, 
                    borderRadius: '50%', background: 'var(--color-primary)', 
                    border: '2px solid var(--color-surface)' 
                  }} />
                )}
              </button>

              {showNotifMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: 320, background: 'var(--color-surface)',
                  borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  border: '1px solid var(--color-border)', zIndex: 1000,
                  animation: 'slideInRight 0.2s ease-out'
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Notificações</span>
                    {unreadCount > 0 && <span style={{ fontSize: 11, background: 'var(--color-primary)', color: 'white', padding: '2px 8px', borderRadius: 99 }}>{unreadCount} novas</span>}
                  </div>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                        Nenhuma notificação no momento.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} style={{ 
                          padding: '12px 16px', 
                          borderBottom: '1px solid var(--color-border)',
                          background: n.read ? 'transparent' : 'var(--color-surface-hover)'
                        }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>{n.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '4px 0' }}>{n.desc}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 500 }}>{n.time}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
              className="btn btn-ghost btn-icon"
              title={themeMode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            >
              {themeMode === 'light' ? <Moon size={18}/> : <Sun size={18}/>}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}
