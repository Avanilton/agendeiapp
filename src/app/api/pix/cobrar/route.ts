import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ======================================================
// Helpers
// ======================================================

/** Gera QR Code PIX estático (padrão EMV — Banco Central) */
function gerarPixEstatico(config: {
  chave: string
  nome: string
  cidade: string
  valor: number
  descricao?: string
  txid?: string
}): string {
  const { chave, nome, cidade, valor, descricao = 'Agendei', txid = '***' } = config

  const format = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0')
    return `${id}${len}${value}`
  }

  const merchantAccountInfo = format('00', 'BR.GOV.BCB.PIX') + format('01', chave)
  const merchantInfo = format('26', merchantAccountInfo)
  const additionalData = format('05', txid.slice(0, 25))
  const additionalDataField = format('62', additionalData)

  const valorStr = valor.toFixed(2)
  const nomeClean = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25)
  const cidadeClean = cidade.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15)

  const payload =
    format('00', '01') +           // Payload Format Indicator
    format('01', '12') +           // Point of Initiation: Dynamic
    merchantInfo +                 // Merchant Account Information
    format('52', '0000') +         // Merchant Category Code
    format('53', '986') +          // Transaction Currency (BRL)
    format('54', valorStr) +       // Transaction Amount
    format('58', 'BR') +           // Country Code
    format('59', nomeClean) +      // Merchant Name
    format('60', cidadeClean) +    // Merchant City
    additionalDataField            // Additional Data

  // CRC16/CCITT
  const payloadWithCrc = payload + '6304'
  let crc = 0xFFFF
  for (let i = 0; i < payloadWithCrc.length; i++) {
    crc ^= payloadWithCrc.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xFFFF
    }
  }
  return payloadWithCrc.slice(0, -4) + '6304' + crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Gera URL de QR Code via serviço público (sem biblioteca) */
function qrCodeUrl(text: string): string {
  const encoded = encodeURIComponent(text)
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}&margin=10`
}

// ======================================================
// Gateway: Mercado Pago
// ======================================================
async function cobrarMercadoPago(config: {
  access_token: string
  valor: number
  descricao: string
  cliente_email: string
}) {
  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.access_token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `bp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    body: JSON.stringify({
      transaction_amount: config.valor,
      description: config.descricao,
      payment_method_id: 'pix',
      payer: { email: config.cliente_email || 'cliente@beautypro.com.br' },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Mercado Pago: ${err.message || res.statusText}`)
  }

  const data = await res.json()
  const txData = data?.point_of_interaction?.transaction_data
  return {
    txid: String(data.id),
    qr_code: txData?.qr_code || '',
    qr_base64: txData?.qr_code_base64 || '',
    gateway: 'mercado_pago',
  }
}

// ======================================================
// Gateway: EfiBank (Gerencianet / Caixa parceiro)
// ======================================================
async function cobrarEfiBank(config: {
  client_id: string
  client_secret: string
  certificado_base64: string
  ambiente: string
  valor: number
  devedor_nome: string
  devedor_cpf: string
}) {
  const base = config.ambiente === 'producao'
    ? 'https://pix.api.efipay.com.br'
    : 'https://pix-h.api.efipay.com.br'

  // Auth
  const authStr = Buffer.from(`${config.client_id}:${config.client_secret}`).toString('base64')
  const tokenRes = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authStr}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
  })

  if (!tokenRes.ok) throw new Error(`EfiBank auth: ${tokenRes.statusText}`)
  const { access_token } = await tokenRes.json()

  // Criar cobrança
  const txid = `bp${Date.now()}`
  const expiracao = 3600 // 1 hora
  const cobRes = await fetch(`${base}/v2/cob/${txid}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      calendario: { expiracao },
      devedor: { cpf: config.devedor_cpf.replace(/\D/g, ''), nome: config.devedor_nome },
      valor: { original: config.valor.toFixed(2) },
      chave: config.client_id, // usar a chave Pix cadastrada
      solicitacaoPagador: 'Agendei - Agendamento',
    }),
  })

  if (!cobRes.ok) throw new Error(`EfiBank cob: ${cobRes.statusText}`)
  const cob = await cobRes.json()

  return {
    txid,
    qr_code: cob.pixCopiaECola || '',
    qr_base64: '',
    gateway: 'efibank',
    location: cob.loc?.location || '',
  }
}

// ======================================================
// Gateway: PicPay
// ======================================================
async function cobrarPicPay(config: {
  token: string
  valor: number
  descricao: string
  cliente_nome: string
  cliente_email: string
  referencia: string
}) {
  const res = await fetch('https://appws.picpay.com/ecommerce/public/v1/payments', {
    method: 'POST',
    headers: {
      'x-picpay-token': config.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      referenceId: config.referencia,
      callbackUrl: 'https://beautypro.app/api/pix/webhook',
      returnUrl: 'https://beautypro.app',
      value: config.valor,
      additionalInfo: [{ label: 'Serviço', value: config.descricao }],
      buyer: {
        firstName: config.cliente_nome.split(' ')[0],
        lastName: config.cliente_nome.split(' ').slice(1).join(' ') || '',
        email: config.cliente_email || 'cliente@beautypro.com.br',
        phone: '+5511999999999',
        document: '000.000.000-00',
      },
    }),
  })

  if (!res.ok) throw new Error(`PicPay: ${res.statusText}`)
  const data = await res.json()
  return {
    txid: config.referencia,
    qr_code: data.paymentUrl || '',
    qr_base64: '',
    gateway: 'picpay',
  }
}

// ======================================================
// Gateway: PIX Estático (Chave) — Itaú, Bradesco, Nubank, C6, Caixa direto
// ======================================================
async function cobrarPixEstatico(config: {
  chave_pix: string
  nome: string
  cidade: string
  valor: number
  descricao: string
  txid: string
}) {
  const qrCode = gerarPixEstatico({
    chave: config.chave_pix,
    nome: config.nome,
    cidade: config.cidade || 'Brasil',
    valor: config.valor,
    descricao: config.descricao,
    txid: config.txid,
  })
  return {
    txid: config.txid,
    qr_code: qrCode,
    qr_base64: '',
    gateway: 'pix_estatico',
    qr_url: qrCodeUrl(qrCode),
  }
}

// ======================================================
// Handler Principal
// ======================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const { cobranca_id, valor, descricao, cliente_nome, cliente_email, cliente_cpf } = body

    if (!cobranca_id || !valor) {
      return NextResponse.json({ error: 'Parâmetros obrigatórios: cobranca_id, valor' }, { status: 400 })
    }

    // Buscar empresa e config PIX
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, nome, cidade')
      .eq('owner_id', user.id)
      .single()

    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })

    const { data: pixConfig } = await supabase
      .from('pix_configuracoes')
      .select('*')
      .eq('empresa_id', empresa.id)
      .single()

    if (!pixConfig) {
      return NextResponse.json({ error: 'Configuração PIX não encontrada. Configure nas Configurações > PIX.' }, { status: 400 })
    }

    let result: {
      txid: string
      qr_code: string
      qr_base64?: string
      gateway: string
      qr_url?: string
      location?: string
    }

    const txid = `bp${Date.now()}`

    switch (pixConfig.gateway) {
      case 'mercado_pago':
        if (!pixConfig.mp_access_token) throw new Error('Access Token do Mercado Pago não configurado')
        result = await cobrarMercadoPago({
          access_token: pixConfig.mp_access_token,
          valor,
          descricao: descricao || 'BeautyPro',
          cliente_email,
        })
        break

      case 'efibank':
        if (!pixConfig.efi_client_id || !pixConfig.efi_client_secret) throw new Error('Credenciais EfiBank não configuradas')
        result = await cobrarEfiBank({
          client_id: pixConfig.efi_client_id,
          client_secret: pixConfig.efi_client_secret,
          certificado_base64: pixConfig.efi_certificado_base64 || '',
          ambiente: pixConfig.efi_ambiente || 'homologacao',
          valor,
          devedor_nome: cliente_nome || 'Cliente',
          devedor_cpf: cliente_cpf || '00000000000',
        })
        break

      case 'picpay':
        if (!pixConfig.picpay_token) throw new Error('Token do PicPay não configurado')
        result = await cobrarPicPay({
          token: pixConfig.picpay_token,
          valor,
          descricao: descricao || 'BeautyPro',
          cliente_nome: cliente_nome || 'Cliente',
          cliente_email,
          referencia: txid,
        })
        break

      // Chave estática: Itaú, Bradesco, C6, Nubank, Caixa direto
      case 'itau':
      case 'bradesco':
      case 'c6bank':
      case 'nubank':
      case 'caixa':
      case 'chave_estatica':
      default:
        if (!pixConfig.chave_pix) throw new Error('Chave PIX não configurada')
        result = await cobrarPixEstatico({
          chave_pix: pixConfig.chave_pix,
          nome: pixConfig.nome_beneficiario || empresa.nome,
          cidade: pixConfig.cidade_beneficiario || empresa.cidade || 'Brasil',
          valor,
          descricao: descricao || 'BeautyPro',
          txid,
        })
        break
    }

    // Salvar QR Code na cobrança
    await supabase
      .from('cobrancas')
      .update({
        pix_qr_code: result.qr_code,
        pix_qr_base64: result.qr_base64 || '',
        pix_txid: result.txid,
        gateway_usado: result.gateway,
      })
      .eq('id', cobranca_id)

    return NextResponse.json({
      success: true,
      gateway: result.gateway,
      txid: result.txid,
      qr_code: result.qr_code,
      qr_base64: result.qr_base64 || '',
      qr_url: result.qr_url || qrCodeUrl(result.qr_code),
    })

  } catch (error) {
    console.error('Erro PIX:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno ao gerar PIX' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'API PIX Agendei' })
}
