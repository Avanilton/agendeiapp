'use client'
import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, ExternalLink, AlertTriangle, Eye, EyeOff, Save, Loader2, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/contexts/AppContext'

// -------------------------------------------------------
// Definição dos gateways disponíveis
// -------------------------------------------------------
const GATEWAYS = [
  {
    id: 'mercado_pago',
    nome: 'Mercado Pago',
    logo: '💳',
    descricao: 'QR Code + Copia e Cola gerado via API. Mais fácil de configurar.',
    tipo: 'api_completa',
    doc: 'https://www.mercadopago.com.br/developers',
    badge: '🏆 Recomendado',
    badgeColor: '#059669',
  },
  {
    id: 'efibank',
    nome: 'EfiBank / Caixa',
    logo: '🏦',
    descricao: 'API PIX oficial (parceiro Caixa Econômica Federal). Requer certificado.',
    tipo: 'api_completa',
    doc: 'https://dev.efipay.com.br/',
    badge: '🏦 Caixa',
    badgeColor: '#2563EB',
  },
  {
    id: 'picpay',
    nome: 'PicPay',
    logo: '💚',
    descricao: 'Integração via API token. Gera link e QR Code de pagamento.',
    tipo: 'api_completa',
    doc: 'https://studio.picpay.com/',
    badge: '💚 PicPay',
    badgeColor: '#059669',
  },
  {
    id: 'itau',
    nome: 'Itaú',
    logo: '🔵',
    descricao: 'Use sua chave PIX cadastrada no Itaú. QR Code gerado localmente.',
    tipo: 'chave_estatica',
    doc: 'https://developer.itau.com.br/',
    badge: '🔵 Itaú',
    badgeColor: '#FF6B00',
  },
  {
    id: 'bradesco',
    nome: 'Bradesco',
    logo: '🔴',
    descricao: 'Use sua chave PIX cadastrada no Bradesco. QR Code gerado localmente.',
    tipo: 'chave_estatica',
    doc: 'https://developer.bradesco.com.br/',
    badge: '🔴 Bradesco',
    badgeColor: '#DC2626',
  },
  {
    id: 'nubank',
    nome: 'Nubank',
    logo: '💜',
    descricao: 'Sem API pública. Use sua chave PIX do Nubank para gerar o QR Code.',
    tipo: 'chave_estatica',
    doc: 'https://nubank.com.br',
    badge: '💜 Nubank',
    badgeColor: '#7C3AED',
  },
  {
    id: 'c6bank',
    nome: 'C6 Bank',
    logo: '⚫',
    descricao: 'Use sua chave PIX cadastrada no C6 Bank. QR Code gerado localmente.',
    tipo: 'chave_estatica',
    doc: 'https://c6bank.com.br',
    badge: '⚫ C6 Bank',
    badgeColor: '#1F2937',
  },
  {
    id: 'chave_estatica',
    nome: 'Qualquer Banco (Chave)',
    logo: '🔑',
    descricao: 'Informe sua chave PIX de qualquer banco. Funciona com qualquer instituição.',
    tipo: 'chave_estatica',
    badge: '🔑 Universal',
    badgeColor: '#6B7280',
  },
]

const TIPO_CHAVE = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'telefone', label: 'Telefone (+55...)' },
  { value: 'email', label: 'E-mail' },
  { value: 'aleatoria', label: 'Chave Aleatória' },
]

// -------------------------------------------------------
// Componente
// -------------------------------------------------------
interface PixConfig {
  gateway: string
  chave_pix: string
  tipo_chave: string
  nome_beneficiario: string
  cidade_beneficiario: string
  mp_access_token: string
  mp_ambiente: string
  efi_client_id: string
  efi_client_secret: string
  efi_certificado_base64: string
  efi_ambiente: string
  picpay_token: string
  itau_client_id: string
  itau_client_secret: string
  bradesco_client_id: string
  bradesco_client_secret: string
  c6_client_id: string
  c6_client_secret: string
}

const emptyConfig: PixConfig = {
  gateway: 'mercado_pago',
  chave_pix: '',
  tipo_chave: 'cpf',
  nome_beneficiario: '',
  cidade_beneficiario: '',
  mp_access_token: '',
  mp_ambiente: 'sandbox',
  efi_client_id: '',
  efi_client_secret: '',
  efi_certificado_base64: '',
  efi_ambiente: 'homologacao',
  picpay_token: '',
  itau_client_id: '',
  itau_client_secret: '',
  bradesco_client_id: '',
  bradesco_client_secret: '',
  c6_client_id: '',
  c6_client_secret: '',
}

export default function PixConfiguracao() {
  const { empresa } = useApp()
  const [config, setConfig] = useState<PixConfig>(emptyConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  const set = (k: keyof PixConfig, v: string) => setConfig(c => ({ ...c, [k]: v }))
  const toggleShow = (k: string) => setShowSecrets(s => ({ ...s, [k]: !s[k] }))

  const gwAtual = GATEWAYS.find(g => g.id === config.gateway) || GATEWAYS[0]

  // Carregar config do Supabase
  const loadConfig = useCallback(async () => {
    if (!empresa) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('pix_configuracoes')
      .select('*')
      .eq('empresa_id', empresa.id)
      .single()

    if (data) {
      setConfig({
        gateway: data.gateway || 'mercado_pago',
        chave_pix: data.chave_pix || '',
        tipo_chave: data.tipo_chave || 'cpf',
        nome_beneficiario: data.nome_beneficiario || empresa.nome || '',
        cidade_beneficiario: data.cidade_beneficiario || empresa.cidade || '',
        mp_access_token: data.mp_access_token || '',
        mp_ambiente: data.mp_ambiente || 'sandbox',
        efi_client_id: data.efi_client_id || '',
        efi_client_secret: data.efi_client_secret || '',
        efi_certificado_base64: data.efi_certificado_base64 || '',
        efi_ambiente: data.efi_ambiente || 'homologacao',
        picpay_token: data.picpay_token || '',
        itau_client_id: data.itau_client_id || '',
        itau_client_secret: data.itau_client_secret || '',
        bradesco_client_id: data.bradesco_client_id || '',
        bradesco_client_secret: data.bradesco_client_secret || '',
        c6_client_id: data.c6_client_id || '',
        c6_client_secret: data.c6_client_secret || '',
      })
    } else {
      // Pré-preencher com dados da empresa
      setConfig(c => ({
        ...c,
        nome_beneficiario: empresa.nome || '',
        cidade_beneficiario: empresa.cidade || '',
      }))
    }
    setLoading(false)
  }, [empresa])

  useEffect(() => { loadConfig() }, [loadConfig])

  const handleSave = async () => {
    if (!empresa) return
    setSaving(true)
    const supabase = createClient()
    const payload = { empresa_id: empresa.id, ...config }

    const { error } = await supabase
      .from('pix_configuracoes')
      .upsert(payload, { onConflict: 'empresa_id' })

    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/pix/cobrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cobranca_id: 'test',
          valor: 0.01,
          descricao: 'Teste Agendei',
          cliente_nome: 'Cliente Teste',
          cliente_email: 'teste@agendei.com.br',
        }),
      })
      if (res.ok) {
        setTestResult({ ok: true, msg: 'Conexão com a API funcionando! ✅' })
      } else {
        const err = await res.json()
        setTestResult({ ok: false, msg: err.error || 'Erro na API' })
      }
    } catch {
      setTestResult({ ok: false, msg: 'Erro de rede ao testar' })
    }
    setTesting(false)
  }

  const SecretInput = ({ label, field, placeholder }: { label: string; field: keyof PixConfig; placeholder?: string }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={showSecrets[field] ? 'text' : 'password'}
          className="form-input"
          value={config[field] as string}
          onChange={e => set(field, e.target.value)}
          placeholder={placeholder || '••••••••••••••••'}
          style={{ paddingRight: 44, fontFamily: showSecrets[field] ? 'inherit' : 'monospace' }}
        />
        <button
          type="button"
          onClick={() => toggleShow(field)}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
        >
          {showSecrets[field] ? <EyeOff size={16}/> : <Eye size={16}/>}
        </button>
      </div>
    </div>
  )

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 16 }}/>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Info banner */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px', background: '#EFF6FF', borderRadius: 12, border: '1px solid #BFDBFE', fontSize: 13, color: '#1D4ED8' }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 1 }}/>
        <div>
          <strong>Como funciona:</strong> Selecione seu banco abaixo, insira as credenciais e salve. Ao gerar uma cobrança para o cliente, o sistema criará automaticamente o <strong>QR Code PIX</strong> e o código <strong>Copia e Cola</strong>.
        </div>
      </div>

      {/* Gateway selector */}
      <div className="card">
        <h3 style={{ fontFamily: 'Outfit', fontSize: 18, marginBottom: 6 }}>Selecione seu Banco / Gateway PIX</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
          Bancos com "API Completa" geram QR Code dinâmico. Com "Chave PIX", geramos o QR Code localmente.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {GATEWAYS.map(gw => (
            <div
              key={gw.id}
              onClick={() => set('gateway', gw.id)}
              style={{
                padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                border: `2px solid ${config.gateway === gw.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: config.gateway === gw.id ? 'var(--color-primary-light)' : 'var(--color-surface)',
                transition: 'all 0.2s',
                transform: config.gateway === gw.id ? 'scale(1.01)' : 'scale(1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{gw.logo}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: `${gw.badgeColor}20`, color: gw.badgeColor }}>
                  {gw.tipo === 'api_completa' ? '⚡ API' : '🔑 Chave'}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{gw.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{gw.descricao}</div>
              {config.gateway === gw.id && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-primary)', fontWeight: 700 }}>✓ Selecionado</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Campos de configuração */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontFamily: 'Outfit', fontSize: 18 }}>
              {gwAtual.logo} Configurar {gwAtual.nome}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>{gwAtual.descricao}</p>
          </div>
          {gwAtual.doc && (
            <a href={gwAtual.doc} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
              <ExternalLink size={14}/> Documentação
            </a>
          )}
        </div>

        {/* Campos comuns — nome e cidade sempre aparecem */}
        <div className="grid-2" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">Nome do Beneficiário (no QR Code)</label>
            <input className="form-input" value={config.nome_beneficiario} onChange={e => set('nome_beneficiario', e.target.value)} placeholder="Nome do salão"/>
            <span className="form-hint">Aparece para o cliente ao escanear o QR Code</span>
          </div>
          <div className="form-group">
            <label className="form-label">Cidade (no QR Code)</label>
            <input className="form-input" value={config.cidade_beneficiario} onChange={e => set('cidade_beneficiario', e.target.value)} placeholder="São Paulo"/>
          </div>
        </div>

        {/* Mercado Pago */}
        {config.gateway === 'mercado_pago' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '10px 14px', background: '#FFF7ED', borderRadius: 10, fontSize: 13, color: '#92400E', border: '1px solid #FED7AA' }}>
              📋 <strong>Como obter:</strong> Acesse <a href="https://www.mercadopago.com.br/developers/panel" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>mercadopago.com.br/developers</a> → Suas integrações → Credenciais de produção.
            </div>
            <SecretInput label="Access Token *" field="mp_access_token" placeholder="APP_USR-..."/>
            <div className="form-group">
              <label className="form-label">Ambiente</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{v:'sandbox', l:'🧪 Sandbox (Testes)'},{v:'production',l:'🚀 Produção'}].map(o => (
                  <label key={o.v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                    <input type="radio" name="mp_amb" checked={config.mp_ambiente === o.v} onChange={() => set('mp_ambiente', o.v)}/>
                    {o.l}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EfiBank */}
        {config.gateway === 'efibank' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '10px 14px', background: '#EFF6FF', borderRadius: 10, fontSize: 13, color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
              📋 <strong>Como obter:</strong> Acesse <a href="https://sejaefi.com.br" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>sejaefi.com.br</a> → API → Aplicações → Criar aplicação (ative API Pix) → Meus Certificados.
            </div>
            <div className="grid-2">
              <SecretInput label="Client ID *" field="efi_client_id" placeholder="Client_Id_..."/>
              <SecretInput label="Client Secret *" field="efi_client_secret" placeholder="Client_Secret_..."/>
            </div>
            <div className="form-group">
              <label className="form-label">Certificado .p12 (Base64)</label>
              <textarea
                className="form-input form-textarea"
                value={config.efi_certificado_base64}
                onChange={e => set('efi_certificado_base64', e.target.value)}
                placeholder="Cole aqui o conteúdo Base64 do certificado .p12..."
                style={{ fontFamily: 'monospace', fontSize: 11 }}
                rows={3}
              />
              <span className="form-hint">Converta o .p12 para Base64: <code>base64 certificado.p12</code></span>
            </div>
            <div className="form-group">
              <label className="form-label">Ambiente</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{v:'homologacao',l:'🧪 Homologação'},{v:'producao',l:'🚀 Produção'}].map(o => (
                  <label key={o.v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                    <input type="radio" name="efi_amb" checked={config.efi_ambiente === o.v} onChange={() => set('efi_ambiente', o.v)}/>
                    {o.l}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PicPay */}
        {config.gateway === 'picpay' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '10px 14px', background: '#F0FDF4', borderRadius: 10, fontSize: 13, color: '#166534', border: '1px solid #BBF7D0' }}>
              📋 <strong>Como obter:</strong> Acesse o <a href="https://studio.picpay.com" target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>PicPay Studio</a> → Lojista → Integrações → Token de acesso.
            </div>
            <SecretInput label="Token de Acesso (x-picpay-token) *" field="picpay_token" placeholder="Token do painel lojista..."/>
          </div>
        )}

        {/* Chave Estática — Itaú, Bradesco, Nubank, C6, Caixa, Universal */}
        {['itau', 'bradesco', 'nubank', 'c6bank', 'caixa', 'chave_estatica'].includes(config.gateway) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {config.gateway === 'nubank' && (
              <div style={{ padding: '10px 14px', background: '#F5F3FF', borderRadius: 10, fontSize: 13, color: '#5B21B6', border: '1px solid #DDD6FE' }}>
                💜 O <strong>Nubank</strong> não possui API pública para cobranças. Usaremos sua chave PIX para gerar o QR Code localmente.
              </div>
            )}
            {['itau','bradesco','c6bank'].includes(config.gateway) && (
              <div style={{ padding: '10px 14px', background: '#FFF7ED', borderRadius: 10, fontSize: 13, color: '#92400E', border: '1px solid #FED7AA' }}>
                ℹ️ Para integração completa com API do {gwAtual.nome}, acesse <a href={gwAtual.doc} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>o portal de desenvolvedores</a>. Por enquanto, use sua chave PIX para gerar QR Code localmente.
              </div>
            )}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tipo de Chave PIX *</label>
                <select className="form-input form-select" value={config.tipo_chave} onChange={e => set('tipo_chave', e.target.value)}>
                  {TIPO_CHAVE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Chave PIX *</label>
                <input
                  className="form-input"
                  value={config.chave_pix}
                  onChange={e => set('chave_pix', e.target.value)}
                  placeholder={
                    config.tipo_chave === 'cpf' ? '000.000.000-00' :
                    config.tipo_chave === 'cnpj' ? '00.000.000/0000-00' :
                    config.tipo_chave === 'telefone' ? '+5511999999999' :
                    config.tipo_chave === 'email' ? 'seu@email.com' :
                    'Chave aleatória (UUID)'
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Aviso segurança */}
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--color-surface-hover)', borderRadius: 10, fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 8, border: '1px solid var(--color-border)' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1, color: '#D97706' }}/>
          <span>As credenciais são armazenadas de forma segura no Supabase e nunca expostas ao cliente. As chamadas à API são feitas no servidor.</span>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div style={{ padding: '12px 16px', background: testResult.ok ? '#D1FAE5' : '#FEE2E2', color: testResult.ok ? '#065F46' : '#991B1B', borderRadius: 12, fontSize: 14, fontWeight: 500 }}>
          {testResult.msg}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button onClick={handleTest} disabled={testing} className="btn btn-secondary">
          {testing ? <><Loader2 size={15} className="animate-spin"/> Testando...</> : '🧪 Testar Conexão'}
        </button>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saved ? <><CheckCircle size={15}/> Configurações Salvas!</> : saving ? <><Loader2 size={15} className="animate-spin"/> Salvando...</> : <><Save size={15}/> Salvar Configuração PIX</>}
        </button>
      </div>
    </div>
  )
}
