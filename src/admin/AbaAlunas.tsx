import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import { formatarDigitando, soDigitos } from "./celular";
import { Calendario } from "./Calendario";
import { convitePeloWhatsApp } from "./convite";
import { FichaDaAluna } from "./FichaDaAluna";
import { botaoNeutro, botaoNeutroGrande, botaoOuro, campo, etiqueta, painel as tema, rotulo } from "./estilos";
import { colunaDaAluna, estadoDoPrazo, type Coluna } from "./prazo";
import type { Papel } from "./papeis";
import type { Painel } from "./usePainel";

/**
 * A lista de alunas.
 *
 * Antes era uma pilha de cartões, cada um com quatro botões à mostra —
 * cronograma, prazo, bloquear, remover — vezes o número de alunas. Com
 * três alunas de teste isso passava; com trinta é uma parede de
 * botões, e "Remover" fica a um clique de distância em todas as linhas.
 *
 * Agora a linha diz o essencial e nada mais: quem é, como entra, quanto
 * já fez. Um clique abre a ficha, e é lá que moram as ações. O que
 * apaga dado deixa de estar sempre exposto.
 *
 * Em cima, o que a colaboradora pergunta antes de procurar alguém:
 * quantas são, quantas estão ativas, quantas estão bloqueadas.
 */

/**
 * Os prazos que se dá numa aluna nova.
 *
 * São os mesmos atalhos da gaveta de prazo, e de propósito: quem
 * aprendeu um lugar não reaprende o outro. "Sem prazo" existe porque
 * há mentoria vitalícia, e porque deixar o prazo vazio por engano é
 * pior que escolhê-lo de propósito.
 */
const PRAZOS = [
  { chave: "30d", nome: "30 dias", p: { dias: 30, meses: 0, anos: 0 } },
  { chave: "6m", nome: "6 meses", p: { dias: 0, meses: 6, anos: 0 } },
  { chave: "1a", nome: "1 ano", p: { dias: 0, meses: 0, anos: 1 } },
  { chave: "sem", nome: "Sem prazo", p: null },
] as const;

type ChavePrazo = (typeof PRAZOS)[number]["chave"];

/**
 * Uma lista de caixas para marcar, com "Todos" e "Nenhum".
 *
 * Mentoria e Presentes escolhem coisas diferentes com o mesmo gesto, e
 * escrever a lista duas vezes é como as duas deixam de se parecer.
 */
function ListaDeEscolha({
  titulo,
  vazio,
  itens,
  marcados,
  aoAlternar,
  aoTodos,
  aoNenhum,
}: {
  titulo: string;
  vazio: string;
  itens: Array<{ id: string; nome: string; quantos: string }>;
  marcados: Set<string>;
  aoAlternar: (id: string) => void;
  aoTodos: () => void;
  aoNenhum: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span style={{ ...rotulo, flex: "1 1 auto" }}>
          {titulo} · {marcados.size} de {itens.length}
        </span>
        <button type="button" onClick={aoTodos} style={botaoNeutro}>
          Todos
        </button>
        <button type="button" onClick={aoNenhum} style={botaoNeutro}>
          Nenhum
        </button>
      </div>

      {itens.length === 0 ? (
        <p className="m-0 text-[13px]" style={{ color: tema.textoSecundario }}>
          {vazio}
        </p>
      ) : (
        <div className="flex flex-col">
          {itens.map((item) => {
            const marcado = marcados.has(item.id);
            return (
              /*
                A área de toque cobre a linha inteira: no celular, mirar
                uma caixa de 20px ao lado de um texto clicável é o
                caminho curto para marcar o módulo errado.
              */
              <label
                key={item.id}
                className="flex min-h-[44px] cursor-pointer items-center gap-3 px-1"
                style={{ borderBottom: `1px solid ${tema.linhaSuave}` }}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => aoAlternar(item.id)}
                  className="h-5 w-5 flex-none"
                  style={{ accentColor: tema.texto }}
                />
                <span className="min-w-0 flex-1 truncate text-[14px]" style={{ color: tema.texto }}>
                  {item.nome}
                </span>
                <span className="flex-none text-[13px]" style={{ color: tema.textoSecundario }}>
                  {item.quantos}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AbaAlunas({
  painel,
  meuPapel,
  pedirConfirmacao,
  avisar,
}: {
  painel: Painel;
  /** Quem está olhando. O suporte vê a ficha inteira, com menos ações. */
  meuPapel: Papel | undefined;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { catalogo, alunas, carregando, configuracao, executar, recarregar } = painel;
  const intervaloPadrao = configuracao.intervaloDias;
  const [nome, setNome] = useState("");
  const [login, setLogin] = useState("");
  const [codigo, setCodigo] = useState("");
  const [celular, setCelular] = useState("");
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  /*
   * O cadastro passou a fazer os três passos de uma vez.
   *
   * Eram três lugares para uma coisa só — a conta aqui, o curso na
   * gaveta da ficha, o prazo em outra gaveta — e entre o primeiro e o
   * último a aluna já aparecia "Ativa" na lista, parecendo pronta.
   * Quem fosse interrompido no meio não tinha como saber que faltava
   * alguma coisa: uma conta sem curso e sem prazo é indistinguível de
   * uma conta em dia, olhando a linha.
   *
   * O que muda de aluna para aluna é o nome, o acesso e o código. O
   * resto — todos os módulos, o intervalo da configuração, um ano de
   * acesso — é o mesmo quase sempre, e por isso vem preenchido. Quem
   * precisar de outra coisa muda aqui, e quem precisar de algo fora do
   * comum continua ajustando depois na ficha.
   */
  /*
   * O que ela recebe, escolhido item a item, e desmarcado por padrão.
   *
   * Antes era uma caixa só: "dar o curso inteiro". Quem precisasse de
   * outra coisa — dois módulos, um acervo de presentes — cadastrava,
   * saía, abria a ficha e refazia tudo lá dentro. A decisão já estava
   * tomada no momento do cadastro; o que faltava era onde registrá-la.
   *
   * Nasce vazio de propósito. O padrão anterior dava o curso inteiro
   * sem ninguém marcar nada, e "todas as aulas" é justamente a escolha
   * que não se deve tomar no lugar de quem administra.
   */
  const [modulosEscolhidos, setModulosEscolhidos] = useState<Set<string>>(new Set());
  const [categoriasEscolhidas, setCategoriasEscolhidas] = useState<Set<string>>(new Set());
  const [acessoAberto, setAcessoAberto] = useState(false);
  const [intervalo, setIntervalo] = useState("");
  const [inicio, setInicio] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [prazo, setPrazo] = useState<ChavePrazo>("1a");
  /** A aluna que acabou de nascer, para o convite não exigir procurá-la. */
  const [pronta, setPronta] = useState<
    { nome: string; login: string; codigo: string; celular: string } | null
  >(null);
  const [abertaId, setAbertaId] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todas" | Coluna | "renovadas">("todas");

  const totalAulas = catalogo.modulos.reduce((s, m) => s + m.aulas.length, 0);

  /*
   * Quatro colunas que não se sobrepõem, e uma marca que sobrepõe.
   *
   * A regra de qual coluna mora em `colunaDaAluna`, no banco de
   * conhecimento sobre prazo — aqui é só contar.
   *
   * "Renovadas" é diferente das outras quatro, e a tela precisa deixar
   * isso claro: é uma MARCA, não um estado. Quem renovou uma vez carrega
   * para sempre, e continua também sendo ativa, ou vencendo, ou o que
   * for. Por isso aquele número não entra na soma — e por isso ele fica
   * separado dos outros, depois de um espaço.
   */
  const coluna = (a: (typeof alunas)[number]) => colunaDaAluna(a.status, a.acessoAte);

  const bloqueadas = alunas.filter((a) => coluna(a) === "bloqueadas").length;
  const vencidas = alunas.filter((a) => coluna(a) === "vencidas").length;
  const vencendo = alunas.filter((a) => coluna(a) === "vencendo").length;
  const ativas = alunas.filter((a) => coluna(a) === "ativas").length;
  const renovadas = alunas.filter((a) => a.renovacoes > 0).length;

  /*
   * A busca olha nome, nome de acesso e celular.
   *
   * O celular entra sem pontuação dos dois lados: quem digita "98765"
   * procurando alguém não deve depender de acertar parênteses e traço.
   */
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const digitos = soDigitos(busca);
    return alunas.filter((a) => {
      if (filtro === "renovadas" && a.renovacoes === 0) return false;
      if (filtro !== "todas" && filtro !== "renovadas" && coluna(a) !== filtro) return false;
      if (!termo) return true;
      return (
        a.nome.toLowerCase().includes(termo) ||
        a.login.toLowerCase().includes(termo) ||
        (digitos.length > 0 && (a.celular ?? "").includes(digitos))
      );
    });
  }, [alunas, busca, filtro]);

  async function cadastrar(e: FormEvent) {
    e.preventDefault();
    /*
      Os quatro campos sao obrigatorios.

      O celular era opcional, e o resultado aparecia depois: a ficha
      dizia "nao informado", o botao de chamar no WhatsApp nao existia,
      e entregar o acesso virava procurar o numero noutro lugar. O
      momento de pedir e este, com a pessoa do outro lado da linha.

      O nome de acesso tambem: era deduzido do nome quando vazio
      ("Ana Maria" virava "ana.maria"), e quem cadastrava so descobria
      qual era o acesso da aluna depois, lendo a ficha.
    */
    if (!nome.trim()) {
      avisar("Informe o nome da aluna.");
      return;
    }
    if (!login.trim()) {
      avisar("Informe o nome de acesso — é com ele que ela entra.");
      return;
    }
    if (!/^[0-9]{4,6}$/.test(codigo.trim())) {
      // A regra aceita de 4 a 6; a frase dizia 4. Mesmo defeito que a
      // Edge Function `entrar` tinha, e que fazia quem tem codigo de 6
      // encurtar o proprio codigo.
      avisar("O código tem de 4 a 6 números.");
      return;
    }
    const digitos = soDigitos(celular);
    if (!digitos) {
      avisar("Informe o celular — é por ele que o acesso é entregue.");
      return;
    }
    if (digitos.length < 10 || digitos.length > 15) {
      avisar("O celular precisa do DDD. Ex.: 11 98765-4321.");
      return;
    }
    setSalvando(true);
    const acesso = login.trim();
    const r = await dados.cadastrarAluna(nome.trim(), acesso, codigo.trim(), digitos);

    if (!r.ok) {
      setSalvando(false);
      avisar(r.mensagem);
      return;
    }

    /*
     * A conta nasceu. Daqui para a frente, o que falhar falha SOZINHO —
     * a aluna já existe, e desfazer o cadastro por causa de um prazo
     * que não gravou seria trocar um problema pequeno por um grande.
     *
     * Por isso cada passo é contado à parte e o aviso diz exatamente o
     * que ficou faltando. Silêncio aqui seria o pior dos mundos: uma
     * aluna "Ativa" na lista, sem curso, e ninguém sabendo.
     */
    const cadastrada = nome.trim();
    const faltou: string[] = [];

    if (modulosEscolhidos.size > 0) {
      try {
        await dados.gerarCronograma(r.id, [...modulosEscolhidos], nDias, inicio);
      } catch (falha) {
        faltou.push(falha instanceof Error ? `o curso (${falha.message})` : "o curso");
      }
    }

    if (categoriasEscolhidas.size > 0) {
      try {
        await dados.definirCategoriasDaAluna(r.id, [...categoriasEscolhidas]);
      } catch (falha) {
        faltou.push(
          falha instanceof Error ? `os presentes (${falha.message})` : "os presentes",
        );
      }
    }

    const escolhido = PRAZOS.find((x) => x.chave === prazo);
    if (escolhido?.p) {
      try {
        await dados.definirAcesso(r.id, escolhido.p);
      } catch (falha) {
        faltou.push(falha instanceof Error ? `o prazo (${falha.message})` : "o prazo");
      }
    }

    setSalvando(false);
    /*
     * O convite só aparece quando os três passos deram certo.
     *
     * Mandar o acesso de uma aluna cujo curso não gravou é pior que não
     * mandar nada: ela entra no mesmo minuto, vê a tela vazia, e a
     * primeira impressão da mentoria é a de uma coisa quebrada. Quando
     * falta algo, o aviso manda abrir a ficha, e é lá que se conserta.
     */
    if (faltou.length === 0) {
      setPronta({ nome: cadastrada, login: acesso, codigo: codigo.trim(), celular });
    }
    setModulosEscolhidos(new Set());
    setCategoriasEscolhidas(new Set());
    setAcessoAberto(false);
    setNome("");
    setLogin("");
    setCodigo("");
    setCelular("");
    setCadastroAberto(false);
    await recarregar();

    /*
      O aviso nomeia o que de fato foi feito.

      Dizia sempre "conta, curso e prazo", mesmo quando nenhum modulo
      tinha sido marcado — anunciava um curso que nao existia. Agora a
      lista e montada com o que realmente entrou.
    */
    const feito = ["conta"];
    if (modulosEscolhidos.size > 0) feito.push("curso");
    if (categoriasEscolhidas.size > 0) feito.push("presentes");
    if (PRAZOS.find((x) => x.chave === prazo)?.p) feito.push("prazo");
    const emPalavras =
      feito.length === 1 ? feito[0] : `${feito.slice(0, -1).join(", ")} e ${feito[feito.length - 1]}`;

    avisar(
      faltou.length > 0
        ? `${cadastrada} foi cadastrada, mas faltou ${faltou.join(" e ")}. Abra a ficha dela.`
        : nadaEscolhido
          ? `${cadastrada} foi cadastrada, mas sem conteúdo nenhum liberado. Abra a ficha dela para dar.`
          : `${cadastrada} está pronta: ${emPalavras}.`,
    );
  }

  /** O que a aluna nova vai receber, em palavras, antes de o botão ser clicado. */
  const nDias = Math.max(0, Math.floor(Number(intervalo || intervaloPadrao) || 0));
  const aulasEscolhidas = catalogo.modulos
    .filter((m) => modulosEscolhidos.has(m.id))
    .reduce((n, m) => n + m.aulas.length, 0);
  const presentesEscolhidos = catalogo.categorias
    .filter((c) => categoriasEscolhidas.has(c.id))
    .reduce((n, c) => n + c.presentes.length, 0);
  const nadaEscolhido = modulosEscolhidos.size === 0 && categoriasEscolhidas.size === 0;

  const alternar = (
    id: string,
    atual: Set<string>,
    definir: (s: Set<string>) => void,
  ) => {
    const proximo = new Set(atual);
    if (proximo.has(id)) proximo.delete(id);
    else proximo.add(id);
    definir(proximo);
  };

  /*
    O prazo entra no resumo porque agora mora dentro da secao dobrada.
    Fora dela, estava sempre a vista; dentro, sumiria de quem fecha — e
    ate quando a conta vale e coisa que nao se grava sem olhar.
  */
  const nomeDoPrazo = PRAZOS.find((x) => x.chave === prazo)?.nome ?? "";
  const sufixoPrazo = nomeDoPrazo ? ` Acesso: ${nomeDoPrazo.toLowerCase()}.` : "";

  /** O que a aluna nova vai receber, em palavras, antes de o botão ser clicado. */
  const resumoDoQueRecebe = nadaEscolhido
    ? "Nada marcado — ela entra e não vê conteúdo nenhum." + sufixoPrazo
    : aulasEscolhidas === 0
      ? `Só os presentes: ${presentesEscolhidos} em ${categoriasEscolhidas.size} ${
          categoriasEscolhidas.size === 1 ? "categoria" : "categorias"
        }.` + sufixoPrazo
      : nDias === 0
        ? `${aulasEscolhidas} ${aulasEscolhidas === 1 ? "aula abre" : "aulas abrem"} de uma vez${
            presentesEscolhidos > 0 ? `, mais ${presentesEscolhidos} presentes` : ""
          }.` + sufixoPrazo
        : `${aulasEscolhidas} ${
            aulasEscolhidas === 1 ? "aula abre" : "aulas abrem"
          } uma a cada ${nDias} ${nDias === 1 ? "dia" : "dias"}${
            presentesEscolhidos > 0 ? `, mais ${presentesEscolhidos} presentes` : ""
          }.` + sufixoPrazo;

  /*
    Gravar e desistir, num par so.
    
    Moram no fim de "O que ela vai acessar" — gravar e o fim do caminho,
    e quem cadastra passa por tudo antes de chegar neles. Mas a secao
    dobra, e com ela fechada os botoes iriam junto: o formulario ficaria
    sem saida, e cadastrar sem liberar conteudo e caso legitimo.
    
    Por isso e uma constante, renderizada UMA vez, em um de dois
    lugares: dentro da caixa quando aberta, logo abaixo do cabecalho
    quando fechada.
  */
  /*
    Fechar e desistir sao a mesma coisa, e limpam tudo.

    Estava escrito duas vezes — no "Cancelar" de baixo e no botao de
    cima — e as duas versoes ja tinham divergido uma vez: uma limpava
    as marcacoes, a outra nao.
  */
  function fecharCadastro() {
    setNome("");
    setLogin("");
    setCodigo("");
    setCelular("");
    setModulosEscolhidos(new Set());
    setCategoriasEscolhidas(new Set());
    setAcessoAberto(false);
    setCadastroAberto(false);
  }

  /*
    Esc fecha a folha, e a pagina atras para de rolar.

    Sem travar o `body`, rolar dentro do cadastro no celular arrasta a
    lista de alunas por baixo — e ao fechar a pessoa volta num ponto da
    lista que nao e o que ela deixou.
  */
  useEffect(() => {
    if (!cadastroAberto) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") fecharCadastro();
    };
    document.addEventListener("keydown", escape);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = antes;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadastroAberto]);

  const oCancelar = (
    <button
      type="button"
      onClick={fecharCadastro}
      style={{ ...botaoNeutroGrande, flex: "0 0 auto" }}
    >
      Cancelar
    </button>
  );

  /*
    Gravar so aparece com a secao aberta.

    E de proposito: o caminho e preencher, escolher o que ela acessa, e
    so entao gravar. Com a secao fechada nada foi escolhido, e um botao
    de gravar ali convida a pular justamente a parte que faz o cadastro
    valer. Desistir, esse sim, tem que estar sempre a mao.
  */
  const osBotoes = (
    <div className="flex w-full flex-wrap gap-[10px]">
      <button
        type="submit"
        disabled={salvando}
        style={{ ...botaoOuro, flex: "0 0 auto", opacity: salvando ? 0.7 : 1 }}
      >
        {salvando ? "Cadastrando…" : "Cadastrar e liberar"}
      </button>
      {oCancelar}
    </div>
  );

  // O vermelho é a única cor do painel, e quer dizer sempre a mesma
  // coisa: isto precisa de você. Aceso só quando há alguém.
  const FILTROS = [
    { chave: "todas" as const, nome: "Todas", conta: alunas.length, atencao: false, aparte: false },
    { chave: "ativas" as const, nome: "Ativas", conta: ativas, atencao: false, aparte: false },
    { chave: "vencendo" as const, nome: "Vencendo", conta: vencendo, atencao: vencendo > 0, aparte: false },
    { chave: "vencidas" as const, nome: "Vencidas", conta: vencidas, atencao: vencidas > 0, aparte: false },
    { chave: "bloqueadas" as const, nome: "Bloqueadas", conta: bloqueadas, atencao: false, aparte: false },
    // `aparte` afasta este das outras: é marca, não estado, e não soma.
    { chave: "renovadas" as const, nome: "Renovadas", conta: renovadas, atencao: false, aparte: true },
  ];

  return (
    <>
      {/*
        Os números que a colaboradora quer antes de procurar alguém. São
        botões porque cada um também filtra a lista — ler e agir no
        mesmo lugar poupa explicar onde fica o filtro.
      */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const ativo = filtro === f.chave;
          return (
            <button
              key={f.chave}
              onClick={() => setFiltro(f.chave)}
              className="flex min-w-[116px] flex-col items-start gap-1 px-4 py-3 text-left"
              style={{
                background: ativo ? tema.superficieAlta : tema.superficie,
                border: `1px solid ${ativo ? tema.linha : tema.linhaSuave}`,
                borderRadius: 10,
                cursor: "pointer",
                marginLeft: f.aparte ? 18 : undefined,
              }}
            >
              <span
                className="text-[22px] font-bold leading-none"
                style={{ color: f.atencao ? tema.perigo : tema.texto }}
              >
                {f.conta}
              </span>
              <span style={rotulo}>{f.nome}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap gap-[10px]">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, acesso ou celular"
          aria-label="Buscar aluna"
          style={{ ...campo, flex: "1 1 260px" }}
        />
        <button
          onClick={() => {
            setCadastroAberto(true);
            /*
              A secao ja nasce aberta aqui.

              Numa tela cheia dedicada a configurar o acesso, abrir com
              ela dobrada seria mostrar uma pagina quase vazia e pedir
              mais um clique para chegar no que a tela existe para
              fazer. Fora do painel ela continuava dobrada porque
              disputava espaco com a lista; aqui nao disputa com nada.
            */
            setAcessoAberto(true);
          }}
          style={botaoOuro}
        >
          Cadastrar aluna
        </button>
      </div>

      {/*
        O cadastro cobre a tela.

        Era um formulario embutido, e crescia: quatro campos, duas
        listas de catalogo, ritmo, prazo e os botoes. Empurrava a lista
        de alunas para baixo e dividia a atencao com filtros, busca e
        trinta linhas de gente que nao tem nada a ver com a pessoa que
        esta sendo cadastrada agora.

        Cadastrar alguem e uma tarefa com comeco, meio e fim. Ocupa a
        tela inteira enquanto dura, e devolve a tela quando acaba.

        Mesma forma do modal de confirmacao desta pasta: fecha com Esc,
        o foco entra ao abrir, e `role="dialog"` com `aria-modal` para
        quem navega por leitor de tela nao continuar lendo a lista
        atras do escurecimento.
      */}
      {cadastroAberto
        ? createPortal(
        /*
          Vai direto no `body`, por portal.

          `position: fixed` se ancora na janela — menos quando algum
          ancestral tem `transform`, e ai se ancora NELE. A animacao de
          entrada do painel (`.entra`) usa transform: medido, a folha
          abria a 123px do topo no celular e cobria 757px de 844, com a
          lista aparecendo por cima da borda.
        */
        <div
          className="fixed inset-0 z-[90] overflow-y-auto"
          style={{ background: tema.fundo }}
          role="dialog"
          aria-modal="true"
          aria-label="Cadastrar aluna"
        >
          <div className="mx-auto w-full max-w-[860px] px-5 py-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="m-0 text-[19px] font-semibold" style={{ color: tema.texto }}>
                Cadastrar aluna
              </h2>
              <button
                type="button"
                onClick={fecharCadastro}
                aria-label="Fechar o cadastro"
                style={{ ...botaoNeutroGrande, flex: "0 0 auto" }}
              >
                Fechar
              </button>
            </div>

        <form
          onSubmit={cadastrar}
          className="mb-5 flex flex-wrap gap-[10px] rounded-[14px] p-4"
          style={{ background: tema.superficie, border: `1px solid ${tema.linha}` }}
        >
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome da aluna"
            aria-label="Nome da aluna"
            aria-required="true"
            autoFocus
            style={{ ...campo, flex: "2 1 200px" }}
          />
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Nome de acesso"
            aria-label="Nome de acesso"
            aria-required="true"
            style={{ ...campo, flex: "1 1 150px" }}
          />
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Código (4 a 6 números)"
            aria-label="Código de acesso"
            aria-required="true"
            inputMode="numeric"
            style={{ ...campo, flex: "1 1 140px" }}
          />
          <input
            type="tel"
            value={celular}
            onChange={(e) => setCelular(formatarDigitando(e.target.value))}
            placeholder="Celular com DDD"
            aria-label="Celular"
            aria-required="true"
            inputMode="numeric"
            style={{ ...campo, flex: "1 1 150px" }}
          />
          {/*
            O curso e o prazo moram aqui porque é aqui que a decisão é
            tomada. Separá-los em outra tela não tornava a escolha mais
            cuidadosa — só a adiava, e adiada ela às vezes não
            acontecia.
          */}
          <div
            className="mt-1 flex w-full flex-col gap-3 pt-3"
            style={{ borderTop: `1px solid ${tema.linhaSuave}` }}
          >
            {/*
              O que ela vai acessar, escolhido aqui.

              Fica dobrado porque o formulario ja e alto no celular, mas
              o contador e o resumo aparecem NO cabecalho, fechado — a
              pessoa precisa saber o que vai gravar sem ter que abrir.
            */}
            <button
              type="button"
              onClick={() => setAcessoAberto((v) => !v)}
              aria-expanded={acessoAberto}
              className="flex w-full items-center justify-between gap-3 text-left"
              style={{
                ...botaoNeutroGrande,
                background: "transparent",
                border: `1px solid ${nadaEscolhido ? tema.linha : tema.texto}`,
              }}
            >
              <span className="min-w-0">
                <span className="block text-[14px]" style={{ color: tema.texto }}>
                  O que ela vai acessar
                </span>
                <span
                  className="mt-[2px] block text-[13px]"
                  style={{ color: tema.textoSecundario }}
                >
                  {resumoDoQueRecebe}
                </span>
              </span>
              <span className="flex-none text-[13px]" style={{ color: tema.textoSecundario }}>
                {acessoAberto ? "Fechar ▲" : "Escolher ▼"}
              </span>
            </button>

            {acessoAberto ? (
              <div className="flex flex-col gap-4 pl-[2px]">
                <ListaDeEscolha
                  titulo="Mentoria"
                  vazio="Nenhum módulo cadastrado ainda."
                  itens={catalogo.modulos.map((m) => ({
                    id: m.id,
                    nome: `Módulo ${m.numero} · ${m.titulo}`,
                    quantos: `${m.aulas.length} ${m.aulas.length === 1 ? "aula" : "aulas"}`,
                  }))}
                  marcados={modulosEscolhidos}
                  aoAlternar={(id) => alternar(id, modulosEscolhidos, setModulosEscolhidos)}
                  aoTodos={() => setModulosEscolhidos(new Set(catalogo.modulos.map((m) => m.id)))}
                  aoNenhum={() => setModulosEscolhidos(new Set())}
                />

                {/*
                  O ritmo das aulas pertence a Mentoria.

                  Estava depois de Presentes, no rodape junto do prazo —
                  longe do que governa. Recuado, para ler como parte da
                  lista de cima e nao como um terceiro grupo. Sem aula
                  marcada nao ha o que espacar, entao some.
                */}
                {modulosEscolhidos.size > 0 ? (
                  <div className="flex flex-wrap items-end gap-3 pl-[14px]">
                    <label className="flex flex-col gap-[6px]">
                      <span style={rotulo}>Uma aula a cada</span>
                      <input
                        type="number"
                        min={0}
                        max={365}
                        inputMode="numeric"
                        value={intervalo}
                        onChange={(e) => setIntervalo(e.target.value)}
                        placeholder={String(intervaloPadrao)}
                        aria-label="Intervalo em dias entre as aulas"
                        style={{ ...campo, width: 92, textAlign: "center" }}
                      />
                    </label>
                    <label className="flex flex-col gap-[6px]">
                      <span style={rotulo}>Começando em</span>
                      <Calendario valor={inicio} aoEscolher={setInicio} />
                    </label>
                  </div>
                ) : null}
                <ListaDeEscolha
                  titulo="Presentes"
                  vazio="Nenhuma categoria cadastrada ainda."
                  itens={catalogo.categorias.map((c) => ({
                    id: c.id,
                    nome: c.titulo,
                    quantos: `${c.presentes.length} ${
                      c.presentes.length === 1 ? "presente" : "presentes"
                    }`,
                  }))}
                  marcados={categoriasEscolhidas}
                  aoAlternar={(id) => alternar(id, categoriasEscolhidas, setCategoriasEscolhidas)}
                  aoTodos={() =>
                    setCategoriasEscolhidas(new Set(catalogo.categorias.map((c) => c.id)))
                  }
                  aoNenhum={() => setCategoriasEscolhidas(new Set())}
                />

                {/*
                  Quando as aulas abrem, e ate quando a conta vale.

                  Moravam fora desta secao, soltos entre ela e o botao
                  de gravar — tres controles orfaos que decidem o acesso
                  da aluna, do lado de fora do lugar chamado "o que ela
                  vai acessar". O traco os separa das listas para nao
                  parecerem mais um item de catalogo.
                */}
                <div
                  className="flex flex-col gap-4 pt-4"
                  style={{ borderTop: `1px solid ${tema.linhaSuave}` }}
                >
                  {/* O prazo e da conta, nao do conteudo: fica sempre. */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span style={{ ...rotulo, flex: "0 0 100%" }}>Acesso por</span>
                    {PRAZOS.map((x) => {
                      const escolhido = prazo === x.chave;
                      return (
                        <button
                          key={x.chave}
                          type="button"
                          onClick={() => setPrazo(x.chave)}
                          aria-pressed={escolhido}
                          style={{
                            ...botaoNeutro,
                            color: escolhido ? "#000000" : tema.texto,
                            background: escolhido ? tema.texto : "transparent",
                            border: `1px solid ${escolhido ? tema.texto : tema.linha}`,
                          }}
                        >
                          {x.nome}
                        </button>
                      );
                    })}
                  </div>

                  {osBotoes}
                </div>
              </div>
            ) : null}

          </div>

          {acessoAberto ? null : (
            <div className="flex w-full flex-wrap gap-[10px]">{oCancelar}</div>
          )}
        </form>
          </div>
        </div>,
            document.body,
          )
        : null}

      {/*
        O convite, logo depois de cadastrar.
        
        Antes, entregar o acesso era: fechar tudo, achar a aluna na
        lista, abrir a ficha, ler o código, clicar no WhatsApp e digitar
        à mão o endereço, o acesso e o código — os três dados que não
        podem sair errados. Agora a mensagem já vem escrita, e o cartão
        aparece onde os olhos estão: onde o formulário acabou de fechar.
      */}
      {pronta ? (
        <div
          className="mb-5 p-4"
          style={{ background: tema.superficie, border: `1px solid ${tema.linha}`, borderRadius: 14 }}
        >
          <p className="m-0 text-[15px] font-semibold" style={{ color: tema.texto }}>
            {pronta.nome} está pronta.
          </p>
          <p className="mb-3 mt-1 text-[13px]" style={{ color: tema.textoSecundario }}>
            Acesso <strong style={{ color: tema.texto }}>{pronta.login}</strong> · código{" "}
            <strong style={{ color: tema.texto }}>{pronta.codigo}</strong>
          </p>

          <div className="flex flex-wrap gap-2">
            {(() => {
              const convite = convitePeloWhatsApp(pronta.celular, pronta);
              return convite ? (
                <a
                  href={convite}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...botaoOuro,
                    display: "inline-flex",
                    alignItems: "center",
                    textDecoration: "none",
                  }}
                >
                  Enviar o acesso no WhatsApp
                </a>
              ) : (
                /*
                  Sem celular não há link — e dizer por quê vale mais
                  que esconder o botão em silêncio, porque a solução é
                  de um campo só.
                */
                <span className="text-[13px]" style={{ color: tema.textoTerciario }}>
                  Sem celular cadastrado — abra a ficha dela para acrescentar e enviar o acesso.
                </span>
              );
            })()}
            <button onClick={() => setPronta(null)} style={botaoNeutro}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}

      {/*
        Enquanto o banco responde, `alunas` é uma lista vazia — e a tela
        dizia "Nenhuma aluna cadastrada ainda", que é a frase mais
        alarmante possível para quem administra uma turma, a cada
        carregamento. O dado sempre existiu; esta tela é que não o lia.
      */}
      {carregando ? (
        <p className="mb-6 mt-0 text-[14px]" style={{ color: tema.textoSecundario }}>
          Carregando as alunas…
        </p>
      ) : alunas.length === 0 ? (
        <p
          className="mb-6 mt-0 rounded-[14px] p-[22px] text-center text-[15px]"
          style={{
            color: tema.textoSecundario,
            background: tema.superficie,
            border: `1px dashed ${tema.linha}`,
          }}
        >
          Nenhuma aluna cadastrada ainda.
        </p>
      ) : visiveis.length === 0 ? (
        <p className="mb-6 mt-0 text-[14px]" style={{ color: tema.textoSecundario }}>
          Nenhuma aluna encontrada.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {visiveis.map((aluna) => {
          const aberta = abertaId === aluna.id;
          const liberadas = aluna.cronograma.size;
          const bloqueada = aluna.status === "bloqueada";
          const prazo = estadoDoPrazo(aluna.acessoAte);

          return (
            <div
              key={aluna.id}
              className="rounded-cartao p-4"
              style={{
                background: aberta ? tema.superficieAlta : tema.superficie,
                border: `1px solid ${
                  bloqueada ? tema.perigoLinha : aberta ? tema.linha : tema.linhaSuave
                }`,
              }}
            >
              {/*
                A linha inteira abre a ficha. Um alvo grande é o que
                torna isto usável no toque — e evita o botãozinho
                "detalhes" que ninguém encontra.
              */}
              <button
                onClick={() => setAbertaId(aberta ? "" : aluna.id)}
                aria-expanded={aberta}
                className="flex w-full flex-wrap items-center gap-3 border-none bg-transparent p-0 text-left"
                style={{ cursor: "pointer" }}
              >
                <span
                  className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full text-[15px] font-bold"
                  style={{ border: `1px solid ${tema.linha}`, color: tema.texto }}
                >
                  {aluna.nome.charAt(0).toUpperCase()}
                </span>

                <span className="flex min-w-0 flex-[1_1_200px] flex-col gap-[3px]">
                  <span className="text-[15px] font-bold" style={{ color: tema.texto }}>
                    {aluna.nome}
                  </span>
                  <span className="text-[12px]" style={{ color: tema.textoSecundario }}>
                    {aluna.login} ·{" "}
                    {liberadas === 0
                      ? "sem conteúdo liberado"
                      : liberadas === totalAulas
                        ? "curso inteiro"
                        : `${liberadas} de ${totalAulas} aulas`}
                  </span>
                </span>

                {bloqueada ? <span style={etiqueta(tema.perigo)}>bloqueada</span> : null}
                {prazo.semPrazo || !prazo.vencido ? null : (
                  <span style={etiqueta(tema.perigo)}>{prazo.rotulo}</span>
                )}
                {prazo.semPrazo || prazo.vencido || !prazo.perto ? null : (
                  <span style={etiqueta(tema.textoSecundario)}>{prazo.rotulo}</span>
                )}

                <span
                  className="flex-none text-[13px]"
                  style={{ color: tema.textoTerciario }}
                  aria-hidden="true"
                >
                  {aberta ? "▲" : "▼"}
                </span>
              </button>

              {aberta ? (
                <FichaDaAluna
                  aluna={aluna}
                  meuPapel={meuPapel}
                  painel={painel}
                  executar={executar}
                  avisar={avisar}
                  pedirConfirmacao={pedirConfirmacao}
                  aoFechar={() => setAbertaId("")}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}
