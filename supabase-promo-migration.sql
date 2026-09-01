-- SQL Migration: Adiciona campos de promoção para Serviços e Produtos

-- Tabela de Serviços
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS em_promocao BOOLEAN DEFAULT FALSE;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS valor_promocao DECIMAL(10,2);
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS data_fim_promocao DATE;

-- Tabela de Produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS em_promocao BOOLEAN DEFAULT FALSE;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS valor_promocao DECIMAL(10,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS data_fim_promocao DATE;
