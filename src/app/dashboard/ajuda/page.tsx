'use client'
import { useState } from 'react'
import { HelpCircle, Mail, ExternalLink, ChevronDown, ChevronUp, Book, Video, MessageCircle, Zap } from 'lucide-react'

const faqs = [
  {
    cat: 'Agendamento',
    q: 'Como fazer um agendamento?',
    a: `Para criar um agendamento, acesse a seção **Agenda** no menu lateral. Clique em **"+ Nova Agenda"** e preencha:
- Selecione o cliente (ou cadastre um novo)
- Escolha o serviço ou pacote
- Selecione o colaborador responsável
- Defina a data e horário
- Clique em "Salvar Agendamento"

O cliente aparecerá automaticamente na agenda do dia selecionado.`
  },
  {
    cat: 'Agendamento',
    q: 'Como alterar o status de um agendamento?',
    a: `Na tela da Agenda, clique sobre o agendamento desejado. Você verá opções para alterar o status:
- **Agendado** → cliente confirmou
- **Confirmado** → em espera
- **Em Atendimento** → sendo atendido agora
- **Concluído** → serviço finalizado
- **Cancelado** → desmarcado

Cada status tem uma cor diferente para facilitar a visualização.`
  },
  {
    cat: 'Clientes',
    q: 'Como cadastrar um novo cliente?',
    a: `Acesse **Clientes** no menu e clique em **"+ Novo Cliente"**. Preencha os dados obrigatórios (nome e telefone). Você também pode adicionar:
- Data de nascimento (para aniversariantes)
- Endereço completo
- Ficha de Anamnese (alergias, histórico capilar, etc.)

O telefone deve ser no formato (00) 00000-0000.`
  },
  {
    cat: 'Clientes',
    q: 'O que é a Ficha de Anamnese?',
    a: `A Anamnese é um questionário de saúde do cliente que ajuda a personalizar o atendimento com segurança. Inclui campos como:
- Alergias e sensibilidades
- Histórico de químicas (relaxamento, tintura)
- Medicamentos em uso
- Se está gestante

Para acessar, clique no ícone 📋 ao lado do cliente na listagem.`
  },
  {
    cat: 'Financeiro',
    q: 'Como gerar cobrança via PIX?',
    a: `Primeiro configure seu PIX em **Configurações → Configurar PIX**. Após configurado:
1. Acesse **Cobranças**
2. Localize a cobrança pendente
3. Clique no botão PIX
4. O sistema gerará automaticamente o QR Code e o código Copia e Cola
5. Envie para o cliente via WhatsApp ou exiba na tela

Para bancos sem API (Nubank, Itaú, etc.), o QR Code é gerado com sua chave PIX cadastrada.`
  },
  {
    cat: 'Financeiro',
    q: 'Como registrar um pagamento recebido?',
    a: `Em **Cobranças**, localize a cobrança e clique no botão **"Pago"**. Você pode escolher a forma de pagamento:
- Dinheiro
- PIX
- Cartão de Crédito / Débito
- Transferência

A cobrança será marcada como paga e o valor aparecerá no resumo financeiro do mês.`
  },
  {
    cat: 'Personalização',
    q: 'Como mudar as cores do sistema?',
    a: `Acesse **Configurações → Aparência**. Você pode escolher:
- **Modo Claro ou Escuro**
- **Paleta de cores**: Violeta, Azul, Rosa, Marrom, Bege, Rosé ou Teal

As mudanças são aplicadas instantaneamente. Clique em **"Salvar alterações"** para manter as configurações ao relogar.`
  },
  {
    cat: 'Personalização',
    q: 'Como configurar os horários de funcionamento?',
    a: `Acesse **Configurações → Horários**. Você pode:
- Marcar os dias em que o salão funciona
- Definir horários de abertura e fechamento por dia
- Configurar o intervalo entre agendamentos (15, 30, 45 ou 60 minutos)

Salve as alterações ao finalizar.`
  },
  {
    cat: 'Equipe',
    q: 'Como cadastrar colaboradores?',
    a: `Acesse **Colaboradores** no menu e clique em **"+ Novo Colaborador"**. Preencha:
- Nome e cargo
- Telefone e e-mail
- Salário base e percentual de comissão
- Escala de horários (dias e turnos)

Os colaboradores aparecerão como opção ao criar agendamentos.`
  },
  {
    cat: 'Equipe',
    q: 'Como cadastrar serviços e pacotes?',
    a: `Em **Serviços & Pacotes**, clique em **"+ Novo Serviço"** e defina:
- Nome e categoria
- Preço e duração (em minutos)
- Descrição opcional

Para **Pacotes**, clique na aba "Pacotes" e selecione os serviços inclusos, preço e validade.`
  },
]

const catColors: Record<string, string> = {
  Agendamento: '#2563EB',
  Clientes: '#7C3AED',
  Financeiro: '#059669',
  Personalização: '#D97706',
  Equipe: '#EC4899',
}

const versionHistory = [
  { version: 'v1.3.1', date: 'Maio 2026', changes: ['Correção na estrutura de modais em todas as páginas', 'Melhoria na busca de serviços (incluindo descrição)', 'Ajuste no carregamento de empresa para suporte multi-usuário (colaboradores)', 'Link "Voltar para o Site" adicionado ao menu lateral', 'Correção de persistência no salvamento de formulários'] },
  { version: 'v1.3.0', date: 'Maio 2026', changes: ['Modal motivacional diário ao logar', 'Redefinição de senha por e-mail na tela de login', 'Menu lateral com botão para reexibir quando recolhido', 'Busca em todos os campos em todos os cadastros', 'Máscara de telefone celular em todos os formulários', 'Clientes, Colaboradores, Produtos e Despesas salvando no banco', 'Saudação personalizada com nome do usuário', 'Central de Ajuda com documentação completa'] },
  { version: 'v1.2.0', date: 'Maio 2026', changes: ['Configuração de PIX com múltiplos gateways', 'Anamnese de clientes', 'Relatórios financeiros', 'Tema escuro e paletas de cores'] },
  { version: 'v1.1.0', date: 'Maio 2026', changes: ['Módulo de Cobranças', 'Módulo de Mensagens', 'Configurações de aparência', 'Gestão de Colaboradores'] },
  { version: 'v1.0.0', date: 'Maio 2026', changes: ['Lançamento do sistema Agendei', 'Agenda interativa', 'Cadastro de Clientes, Serviços e Produtos', 'Dashboard com estatísticas do dia'] },
]

export default function AjudaPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [catFilter, setCatFilter] = useState('Todos')
  const [activeSection, setActiveSection] = useState<'faq' | 'doc' | 'changelog'>('faq')

  const cats = ['Todos', ...Array.from(new Set(faqs.map(f => f.cat)))]
  const filtered = faqs.filter(f => catFilter === 'Todos' || f.cat === catFilter)

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ajuda & Suporte</h1>
          <p className="page-subtitle">Documentação, dúvidas frequentes e histórico de versões</p>
        </div>
        <a
          href="mailto:suporte@agendei.com.br"
          className="btn btn-primary"
          style={{ textDecoration: 'none' }}
        >
          <Mail size={16}/> Falar com suporte
        </a>
      </div>

      {/* Section tabs */}
      <div className="tabs" style={{ maxWidth: 480, marginBottom: 28 }}>
        <button className={`tab ${activeSection === 'faq' ? 'active' : ''}`} onClick={() => setActiveSection('faq')}>
          ❓ Perguntas Frequentes
        </button>
        <button className={`tab ${activeSection === 'doc' ? 'active' : ''}`} onClick={() => setActiveSection('doc')}>
          📖 Documentação
        </button>
        <button className={`tab ${activeSection === 'changelog' ? 'active' : ''}`} onClick={() => setActiveSection('changelog')}>
          🔄 Versões
        </button>
      </div>

      {/* FAQ */}
      {activeSection === 'faq' && (
        <div className="dashboard-layout">
          <div>
            {/* Category filter */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {cats.map(c => (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  style={{
                    padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: catFilter === c ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                    color: catFilter === c ? 'white' : 'var(--color-text-muted)',
                    transition: 'all 0.2s',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((faq, i) => (
                <div
                  key={i}
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden', transition: 'box-shadow 0.2s' }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${catColors[faq.cat] || '#6B7280'}20`, color: catColors[faq.cat] || '#6B7280' }}>
                        {faq.cat}
                      </span>
                      <HelpCircle size={15} color="var(--color-primary)" style={{ flexShrink: 0 }}/>
                      <span style={{ fontWeight: 600, fontSize: 14, textAlign: 'left', color: 'var(--color-text)' }}>{faq.q}</span>
                    </div>
                    {openFaq === i ? <ChevronUp size={16} color="var(--color-text-muted)"/> : <ChevronDown size={16} color="var(--color-text-muted)"/>}
                  </button>
                  {openFaq === i && (
                    <div style={{ padding: '0 20px 20px', fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.8, borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                      {faq.a.split('\n').map((line, li) => (
                        <p key={li} style={{ margin: '4px 0' }}>
                          {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ background: 'var(--color-gradient)', border: 'none' }}>
              <div style={{ color: 'white' }}>
                <h3 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 8 }}>Fale conosco</h3>
                <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 16 }}>
                  Nossa equipe responde em até 24h úteis.
                </p>
                <a href="mailto:suporte@agendei.com.br" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.3)' }}>
                  <Mail size={16}/> suporte@agendei.com.br
                </a>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontFamily: 'Outfit', fontSize: 16, marginBottom: 12 }}>Acesso rápido</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: <Book size={14}/>, label: 'Ver documentação completa', action: () => setActiveSection('doc') },
                  { icon: <Zap size={14}/>, label: 'Histórico de versões', action: () => setActiveSection('changelog') },
                  { icon: <MessageCircle size={14}/>, label: 'Enviar feedback', action: () => window.open('mailto:suporte@agendei.com.br?subject=Feedback Agendei', '_blank') },
                ].map((item, i) => (
                  <button key={i} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--color-surface-hover)', borderRadius: 10, border: '1px solid var(--color-border)', cursor: 'pointer', fontSize: 13, color: 'var(--color-text)', fontWeight: 500, width: '100%', textAlign: 'left' }}>
                    <span style={{ color: 'var(--color-primary)' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontFamily: 'Outfit', fontSize: 15, marginBottom: 10 }}>Versão do sistema</h3>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Agendei v1.3.0</div>
                <div>Next.js 15 · Supabase</div>
                <div>Atualização: Maio 2026</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documentation */}
      {activeSection === 'doc' && (
        <div className="settings-layout">
          <div className="card" style={{ padding: 8, alignSelf: 'start', position: 'sticky', top: 80 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', padding: '8px 12px', textTransform: 'uppercase', letterSpacing: 1 }}>Seções</div>
            {['Visão Geral', 'Agenda', 'Clientes', 'Serviços', 'Cobranças & PIX', 'Equipe', 'Relatórios', 'Configurações'].map(s => (
              <a
                key={s}
                href={`#doc-${s.toLowerCase().replace(/ /g, '-').replace(/[&]/g, '').replace(/--/g, '-')}`}
                style={{ display: 'block', padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--color-text)', textDecoration: 'none', transition: 'all 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                {s}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" id="doc-visão-geral">
              <h2 style={{ fontFamily: 'Outfit', fontSize: 22, marginBottom: 12 }}>📋 Visão Geral do Agendei</h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
                O <strong style={{ color: 'var(--color-text)' }}>Agendei</strong> é um sistema completo de gestão para salões de beleza, barbearias e espaços estéticos. Ele centraliza agendamentos, clientes, colaboradores, finanças e comunicação em um único painel intuitivo.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
                {[
                  { emoji: '📅', label: 'Agenda inteligente' },
                  { emoji: '👥', label: 'Gestão de clientes' },
                  { emoji: '💰', label: 'Controle financeiro' },
                  { emoji: '💳', label: 'Cobranças via PIX' },
                  { emoji: '👩‍💼', label: 'Equipe e escala' },
                  { emoji: '📊', label: 'Relatórios' },
                ].map(f => (
                  <div key={f.label} style={{ padding: '14px 12px', background: 'var(--color-surface-hover)', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{f.emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{f.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" id="doc-agenda">
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 12 }}>📅 Agenda</h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
                A Agenda é o coração do sistema. Ela exibe todos os agendamentos do dia em formato de linha do tempo. Para criar um agendamento, você precisa ter ao menos um cliente e um serviço cadastrado.
              </p>
              <ul style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 2, paddingLeft: 20, marginTop: 8 }}>
                <li>Clique em <strong style={{ color: 'var(--color-text)' }}>"+ Nova Agenda"</strong> para criar um agendamento</li>
                <li>Selecione cliente, serviço, colaborador, data e horário</li>
                <li>Acompanhe o status em tempo real (Agendado, Confirmado, Em Atendimento, Concluído)</li>
                <li>Filtre por data para ver agendamentos futuros ou passados</li>
              </ul>
            </div>

            <div className="card" id="doc-clientes">
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 12 }}>👥 Clientes</h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
                Mantenha um cadastro completo de cada cliente, incluindo ficha de anamnese para atendimentos mais seguros e personalizados.
              </p>
              <ul style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 2, paddingLeft: 20, marginTop: 8 }}>
                <li>Campos: nome, telefone (celular), e-mail, data de nascimento, endereço</li>
                <li>Aniversariantes do mês aparecem automaticamente no Dashboard</li>
                <li>Ficha de Anamnese: alergias, químicas recentes, medicamentos</li>
                <li>Busca em tempo real por qualquer campo</li>
              </ul>
            </div>

            <div className="card" id="doc-serviços">
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 12 }}>✂️ Serviços & Pacotes</h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
                Cadastre todos os serviços do seu salão com preço e duração. Crie pacotes combinando serviços com desconto.
              </p>
              <ul style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 2, paddingLeft: 20, marginTop: 8 }}>
                <li>Serviços: nome, categoria, preço, duração em minutos</li>
                <li>Ativar/desativar serviços sem excluí-los</li>
                <li>Pacotes: combine serviços e defina validade e recorrência</li>
              </ul>
            </div>

            <div className="card" id="doc-cobranças--pix">
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 12 }}>💳 Cobranças & PIX</h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
                O módulo de cobranças permite gerenciar pagamentos e gerar QR Code PIX automaticamente para seus clientes.
              </p>
              <div style={{ padding: '12px 14px', background: '#EFF6FF', borderRadius: 10, fontSize: 13, color: '#1D4ED8', marginTop: 12 }}>
                📋 <strong>Configuração PIX:</strong> Vá em Configurações → Configurar PIX e selecione seu banco. Bancos com "API Completa" (Mercado Pago, EfiBank, PicPay) geram QR Code dinâmico. Para outros bancos, informe sua chave PIX para QR Code estático.
              </div>
            </div>

            <div className="card" id="doc-equipe">
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 12 }}>👩‍💼 Equipe</h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
                Gerencie sua equipe completa com escala de horários e controle de comissões.
              </p>
              <ul style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 2, paddingLeft: 20, marginTop: 8 }}>
                <li>Cadastro com cargo, salário e comissão percentual</li>
                <li>Escala semanal de horários por colaborador</li>
                <li>Resumo da folha mensal no topo da página</li>
              </ul>
            </div>

            <div className="card" id="doc-relatórios">
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 12 }}>📊 Relatórios</h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-muted)' }}>
                Visualize o desempenho financeiro do seu salão com gráficos e métricas detalhadas por período.
              </p>
              <ul style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 2, paddingLeft: 20, marginTop: 8 }}>
                <li>Receita mensal e histórico</li>
                <li>Comparativo de agendamentos por período</li>
                <li>Serviços mais vendidos</li>
                <li>Exportação em CSV (em breve)</li>
              </ul>
            </div>

            <div className="card" id="doc-configurações">
              <h2 style={{ fontFamily: 'Outfit', fontSize: 20, marginBottom: 12 }}>⚙️ Configurações</h2>
              <ul style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 2, paddingLeft: 20 }}>
                <li><strong style={{ color: 'var(--color-text)' }}>Aparência:</strong> tema claro/escuro e paleta de cores</li>
                <li><strong style={{ color: 'var(--color-text)' }}>PIX:</strong> configure o gateway de pagamento</li>
                <li><strong style={{ color: 'var(--color-text)' }}>Horários:</strong> dias e horários de funcionamento</li>
                <li><strong style={{ color: 'var(--color-text)' }}>Notificações:</strong> configurar alertas automáticos</li>
                <li><strong style={{ color: 'var(--color-text)' }}>Conta:</strong> dados do estabelecimento</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Changelog */}
      {activeSection === 'changelog' && (
        <div style={{ maxWidth: 720 }}>
          <h2 style={{ fontFamily: 'Outfit', fontSize: 22, marginBottom: 24 }}>🔄 Histórico de Versões</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {versionHistory.map((v, i) => (
              <div key={i} className="card" style={{ borderLeft: `4px solid ${i === 0 ? 'var(--color-primary)' : 'var(--color-border)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'Outfit', fontSize: 18, fontWeight: 800, color: i === 0 ? 'var(--color-primary)' : 'var(--color-text)' }}>
                      {v.version}
                    </span>
                    {i === 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                        Atual
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{v.date}</span>
                </div>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {v.changes.map((c, ci) => (
                    <li key={ci} style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.8 }}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
