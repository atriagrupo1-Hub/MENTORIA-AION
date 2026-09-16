import { useMemo, useState, type FormEvent } from "react";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import { formatarDigitando, soDigitos } from "./celular";
import { FichaDaAluna } from "./FichaDaAluna";
import { botaoOuro, campo, etiqueta, painel as tema, rotulo } from "./estilos";
import { estadoDoPrazo } from "./prazo";
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

export function AbaAlunas({
  painel,
  pedirConfirmacao,
  avisar,
}: {
  painel: Painel;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { catalogo, alunas, executar, recarregar } = painel;
  const [nome, setNome] = useState("");
  const [login, setLogin] = useState("");
  const [codigo, setCodigo] = useState("");
  const [celular, setCelular] = useState("");
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [abertaId, setAbertaId] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "ativas" | "bloqueadas">("todas");

  const totalAulas = catalogo.modulos.reduce((s, m) => s + m.aulas.length, 0);

  const ativas = alunas.filter((a) => a.status === "ativa").length;
  const bloqueadas = alunas.length - ativas;

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
      if (filtro === "ativas" && a.status !== "ativa") return false;
      if (filtro === "bloqueadas" && a.status !== "bloqueada") return false;
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
    setSalvando(false);
    if (!r.ok) {
      avisar(r.mensagem);
      return;
    }
    const cadastrada = nome.trim();
    setNome("");
    setLogin("");
    setCodigo("");
    setCelular("");
    setCadastroAberto(false);
    await recarregar();
    avisar(`${cadastrada} foi cadastrada.`);
  }

  const FILTROS = [
    { chave: "todas" as const, nome: "Todas", conta: alunas.length },
    { chave: "ativas" as const, nome: "Ativas", conta: ativas },
    { chave: "bloqueadas" as const, nome: "Bloqueadas", conta: bloqueadas },
  ];

  return (
    <>
      {/*
        Os três números que a colaboradora quer antes de procurar
        alguém. São botões porque cada um também filtra a lista — ler e
        agir no mesmo lugar poupa explicar onde fica o filtro.
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
              }}
            >
              <span className="text-[22px] font-bold leading-none" style={{ color: tema.texto }}>
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
          <button
            type="submit"
            disabled={salvando}
            style={{ ...botaoOuro, flex: "0 0 auto", opacity: salvando ? 0.7 : 1 }}
          >
            {salvando ? "Cadastrando…" : "Cadastrar"}
          </button>
        </form>
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
