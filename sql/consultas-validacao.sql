-- Consultas de validação de dados
-- Cada consulta procura um tipo de problema. Resultado vazio = nenhum problema encontrado.

-- V01: e-mails duplicados (ignorando maiúsculas e minúsculas)
SELECT LOWER(email) AS email, COUNT(*) AS quantidade
FROM usuarios
GROUP BY LOWER(email)
HAVING COUNT(*) > 1;

-- V02: produtos com estoque negativo
SELECT id, nome, quantidade
FROM produtos
WHERE quantidade < 0;

-- V03: produtos com preço zerado ou negativo
SELECT id, nome, preco
FROM produtos
WHERE preco <= 0;

-- V04: pedidos ligados a um usuário que não existe (registro órfão)
SELECT p.id AS pedido_id, p.usuario_id
FROM pedidos p
LEFT JOIN usuarios u ON u.id = p.usuario_id
WHERE u.id IS NULL;

-- V05: pedidos cujo valor total não bate com a soma dos itens
SELECT p.id AS pedido_id,
       p.valor_total,
       ROUND(SUM(i.quantidade * i.preco_unitario), 2) AS soma_itens
FROM pedidos p
JOIN itens_pedido i ON i.pedido_id = p.id
GROUP BY p.id, p.valor_total
HAVING ROUND(SUM(i.quantidade * i.preco_unitario), 2) <> p.valor_total;

-- V06: pedidos sem nenhum item
SELECT p.id AS pedido_id, p.status
FROM pedidos p
LEFT JOIN itens_pedido i ON i.pedido_id = p.id
WHERE i.id IS NULL;
