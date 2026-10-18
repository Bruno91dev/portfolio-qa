# Casos de Teste — API ServeRest

Todos os casos abaixo estão automatizados na [coleção do Postman](../postman/serverest.postman_collection.json).

| ID | Módulo | Cenário | Dados / Pré-condição | Resultado esperado | Prioridade |
|---|---|---|---|---|---|
| CT01 | Usuários | Cadastrar usuário administrador | E-mail único gerado na execução | `201` · "Cadastro realizado com sucesso" · retorna `_id` | 🔴 Alta |
| CT02 | Usuários | Cadastrar com e-mail já usado | E-mail do CT01 | `400` · "Este email já está sendo usado" | 🔴 Alta |
| CT03 | Usuários | Cadastrar com campos inválidos | Nome e senha vazios, e-mail sem @, administrador "talvez" | `400` · uma mensagem de validação para cada campo | 🟡 Média |
| CT04 | Usuários | Buscar usuário por ID | ID do CT01 | `200` · nome, e-mail e perfil iguais ao cadastro | 🟡 Média |
| CT05 | Usuários | Buscar usuário inexistente | ID com formato válido que não existe | `400` · "Usuário não encontrado" | 🟢 Baixa |
| CT06 | Login | Login com senha incorreta | E-mail válido, senha errada | `401` · "Email e/ou senha inválidos" · nenhum token retornado | 🔴 Alta |
| CT07 | Login | Login válido | Credenciais do CT01 | `200` · "Login realizado com sucesso" · token `Bearer` | 🔴 Alta |
| CT08 | Produtos | Cadastrar produto sem token | Sem cabeçalho `Authorization` | `401` · mensagem de token ausente ou inválido | 🔴 Alta |
| CT09 | Produtos | Cadastrar produto como administrador | Token do CT07, estoque 10 | `201` · retorna `_id` do produto | 🔴 Alta |
| CT10 | Produtos | Cadastrar produto com nome duplicado | Mesmo nome do CT09 | `400` · "Já existe produto com esse nome" | 🟡 Média |
| CT11 | Produtos | Usuário comum tenta cadastrar produto | Token de usuário não administrador | `403` · "Rota exclusiva para administradores" | 🔴 Alta |
| CT12 | Carrinhos | Criar carrinho | Usuário comum, 3 unidades do produto do CT09 | `201` · "Cadastro realizado com sucesso" | 🔴 Alta |
| CT13 | Carrinhos | Estoque reduz ao criar carrinho | Após CT12 | Estoque do produto passa de 10 para 7 | 🔴 Alta |
| CT14 | Carrinhos | Cancelar compra | Carrinho do CT12 | `200` · mensagem informa que o estoque foi reabastecido | 🔴 Alta |
| CT15 | Carrinhos | Estoque volta após cancelamento | Após CT14 | Estoque do produto volta para 10 | 🔴 Alta |

## Verificação em todas as requisições
- Tempo de resposta abaixo de 3 segundos.

## Limpeza
Ao final, a coleção exclui o produto e os dois usuários criados, para não deixar dados de teste na API pública.
