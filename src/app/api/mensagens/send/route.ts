import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTwilioMessage } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar empresa vinculada ao usuário
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id, nome')
      .eq('owner_id', user.id)
      .single()

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const { tipo, titulo, conteudo, destinatarioTipo, clienteIds } = body

    if (!titulo || !conteudo || !destinatarioTipo) {
      return NextResponse.json({ error: 'Título, conteúdo e destinatárioTipo são obrigatórios.' }, { status: 400 })
    }

    // Buscar clientes aplicáveis
    let query = supabase
      .from('clientes')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('ativo', true)

    if (destinatarioTipo === 'selecionar' && Array.isArray(clienteIds) && clienteIds.length > 0) {
      query = query.in('id', clienteIds)
    } else if (destinatarioTipo === 'aniversariantes') {
      const currentMonth = new Date().getMonth() + 1
      query = query
        .not('data_nascimento', 'is', null)
        .like('data_nascimento', `%-${String(currentMonth).padStart(2, '0')}-%`)
    }

    const { data: clientes, error: clientesError } = await query
    if (clientesError) {
      throw new Error(`Erro ao buscar clientes: ${clientesError.message}`)
    }

    if (!clientes || clientes.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0, message: 'Nenhum cliente atendeu aos critérios de seleção.' })
    }

    // Filtragem secundária se aplicável
    let targetClientes = [...clientes]
    
    if (destinatarioTipo === 'aniversariantes') {
      const currentMonth = new Date().getMonth() + 1 // 1-indexed
      targetClientes = clientes.filter(c => {
        if (!c.data_nascimento) return false
        const birthMonth = new Date(c.data_nascimento + 'T12:00:00').getMonth() + 1
        return birthMonth === currentMonth
      })
    } else if (destinatarioTipo === 'inativos') {
      // Mock de clientes inativos: clientes que foram cadastrados há mais de 30 dias
      // ou seleciona uma parcela como simulação
      const trintaDiasAtras = new Date()
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
      targetClientes = clientes.filter(c => {
        const createdAt = new Date(c.created_at)
        return createdAt < trintaDiasAtras
      })
    }

    if (targetClientes.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0, message: 'Nenhum cliente selecionado atendeu aos critérios de data.' })
    }

    const queue = []
    const sentMessages = []

    for (const cliente of targetClientes) {
      // Formata a mensagem com variáveis personalizadas
      let msgFormatada = conteudo
        .replace(/{nome}/g, cliente.nome || 'Cliente')
        .replace(/{salao}/g, empresa.nome || 'Salão')
        .replace(/{data}/g, new Date().toLocaleDateString('pt-BR'))
        .replace(/{hora}/g, new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
        .replace(/{desconto}/g, '15') // Valor padrão de exemplo
        .replace(/{servico}/g, 'Atendimento Especial')
        .replace(/{validade}/g, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'))
        .replace(/{link}/g, 'agendei.app/agendar')

      queue.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        clienteTelefone: cliente.telefone || '',
        texto: msgFormatada,
        enviado: false
      })

      sentMessages.push(cliente.id)
    }

    // Registrar no histórico de mensagens do Supabase
    const { error: insertError } = await supabase
      .from('mensagens')
      .insert({
        empresa_id: empresa.id,
        titulo: titulo,
        conteudo: conteudo,
        tipo: tipo || 'personalizada',
        destinatarios_ids: sentMessages,
        enviada_em: new Date().toISOString()
      })

    if (insertError) {
      console.error('Erro ao registrar histórico de mensagens no Supabase:', insertError)
    }

    return NextResponse.json({
      success: true,
      queue,
      message: `Fila de envio gerada com sucesso para ${queue.length} cliente(s).`
    })

  } catch (error: any) {
    console.error('Erro na rota de envio de mensagens:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor ao processar envio.' },
      { status: 500 }
    )
  }
}
