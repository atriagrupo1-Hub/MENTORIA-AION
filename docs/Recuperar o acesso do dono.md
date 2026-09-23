# Recuperar o acesso do dono

Se quem tem o papel `dono` esquecer o código de acesso, **não existe
caminho dentro do aplicativo** — e é de propósito. Um "esqueci minha
senha" no painel administrativo seria exatamente a porta que a trava
existe para não ter.

A saída é o SQL do próprio Supabase, que só quem tem a conta do projeto
alcança.

## Como fazer

1. Entre em **supabase.com** → projeto **crcclhmamknqkamvavyp** → **SQL Editor**.
2. Veja quem é o dono:

   ```sql
   select p.id, p.nome, p.login
     from profiles p
    where p.papel = 'dono';
   ```

3. Defina um código novo, de 4 a 6 números, para esse `id`:

   ```sql
   update credenciais
      set codigo = '4417',       -- troque pelo código novo
          tentativas_erradas = 0,
          travada_ate = null
    where aluna_id = 'cole-o-id-aqui';
   ```

4. Entre no painel com o login de sempre e o código novo.
5. **Troque o código logo em seguida**, pela tela do painel — o que ficou
   escrito no SQL Editor fica no histórico do navegador.

## O que NÃO fazer

- Não apague a linha de `credenciais`: sem ela, `verificar_codigo`
  devolve nulo e a conta simplesmente não entra mais.
- Não mude o `papel` de outra pessoa para `dono` só para destravar. Cria
  um segundo dono que ninguém lembra de tirar depois.
- Não guarde este código em lugar nenhum do repositório.

## Para não precisar disto

Tenha **dois donos**. Com dois, um destrava o outro pelo painel, em dez
segundos, sem SQL nenhum: na aba **Equipe**, o outro dono muda o código.

Quem está logado — dono, colaboradora ou aluna — também troca o
**próprio** código a qualquer momento. Isso não ajuda quem já está do
lado de fora, mas evita boa parte dos casos: desconfiou que alguém viu o
seu, troque antes de virar problema.
