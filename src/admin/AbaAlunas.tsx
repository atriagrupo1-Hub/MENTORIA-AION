import { useMemo, useState, type FormEvent } from "react";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import { formatarDigitando, soDigitos } from "./celular";
import { Calendario } from "./Calendario";
import { convitePeloWhatsApp } from "./convite";
import { FichaDaAluna } from "./FichaDaAluna";
import { botaoNeutro, botaoOuro, campo, etiqueta, painel as tema, rotulo } from "./estilos";
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
  const { catalogo, alunas, configuracao, executar, recarregar } = painel;
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
  const [liberarCurso, setLiberarCurso] = useState(true);
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
    if (!nome.trim()) {
      avisar("Informe o nome da aluna.");
      return;
    }
    if (!/^[0-9]{4,6}$/.test(codigo.trim())) {
      avisar("O código tem 4 números.");
      return;
    }
    const digitos = soDigitos(celular);
    if (digitos && (digitos.length < 10 || digitos.length > 15)) {
      avisar("O celular precisa do DDD. Ex.: 11 98765-4321.");
      return;
    }
    setSalvando(true);
    const acesso = login.trim() || nome.trim().toLowerCase().replace(/\s+/g, ".");
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

    if (liberarCurso && catalogo.modulos.length > 0) {
      try {
        await dados.gerarCronograma(
          r.id,
          catalogo.modulos.map((m) => m.id),
          nDias,
          inicio,
        );
      } catch (falha) {
        faltou.push(falha instanceof Error ? `o curso (${falha.message})` : "o curso");
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
    setNome("");
    setLogin("");
    setCodigo("");
    setCelular("");
    setCadastroAberto(false);
    await recarregar();

    avisar(
      faltou.length > 0
        ? `${cadastrada} foi cadastrada, mas faltou ${faltou.join(" e ")}. Abra a ficha dela.`
        : `${cadastrada} está pronta: conta, curso e prazo.`,
    );
  }

  /** O que a aluna nova vai receber, em palavras, antes de o botão ser clicado. */
  const nDias = Math.max(0, Math.floor(Number(intervalo || intervaloPadrao) || 0));
  const totalAulasCatalogo = catalogo.modulos.reduce((n, m) => n + m.aulas.length, 0);
  const resumoDoQueRecebe = !liberarCurso
    ? "Ela entra e ainda não vê aula nenhuma — o curso você dá depois, na ficha."
    : totalAulasCatalogo === 0
      ? "Ainda não há aulas cadastradas para dar."
      : nDias === 0
        ? `As ${totalAulasCatalogo} aulas abrem todas de uma vez.`
        : `As ${totalAulasCatalogo} aulas abrem uma a cada ${nDias} ${
            nDias === 1 ? "dia" : "dias"
          }, a partir da data escolhida.`;

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
        <button onClick={() => setCadastroAberto((v) => !v)} style={botaoOuro}>
          {cadastroAberto ? "Fechar" : "Cadastrar aluna"}
        </button>
      </div>

      {/*
        O cadastro fica guardado. É a ação mais rara desta tela — uma
        turma se cadastra uma vez e se administra por meses — e o
        formulário aberto empurrava a lista para baixo todo dia.
      */}
      {cadastroAberto ? (
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
            autoFocus
            style={{ ...campo, flex: "2 1 200px" }}
          />
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Nome de acesso"
            aria-label="Nome de acesso"
            style={{ ...campo, flex: "1 1 150px" }}
          />
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Código (4 números)"
            aria-label="Código de acesso"
            inputMode="numeric"
            style={{ ...campo, flex: "1 1 140px" }}
          />
          <input
            type="tel"
            value={celular}
            onChange={(e) => setCelular(formatarDigitando(e.target.value))}
            placeholder="Celular (opcional)"
            aria-label="Celular"
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
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={liberarCurso}
                onChange={(e) => setLiberarCurso(e.target.checked)}
                className="mt-[3px]"
                style={{ accentColor: tema.texto }}
              />
              <span className="min-w-0">
                <span className="block text-[14px]" style={{ color: tema.texto }}>
                  Dar o curso inteiro a ela
                </span>
                <span className="mt-[2px] block text-[13px]" style={{ color: tema.textoSecundario }}>
                  {resumoDoQueRecebe}
                </span>
              </span>
            </label>

            {liberarCurso ? (
              <div className="flex flex-wrap items-end gap-3 pl-[27px]">
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
                      minHeight: 36,
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
          </div>

          <button
            type="submit"
            disabled={salvando}
            style={{ ...botaoOuro, flex: "0 0 auto", opacity: salvando ? 0.7 : 1 }}
          >
            {salvando ? "Cadastrando…" : "Cadastrar e liberar"}
          </button>
          {/*
            A saída fica junto do que se está preenchendo. O botão lá em
            cima também fecha, mas quem desistiu está com os olhos aqui
            embaixo, no último campo — e procurar a saída é o que faz
            alguém deixar o formulário aberto pelo resto da tarde.
          */}
          <button
            type="button"
            onClick={() => {
              setNome("");
              setLogin("");
              setCodigo("");
              setCelular("");
              setCadastroAberto(false);
            }}
            style={{ ...botaoNeutro, flex: "0 0 auto", minHeight: 44 }}
          >
            Cancelar
          </button>
        </form>
      ) : null}

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

      {alunas.length === 0 ? (
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
