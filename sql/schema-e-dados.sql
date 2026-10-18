-- Banco de exemplo de uma loja virtual, com alguns problemas de dados
-- inseridos de propósito para as consultas de validação encontrarem.

CREATE TABLE usuarios (
    id            INTEGER PRIMARY KEY,
    nome          TEXT    NOT NULL,
    email         TEXT    NOT NULL,
    administrador INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE produtos (
    id         INTEGER PRIMARY KEY,
    nome       TEXT    NOT NULL,
    preco      REAL    NOT NULL,
    quantidade INTEGER NOT NULL
);

CREATE TABLE pedidos (
    id          INTEGER PRIMARY KEY,
    usuario_id  INTEGER,
    status      TEXT    NOT NULL,
    valor_total REAL    NOT NULL,
    criado_em   TEXT    NOT NULL
);

CREATE TABLE itens_pedido (
    id             INTEGER PRIMARY KEY,
    pedido_id      INTEGER NOT NULL,
    produto_id     INTEGER NOT NULL,
    quantidade     INTEGER NOT NULL,
    preco_unitario REAL    NOT NULL
);

INSERT INTO usuarios (id, nome, email, administrador) VALUES
    (1, 'Ana Souza',     'ana@loja.com',     1),
    (2, 'Carlos Lima',   'carlos@loja.com',  0),
    (3, 'Beatriz Rocha', 'beatriz@loja.com', 0),
    (4, 'Carlos L.',     'CARLOS@loja.com',  0);  -- e-mail duplicado (só muda maiúsculas)

INSERT INTO produtos (id, nome, preco, quantidade) VALUES
    (1, 'Mouse sem fio', 89.90,  25),
    (2, 'Teclado',       149.90, 10),
    (3, 'Monitor 24',    899.00, -2),  -- estoque negativo
    (4, 'Headset',       0.00,   5);   -- preço zerado

INSERT INTO pedidos (id, usuario_id, status, valor_total, criado_em) VALUES
    (1, 2,  'pago',      239.80, '2026-09-01'),
    (2, 3,  'pago',      899.00, '2026-09-02'),
    (3, 99, 'pendente',  89.90,  '2026-09-03'),  -- usuário que não existe
    (4, 2,  'pago',      100.00, '2026-09-04'),  -- total diferente da soma dos itens
    (5, 3,  'cancelado', 0.00,   '2026-09-05');  -- pedido sem itens

INSERT INTO itens_pedido (id, pedido_id, produto_id, quantidade, preco_unitario) VALUES
    (1, 1, 1, 1, 89.90),
    (2, 1, 2, 1, 149.90),
    (3, 2, 3, 1, 899.00),
    (4, 3, 1, 1, 89.90),
    (5, 4, 2, 1, 149.90);
