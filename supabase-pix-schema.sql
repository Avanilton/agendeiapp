-- Tabela de configuração PIX por empresa
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pix_configuracoes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE UNIQUE,
  gateway VARCHAR(30) NOT NULL DEFAULT 'chave_estatica',
  -- Campos comuns
  chave_pix VARCHAR(255),  -- Para gateways sem API (chave estática)
  tipo_chave VARCHAR(20),  -- cpf, cnpj, telefone, email, aleatoria
  nome_beneficiario VARCHAR(255),
  cidade_beneficiario VARCHAR(100),
  -- Mercado Pago
  mp_access_token TEXT,
  mp_ambiente VARCHAR(10) DEFAULT 'sandbox', -- sandbox | production
  -- EfiBank (Gerencianet)
  efi_client_id TEXT,
  efi_client_secret TEXT,
  efi_certificado_base64 TEXT,
  efi_ambiente VARCHAR(10) DEFAULT 'homologacao',
  -- PicPay
  picpay_token TEXT,
  -- Itaú (Portal Developers - OAuth)
  itau_client_id TEXT,
  itau_client_secret TEXT,
  itau_agencia VARCHAR(10),
  itau_conta VARCHAR(20),
  -- Bradesco (Portal Developers)
  bradesco_client_id TEXT,
  bradesco_client_secret TEXT,
  bradesco_agencia VARCHAR(10),
  bradesco_conta VARCHAR(20),
  -- C6 Bank
  c6_client_id TEXT,
  c6_client_secret TEXT,
  -- Configurações gerais
  ativo BOOLEAN DEFAULT TRUE,
  webhook_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE pix_configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PIX Config: apenas da empresa"
  ON pix_configuracoes FOR ALL
  USING (empresa_id = get_user_empresa_id());

-- Trigger updated_at
CREATE TRIGGER pix_config_updated_at BEFORE UPDATE ON pix_configuracoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Adicionar coluna pix_status na tabela cobrancas
ALTER TABLE cobrancas ADD COLUMN IF NOT EXISTS pix_qr_code TEXT;
ALTER TABLE cobrancas ADD COLUMN IF NOT EXISTS pix_qr_base64 TEXT;
ALTER TABLE cobrancas ADD COLUMN IF NOT EXISTS pix_txid VARCHAR(100);
ALTER TABLE cobrancas ADD COLUMN IF NOT EXISTS gateway_usado VARCHAR(30);
