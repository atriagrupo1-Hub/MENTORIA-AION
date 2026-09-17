/**
 * Estilos do painel administrativo.
 *
 * O painel não segue a identidade da área da aluna, e é de propósito.
 * Lá o dourado é acolhimento — a aluna está sendo recebida. Aqui é
 * ferramenta de trabalho: a equipe abre esta tela dezenas de vezes por
 * dia para cadastrar, liberar e corrigir. Cor demais atrapalha, porque
 * disputa atenção com a informação.
 *
 * Então: preto, branco e uma linha fina. Uma única cor de acento, o
 * vermelho, e ela quer dizer sempre a mesma coisa — algo exige atenção
 * ou vai apagar dado. A marca aparece uma vez, no cabeçalho, em branco.
 */

export const painel = {
  /** Preto absoluto. O painel não tem degradê. */
  fundo: "#000000",
  /** Cartões e campos: quase preto, o suficiente para separar do fundo. */
  superficie: "#0b0b0d",
  superficieAlta: "#141417",
  /*
   * Divisórias. A `linha` desenha, a `linhaSuave` apenas separa.
   *
   * `linha` é o contorno de TODO campo e de TODO botão do painel, e
   * estava em .14 — 1,35:1 contra o fundo. A norma pede 3:1 para o
   * limite de um controle, e com razão: uma borda que não se vê não
   * diz onde o botão começa. .36 dá 3,1:1. A `linhaSuave` continua
   * baixa de propósito: ela não delimita controle, só separa blocos,
   * e para isso o olho não precisa de contraste.
   */
  linha: "rgba(255,255,255,.36)",
  linhaSuave: "rgba(255,255,255,.07)",
  texto: "#ffffff",
  textoSecundario: "rgba(255,255,255,.58)",
  /*
   * Era .36 — 3,14:1, abaixo do mínimo para texto normal, e é a cor de
   * TODOS os rótulos do painel (o objeto `rotulo`, a `etiqueta` neutra,
   * a ficha da aluna, a equipe). .46 dá 4,56:1 e passa.
   */
  textoTerciario: "rgba(255,255,255,.46)",
  /** O único acento. Atenção, risco, dado que some. */
  perigo: "#e5645c",
  perigoFundo: "rgba(229,100,92,.1)",
  /*
   * A borda do `botaoRemover` — a única marca visual de que uma ação
   * apaga dado — dava 1,83:1. Praticamente invisível: o que separava
   * "Remover" de "Editar" era só a cor da letra, a 12px.
   */
  perigoLinha: "rgba(229,100,92,.75)",
} as const;

export const RAIO = 8;

export const campo: React.CSSProperties = {
  minHeight: 44,
  padding: "0 14px",
  fontSize: 14,
  color: painel.texto,
  background: painel.superficie,
  border: `1px solid ${painel.linha}`,
  borderRadius: RAIO,
  /*
    `outline: none` saiu daqui.

    Este objeto é o campo base de todo o painel — espalhado por mais de
    vinte lugares, incluindo o campo onde se digita REMOVER para apagar
    dado. Com ele, quem navegava por teclado não tinha como saber em que
    campo o cursor estava. O contorno agora vem da regra `:focus-visible`
    em `index.css`, que só acende quando o foco veio do teclado.
  */
};

/** Ação principal. Branco sólido — só uma por bloco. */
export const botaoOuro: React.CSSProperties = {
  minHeight: 44,
  padding: "0 20px",
  fontSize: 14,
  fontWeight: 600,
  color: "#000000",
  background: painel.texto,
  border: "1px solid transparent",
  borderRadius: RAIO,
  cursor: "pointer",
};

/** Ação secundária. Só o contorno. */
export const botaoNeutro: React.CSSProperties = {
  minHeight: 36,
  padding: "0 13px",
  fontSize: 13,
  color: painel.texto,
  background: "transparent",
  border: `1px solid ${painel.linha}`,
  borderRadius: RAIO,
  cursor: "pointer",
};

/**
 * O mesmo botão neutro, na medida de formulário.
 *
 * O painel tinha `botaoNeutro` em SETE alturas (32, 34, 36, 40, 42, 44,
 * 46) e "Cancelar" em cinco medidas diferentes — cada tela remontando a
 * mesma ideia com números escolhidos na hora. Quem administra a turma
 * repete essas ações cinquenta vezes por dia, e um botão que muda de
 * tamanho a cada tela obriga a reler antes de clicar.
 *
 * Passam a ser dois: `botaoNeutro` (36px) para o que vive dentro de uma
 * linha de lista, e este (44px) para rodapé de formulário e para todo
 * "Cancelar", sem exceção.
 */
export const botaoNeutroGrande: React.CSSProperties = {
  ...botaoNeutro,
  minHeight: 44,
  padding: "0 18px",
  fontSize: 14,
};

/** Apaga alguma coisa. Nunca preenchido: a cor é aviso, não convite. */
export const botaoRemover: React.CSSProperties = {
  ...botaoNeutro,
  color: painel.perigo,
  border: `1px solid ${painel.perigoLinha}`,
};

/** Cartão. */
export const cartao: React.CSSProperties = {
  background: painel.superficie,
  border: `1px solid ${painel.linhaSuave}`,
  borderRadius: RAIO + 4,
};

/**
 * Aba. Sublinhado, não pílula — é o que distingue um painel de trabalho
 * de um aplicativo de consumo.
 */
export function aba(ativa: boolean): React.CSSProperties {
  return {
    minHeight: 40,
    padding: "0 2px",
    marginRight: 26,
    fontSize: 14,
    fontWeight: ativa ? 600 : 400,
    color: ativa ? painel.texto : painel.textoTerciario,
    background: "transparent",
    border: "none",
    borderBottom: `2px solid ${ativa ? painel.texto : "transparent"}`,
    borderRadius: 0,
    cursor: "pointer",
  };
}

/** Etiqueta de estado. Sem preenchimento, só contorno e texto. */
export function etiqueta(cor: string): React.CSSProperties {
  return {
    flex: "none",
    padding: "5px 10px",
    fontSize: 10,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: cor,
    border: `1px solid ${cor}`,
    borderRadius: 4,
  };
}

/** Rótulo miúdo em versalete, para nomear um dado. */
export const rotulo: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: painel.textoTerciario,
};
