-- =============================================================================
-- 056 — Cobrança: adiciona tipo "link_externo" + libera plataforma_link p/ URL
-- =============================================================================
-- Quando a venda tem TODOS os produtos com pgto_forma = cartao_cliente, o
-- cliente já vai pagar via cartão. Mas a Magic ainda precisa registrar a
-- cobrança — seja como Faturado ou Link Externo (URL gerada no PagSeguro/Cielo).
--
-- Mudanças:
-- 1. CHECK em cobranca_cliente_itens.tipo agora aceita 'link_externo' como
--    novo valor (paralelo a 'faturado').
-- 2. CHECK em plataforma_link removido — antes restringia a 'PagSeguro' ou
--    'Cielo'; agora o campo aceita a URL completa do link de pagamento.
-- 3. Coluna plataforma_link cresce para text (sem limite), pois URLs podem ser
--    bem maiores que 120 chars (já era text, sem mudança de tipo necessária).
-- =============================================================================

-- 1. Atualiza CHECK do tipo
ALTER TABLE cobranca_cliente_itens
  DROP CONSTRAINT IF EXISTS cobranca_cliente_itens_tipo_check;

ALTER TABLE cobranca_cliente_itens
  ADD CONSTRAINT cobranca_cliente_itens_tipo_check
  CHECK (tipo IN (
    'pix', 'boleto', 'cartao_credito', 'cartao_debito',
    'transferencia', 'dinheiro', 'faturado', 'link_externo', 'outro'
  ));

-- 2. Remove o CHECK de plataforma_link (passa a aceitar URL livre)
ALTER TABLE cobranca_cliente_itens
  DROP CONSTRAINT IF EXISTS cobranca_cliente_itens_plataforma_link_check;
