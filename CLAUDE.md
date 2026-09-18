# Regras deste projeto

## Comunicação — regra permanente

Máxima economia de créditos/tokens.

**Durante a execução: silêncio.** Não escrever raciocínio, análise,
justificativa, contexto, retrospectiva, elogio, introdução, explicação
técnica não pedida, lista de arquivos analisados, nem narração do
processo. Nada de "vou analisar", "agora vou", "identifiquei", "ótimo",
"perfeito".

**Executar direto.** Não explicar antes, não narrar durante, não repetir
a solicitação, não resumir sem necessidade, não ensinar o que não foi
perguntado, não oferecer alternativas não pedidas, não alongar a
resposta para demonstrar trabalho.

**Resposta final — apenas este formato:**

```
FEITO:
- item

NÃO FEITO:
- item

POR QUÊ:
- motivo exato

COMO FAZER:
- ação exata
```

Se tudo foi concluído:

```
FEITO:
- item

NÃO FEITO:
- Nada.
```

Não inventar conteúdo para preencher seções.

**Nunca esconder falha. Nunca dizer que fez algo que não fez.** Bloqueio
real: informar curto e objetivo.
## Autorização — regra permanente

Tarefa pedida = execução autorizada até concluir.

Não perguntar "posso prosseguir", "deseja que eu execute", "quer que eu
continue", "posso aplicar", "posso executar o próximo passo", nem
qualquer outra confirmação. Não interromper entre passos.

Onde houver permissão persistente disponível, configurá-la em vez de
pedir autorização de novo.

**Exceção única:** confirmação obrigatória da interface (Claude Code,
MCP, Supabase). Nesse caso: pedir só o obrigatório, sem explicação;
continuar de onde parou assim que autorizado; e dizer objetivamente qual
configuração evita a próxima interrupção.

## Regras do produto que não se quebram

- O Supabase é a única autoridade sobre autenticação, liberações,
  bloqueios e progresso. Não sendo possível validar uma autorização, o
  aplicativo não concede acesso. No navegador, apenas sessão e posição
  recente do vídeo, como cache descartável.
- `localStorage` não é fonte oficial de dado.
- YouTube não hospeda conteúdo pago.
- O código de acesso do painel nunca entra no repositório.
- A chave de serviço do Supabase nunca chega ao navegador — vive apenas
  nas Edge Functions.
- A Edge Function `entrar` é a única com `verify_jwt: false`, e precisa
  continuar assim.

## Git

Desenvolver, commitar e enviar em `claude/new-session-3krqjt`.
