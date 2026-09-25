# Testar o site no ar, do seu computador

Eu não alcanço `souaion.com` daqui — a rede desta máquina bloqueia o
domínio. Então o último teste, o do site publicado, é o que você roda aí.

## Uma vez só, para preparar

Abrir o **PowerShell** na pasta do projeto e rodar, uma linha por vez:

```powershell
npm install --no-save playwright
npx playwright install chromium
```

## O teste

```powershell
node previa/producao.mjs
```

No fim ele escreve **TUDO OK** ou lista o que falhou, e salva uma foto
da tela em `previa/producao-390.png`.

Para ver a janela do navegador abrindo e fazendo as coisas:

```powershell
node previa/producao.mjs --olhando
```

## Testar entrando como aluna

Sem isso ele testa só a parte que não precisa de conta. Para entrar de
verdade, na mesma janela do PowerShell, antes do comando:

```powershell
$env:ALUNA_NOME="o nome da aluna"
$env:ALUNA_CODIGO="o código dela"
node previa/producao.mjs
```

Use uma aluna de teste, não a sua conta de administradora. O nome e o
código ficam só nessa janela do PowerShell: não entram no repositório,
não passam por conversa nenhuma, e somem quando você fechar a janela.

## O que ele confere

1. O site responde e é o aplicativo, não uma página de erro.
2. **A versão no ar é a última** — procura na folha de estilo publicada
   uma regra que só existe no envio mais recente. Se falhar aqui, a
   Cloudflare Pages ainda não construiu o que eu mandei.
3. A tela de entrada tem os dois campos e o botão, e no celular nada
   sobra para o lado.
4. Errando o acesso, a aluna lê o motivo e a tela não fica branca.
   (Usa um nome que não existe, de propósito: errar o código de uma
   aluna de verdade tranca a conta dela por 15 minutos.)
5. Com nome e código: entra, a área tem conteúdo, nenhum erro cru
   aparece, e — abrindo uma aula com vídeo — o vídeo é pedido,
   liberado e o tocador aparece.
6. Nenhum erro grave no console do navegador.

## Se falhar

Copie a saída inteira e me mande junto com `previa/producao-390.png`.

---

# A maquete do painel, para desenhar fora daqui

`previa/painel-para-desenhar.html` é a casca do painel administrativo
num arquivo só: as cores, as medidas e os textos do painel de verdade,
com dados inventados. Abre com dois cliques no navegador e sobe em
qualquer ferramenta de desenho.

Sete telas, nas abas de cima: Alunas, Categorias / Layout, Cursos e
conteúdos, Curso aberto, Aula aberta, Comentários e Equipe.

**Nada ali salva, apaga ou fala com o banco.** É layout, e só.

Mexa à vontade e devolva o arquivo — ou prints, ou os dois. A tradução
para os componentes de verdade (`src/admin/*.tsx`) é comigo: o que a
maquete não tem é permissão, cronograma, arrastar para ordenar e o
banco, e é isso que precisa continuar funcionando do outro lado.

Duas medidas que vale conhecer antes de mexer: controle tem **44px** de
altura (36px quando mora dentro de uma linha de lista), e o contorno é
`rgba(255,255,255,.36)` — abaixo disso ele some contra o preto, e a
norma de acessibilidade pede 3:1 para o limite de um controle.
