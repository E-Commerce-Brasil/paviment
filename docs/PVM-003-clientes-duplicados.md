# PVM-003 — Bloqueio de clientes duplicados

## Objetivo

Impedir a criação ou edição de clientes quando já existir outro registro com o mesmo:

- nome, ignorando acentos, maiúsculas/minúsculas e espaços repetidos;
- CPF, ignorando pontos e traço;
- telefone, ignorando máscara, espaços e sinais;
- e-mail, ignorando maiúsculas/minúsculas e espaços externos.

## Arquivo de banco

Execute no SQL Editor do Supabase:

`supabase/migrations/20260714_pvm_003_customer_uniqueness.sql`

## Comportamento esperado

O banco devolve mensagens como:

- `Já existe um cliente com este nome: Cliente Exemplo`
- `Já existe um cliente com este CPF: Cliente Exemplo`
- `Já existe um cliente com este telefone: Cliente Exemplo`
- `Já existe um cliente com este e-mail: Cliente Exemplo`

O código atual do Paviment já apresenta erros do Supabase na notificação da tela, portanto a proteção passa a funcionar sem mudança adicional no formulário.

## Caso a execução do SQL falhe

Isso normalmente significa que já existem dados duplicados. No final do arquivo SQL há quatro consultas de diagnóstico para localizar duplicidades de nome, CPF, telefone e e-mail.

Corrija ou exclua os registros duplicados e execute o arquivo novamente.

## Checklist de teste

1. Cadastre um cliente novo.
2. Tente cadastrar o mesmo nome usando letras maiúsculas ou sem acentos.
3. Tente cadastrar o mesmo CPF com outra máscara.
4. Tente cadastrar o mesmo telefone com outra máscara.
5. Tente cadastrar o mesmo e-mail usando letras maiúsculas.
6. Edite um cliente e tente usar os dados de outro cliente.
7. Confirme que editar um cliente sem mudar seus dados continua permitido.
