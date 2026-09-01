-- ============================================
-- BeautyPro - Schema Supabase
-- Execute na ordem abaixo no SQL Editor do Supabase
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- EMPRESAS (Salões)
-- ============================================
CREATE TABLE empresas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  documento VARCHAR(20) NOT NULL UNIQUE, -- CPF ou CNPJ (só dígitos)
  tipo_documento VARCHAR(4) NOT NULL CHECK (tipo_documento IN ('cpf', 'cnpj')),
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  logo_url TEXT,
  tema VARCHAR(10) DEFAULT 'light' CHECK (tema IN ('light', 'dark')),
  paleta VARCHAR(20) DEFAULT 'violet',
  horario_abertura VARCHAR(5) DEFAULT '08:00',
  horario_fechamento VARCHAR(5) DEFAULT '18:00',
  dias_funcionamento INTEGER[] DEFAULT '{1,2,3,4,5,6}',
  intervalo_agendamento INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLIENTES
-- ============================================
CREATE TABLE clientes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20) NOT NULL,
  data_nascimento DATE,
  sexo CHAR(1) CHECK (sexo IN ('M', 'F', 'O')),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  observacoes TEXT,
  anamnese JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COLABORADORES
-- ============================================
CREATE TABLE colaboradores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  cargo VARCHAR(100),
  salario DECIMAL(10,2) DEFAULT 0,
  comissao_percentual DECIMAL(5,2) DEFAULT 0,
  horarios JSONB DEFAULT '[]',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SERVIÇOS
-- ============================================
CREATE TABLE servicos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  categoria VARCHAR(100),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PACOTES
-- ============================================
CREATE TABLE pacotes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  servicos_ids UUID[],
  validade_dias INTEGER DEFAULT 30,
  recorrente BOOLEAN DEFAULT FALSE,
  periodicidade_dias INTEGER,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUTOS
-- ============================================
CREATE TABLE produtos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco_custo DECIMAL(10,2) DEFAULT 0,
  preco_venda DECIMAL(10,2) NOT NULL,
  estoque INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 3,
  unidade VARCHAR(10) DEFAULT 'UN',
  categoria VARCHAR(100),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AGENDAMENTOS
-- ============================================
CREATE TABLE agendamentos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id),
  colaborador_id UUID REFERENCES colaboradores(id),
  servico_id UUID REFERENCES servicos(id),
  pacote_id UUID REFERENCES pacotes(id),
  data DATE NOT NULL,
  hora_inicio VARCHAR(5) NOT NULL,
  hora_fim VARCHAR(5) NOT NULL,
  status VARCHAR(20) DEFAULT 'agendado' CHECK (status IN ('agendado','confirmado','em_atendimento','concluido','cancelado','faltou')),
  valor DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COBRANÇAS
-- ============================================
CREATE TABLE cobrancas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  agendamento_id UUID REFERENCES agendamentos(id),
  cliente_id UUID REFERENCES clientes(id),
  valor DECIMAL(10,2) NOT NULL,
  valor_pago DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente','pago','cancelado','parcial')),
  forma_pagamento VARCHAR(30) DEFAULT 'pendente',
  vencimento DATE NOT NULL,
  pago_em TIMESTAMPTZ,
  pix_code TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DESPESAS
-- ============================================
CREATE TABLE despesas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  tipo VARCHAR(50),
  vencimento DATE NOT NULL,
  pago_em TIMESTAMPTZ,
  pago BOOLEAN DEFAULT FALSE,
  recorrente BOOLEAN DEFAULT FALSE,
  periodicidade VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MENSAGENS
-- ============================================
CREATE TABLE mensagens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  tipo VARCHAR(30) DEFAULT 'personalizada',
  destinatarios_ids UUID[],
  enviada_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

-- Políticas para empresas
CREATE POLICY "Empresa: dono pode ver sua empresa"
  ON empresas FOR ALL
  USING (owner_id = auth.uid());

-- Helper function para pegar empresa_id do usuário
CREATE OR REPLACE FUNCTION get_user_empresa_id()
RETURNS UUID AS $$
  SELECT id FROM empresas WHERE owner_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Políticas para todas as tabelas relacionadas à empresa
CREATE POLICY "Clientes: apenas da empresa"
  ON clientes FOR ALL
  USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Colaboradores: apenas da empresa"
  ON colaboradores FOR ALL
  USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Serviços: apenas da empresa"
  ON servicos FOR ALL
  USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Pacotes: apenas da empresa"
  ON pacotes FOR ALL
  USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Produtos: apenas da empresa"
  ON produtos FOR ALL
  USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Agendamentos: apenas da empresa"
  ON agendamentos FOR ALL
  USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Cobranças: apenas da empresa"
  ON cobrancas FOR ALL
  USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Despesas: apenas da empresa"
  ON despesas FOR ALL
  USING (empresa_id = get_user_empresa_id());

CREATE POLICY "Mensagens: apenas da empresa"
  ON mensagens FOR ALL
  USING (empresa_id = get_user_empresa_id());

-- Política pública para leitura de serviços (área do cliente)
CREATE POLICY "Serviços: leitura pública"
  ON servicos FOR SELECT
  USING (ativo = true);

-- ============================================
-- TRIGGERS para updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER empresas_updated_at BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER agendamentos_updated_at BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ÍNDICES para performance
-- ============================================
CREATE INDEX idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX idx_agendamentos_empresa ON agendamentos(empresa_id);
CREATE INDEX idx_agendamentos_data ON agendamentos(data);
CREATE INDEX idx_agendamentos_cliente ON agendamentos(cliente_id);
CREATE INDEX idx_cobrancas_empresa ON cobrancas(empresa_id);
CREATE INDEX idx_cobrancas_status ON cobrancas(status);
CREATE INDEX idx_despesas_empresa ON despesas(empresa_id);
CREATE INDEX idx_clientes_nascimento ON clientes(data_nascimento);
