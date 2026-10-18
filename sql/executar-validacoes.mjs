// Cria o banco de exemplo em memória e roda cada consulta de validação.
// Uso: npm run test:sql   (requer Node.js 22.5 ou superior)
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const pasta = new URL('.', import.meta.url);
const banco = new DatabaseSync(':memory:');
banco.exec(readFileSync(new URL('schema-e-dados.sql', pasta), 'utf8'));

const consultas = readFileSync(new URL('consultas-validacao.sql', pasta), 'utf8')
  .split(/^-- (?=V\d+:)/m)
  .slice(1);

for (const bloco of consultas) {
  const [titulo, ...linhas] = bloco.split('\n');
  const sql = linhas.join('\n').trim();
  const resultado = banco.prepare(sql).all();

  console.log(`\n${titulo}`);
  if (resultado.length === 0) {
    console.log('  OK: nenhum problema encontrado');
  } else {
    console.log(`  ${resultado.length} problema(s) encontrado(s):`);
    console.table(resultado);
  }
}
