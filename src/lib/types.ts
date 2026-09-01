// Tipos do sistema Agendei

export type UserRole = 'owner' | 'collaborator' | 'client'

export type ThemeMode = 'light' | 'dark'

export type ColorPalette = 
  | 'blue' 
  | 'violet' 
  | 'pink' 
  | 'brown' 
  | 'beige' 
  | 'rose'
  | 'teal'

export interface Empresa {
  id: string
  owner_id?: string
  nome: string
  documento: string // CPF ou CNPJ
  tipo_documento: 'cpf' | 'cnpj'
  telefone: string
  email: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  logo_url?: string
  foto_perfil_url?: string
  tema: ThemeMode
  paleta: ColorPalette
  horario_abertura: string
  horario_fechamento: string
  dias_funcionamento: number[] // 0=Dom, 1=Seg... 6=Sab
  created_at: string
  updated_at: string
}

export interface Usuario {
  id: string
  empresa_id: string
  nome: string
  email: string
  telefone: string
  role: UserRole
  created_at: string
}

export interface Cliente {
  id: string
  empresa_id: string
  nome: string
  email?: string
  telefone: string
  data_nascimento?: string
  sexo?: 'M' | 'F' | 'O'
  cpf_cnpj?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  observacoes?: string
  anamnese?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Servico {
  id: string
  empresa_id: string
  nome: string
  descricao?: string
  preco: number
  duracao_minutos: number
  categoria: string
  ativo: boolean
  created_at: string
  em_promocao?: boolean
  valor_promocao?: number
  data_fim_promocao?: string
}

export interface Pacote {
  id: string
  empresa_id: string
  nome: string
  descricao?: string
  preco: number
  servicos_ids: string[] // IDs dos serviços
  validade_dias: number
  recorrente: boolean
  periodicidade_dias?: number
  ativo: boolean
  created_at: string
}

export interface Produto {
  id: string
  empresa_id: string
  nome: string
  descricao?: string
  preco_custo: number
  preco_venda: number
  estoque: number
  unidade: string
  categoria: string
  ativo: boolean
  created_at: string
  em_promocao?: boolean
  valor_promocao?: number
  data_fim_promocao?: string
}

export interface Colaborador {
  id: string
  empresa_id: string
  nome: string
  email?: string
  telefone: string
  cargo: string
  salario: number
  comissao_percentual: number
  horarios: HorarioColaborador[]
  ativo: boolean
  created_at: string
}

export interface HorarioColaborador {
  dia_semana: number // 0=Dom...6=Sab
  entrada: string
  saida: string
  ativo: boolean
}

export type StatusAgendamento = 'agendado' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado' | 'faltou'

export interface Agendamento {
  id: string
  empresa_id: string
  cliente_id: string
  colaborador_id?: string
  servico_id?: string
  pacote_id?: string
  data: string
  hora_inicio: string
  hora_fim: string
  status: StatusAgendamento
  valor: number
  observacoes?: string
  created_at: string
  updated_at: string
  // relations
  cliente?: Cliente
  colaborador?: Colaborador
  servico?: Servico
}

export type StatusCobranca = 'pendente' | 'pago' | 'cancelado' | 'parcial'
export type FormaPagamento = 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'transferencia' | 'pendente'

export interface Cobranca {
  id: string
  empresa_id: string
  agendamento_id: string
  cliente_id: string
  valor: number
  valor_pago: number
  status: StatusCobranca
  forma_pagamento: FormaPagamento
  vencimento: string
  pago_em?: string
  pix_code?: string
  observacoes?: string
  created_at: string
  // relations
  agendamento?: Agendamento
  cliente?: Cliente
}

export type TipoDespesa = 'aluguel' | 'salario' | 'produto' | 'equipamento' | 'marketing' | 'agua' | 'energia' | 'internet' | 'outros'

export interface Despesa {
  id: string
  empresa_id: string
  descricao: string
  valor: number
  tipo: TipoDespesa
  vencimento: string
  pago_em?: string
  pago: boolean
  recorrente: boolean
  periodicidade?: string
  created_at: string
}

export interface Mensagem {
  id: string
  empresa_id: string
  titulo: string
  conteudo: string
  tipo: 'lembrete' | 'promocao' | 'aniversario' | 'confirmacao' | 'personalizada'
  destinatarios?: string[] // IDs de clientes
  enviada_em?: string
  created_at: string
}
