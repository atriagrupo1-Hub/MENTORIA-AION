import { useCallback, useEffect, useState, type FormEvent } from "react";
import * as dados from "./dados";
import type { Colaborador } from "./dados";
import type { PedidoConfirmacao } from "./Confirmacao";
import { PAPEIS_QUE_SE_CRIA, NOME_DO_PAPEL, type PapelNovo, type Papel, ehDono } from "./papeis";
import {
  botaoNeutro,
  botaoNeutroGrande,
  botaoOuro,
  botaoRemover,
  campo,
  cartao,
  etiqueta,
  painel as tema,
  rotulo,
} from "./estilos";

/**
 * A equipe.
 *
 * Duas funções, e a diferença entre elas cabe numa frase — que está na
 * tela, ao lado de cada opção, e não escondida numa ajuda. Quem escolhe
 * entre "Suporte" e "Administrador" precisa saber o que está dando a
 * alguém no momento de dar.
 *
 * Só o dono age aqui. O administrador vê a lista — ele faz tudo no
 * painel, e saber quem tem acesso faz parte disso — mas sem os botões e
 * sem os códigos. Não é a tela sendo educada: a função no banco devolve
 * o código nulo para quem não é o dono, e as funções de remover,
 * bloquear e trocar código não fazem nada. Esconder o botão é
 * cortesia; a recusa é do banco.
 */

/** "14 de setembro", e o ano quando não é este. */
function data(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const mesmoAno = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    ...(mesmoAno ? {} : { year: "numeric" }),
  });
}

function faz(iso: string | null): string {
  if (!iso) return "nunca entrou";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "entrou hoje";
  if (dias === 1) return "entrou ontem";
  if (dias < 30) return `entrou há ${dias} dias`;
  if (dias < 60) return "entrou há um mês";
  return `entrou há ${Math.floor(dias / 30)} meses`;
}

/** O que cada função pode. Fica ao lado da escolha, não num rodapé. */
const O_QUE_PODE: Record<PapelNovo, string> = {
  suporte:
    "Responde comentários, cadastra, bloqueia e remove aluna, e vê a ficha completa dela. Não mexe no conteúdo, nem em prazo, nem no cronograma.",
  admin: "Faz tudo no painel — conteúdo, presentes, prazos, cronograma. Menos mexer nesta aba.",
};

export function AbaEquipe({
  meuPapel,
  pedirConfirmacao,
  avisar,
}: {
  meuPapel: Papel | undefined;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const souDono = ehDono(meuPapel);
  const [lista, setLista] = useState<Colaborador[] | null>(null);
  const [erro, setErro] = useState("");
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [abertoId, setAbertoId] = useState("");

  const carregar = useCallback(async () => {
    try {
      setErro("");
      setLista(await dados.listarEquipe());
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível carregar a equipe.");
      setLista([]);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function aplicarBloqueio(c: Colaborador, novo: "ativa" | "bloqueada") {
    try {
      await dados.bloquearColaborador(c.id, novo);
      await carregar();
      avisar(
        novo === "bloqueada"
          ? `${c.nome} não entra mais no painel.`
          : `${c.nome} voltou a ter acesso.`,
      );
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível mudar.");
    }
  }

  /*
   * Devolver acesso é inofensivo e vai direto. Tirar acesso derruba a
   * pessoa do painel no meio do trabalho dela — e ficava num botão
   * igual ao de "Trocar código", sem pergunta nenhuma.
   */
  function bloquear(c: Colaborador) {
    if (c.status === "bloqueada") {
      void aplicarBloqueio(c, "ativa");
      return;
    }
    pedirConfirmacao({
      tom: "normal",
      rotuloConfirmar: "Bloquear acesso",
      titulo: `Bloquear o acesso de ${c.nome}?`,
      mensagem:
        "A conta continua existindo, com tudo o que ela fez, e simplesmente " +
        "deixa de entrar. Devolver o acesso é um clique.",
      executar: () => void aplicarBloqueio(c, "bloqueada"),
    });
  }

  return (
    <div>
      {erro ? (
        <p
          className="mb-5 p-4 text-[14px]"
          style={{
            color: tema.perigo,
            background: tema.perigoFundo,
            border: `1px solid ${tema.perigoLinha}`,
            borderRadius: 8,
          }}
        >
          {erro}
        </p>
      ) : null}

      {souDono ? null : (
        <p className="mb-5 text-[14px]" style={{ color: tema.textoSecundario }}>
          Quem entra e sai da equipe é decisão do dono. Aqui você vê quem tem acesso.
        </p>
      )}

      {lista === null ? (
        <p className="text-[14px]" style={{ color: tema.textoSecundario }}>
          Carregando…
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((c) => {
            const aberto = abertoId === c.id;
            const ehODono = c.papel === "dono";
            return (
              <div key={c.id} style={cartao}>
                <button
                  onClick={() => setAbertoId(aberto ? "" : c.id)}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-[14px] text-left"
                  style={{ background: "transparent", border: "none", cursor: "pointer" }}
                >
                  {/*
                    O nome ocupa a linha toda no celular.
                    Dividindo a primeira linha com o nome de acesso e
                    duas etiquetas, "Bea Lima" virava "B.." — e o nome
                    é a única coisa nesta linha que não dá para deduzir
                    olhando o resto.
                  */}
                  <span
                    className="w-full min-w-0 truncate text-[15px] font-semibold sm:w-auto sm:flex-1"
                    style={{ color: tema.texto }}
                  >
                    {c.nome}
                    {c.souEu ? (
                      <span
                        className="ml-2 text-[13px] font-normal"
                        style={{ color: tema.textoTerciario }}
                      >
                        você
                      </span>
                    ) : null}
                  </span>

                  <span className="flex-none text-[13px]" style={{ color: tema.textoSecundario }}>
                    {c.login}
                  </span>

                  <span style={etiqueta(ehODono ? tema.texto : tema.textoSecundario)}>
                    {NOME_DO_PAPEL[c.papel]}
                  </span>

                  {c.status === "bloqueada" ? (
                    <span style={etiqueta(tema.perigo)}>bloqueado</span>
                  ) : null}

                  <span
                    className="flex-none text-[13px]"
                    style={{ color: tema.textoTerciario }}
                    aria-hidden="true"
                  >
                    {aberto ? "▲" : "▼"}
                  </span>
                </button>

                {aberto ? (
                  <div
                    className="px-4 pb-4"
                    style={{ borderTop: `1px solid ${tema.linhaSuave}`, paddingTop: 14 }}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-[7px]">
                      <span style={{ ...rotulo, flex: "0 0 130px" }}>Entrou na equipe</span>
                      <span className="flex-1 text-[14px]" style={{ color: tema.texto }}>
                        {data(c.criadaEm)}
                        <span style={{ color: tema.textoTerciario }}> · {faz(c.ultimoAcessoEm)}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-[7px]">
                      <span style={{ ...rotulo, flex: "0 0 130px" }}>Código</span>
                      <span className="flex-1 text-[14px]" style={{ color: tema.texto }}>
                        {c.codigo ?? (
                          <span style={{ color: tema.textoTerciario }}>
                            só o dono vê o código de quem trabalha aqui
                          </span>
                        )}
                      </span>
                    </div>

                    {souDono ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <TrocarCodigo colaborador={c} avisar={avisar} aoTrocar={carregar} />

                        {ehODono || c.souEu ? null : (
                          <>
                            <button onClick={() => bloquear(c)} style={botaoNeutro}>
                              {c.status === "ativa" ? "Bloquear acesso" : "Devolver acesso"}
                            </button>
                            <button
                              onClick={() =>
                                pedirConfirmacao({
                                  titulo: `Remover ${c.nome}?`,
                                  mensagem:
                                    "A conta sai da equipe e não entra mais no painel. " +
                                    "O que essa pessoa respondeu nos comentários continua no ar, " +
                                    "assinado com o nome dela.",
                                  executar: async () => {
                                    try {
                                      await dados.removerColaborador(c.id);
                                      setAbertoId("");
                                      await carregar();
                                      avisar(`${c.nome} saiu da equipe.`);
                                    } catch (falha) {
                                      avisar(
                                        falha instanceof Error
                                          ? falha.message
                                          : "Não foi possível remover.",
                                      );
                                    }
                                  },
                                })
                              }
                              style={botaoRemover}
                            >
                              Remover
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/*
        O cadastro fica no fim da lista, como nas outras abas: é o lugar
        onde a pessoa já está olhando depois de conferir quem existe.
      */}
      {souDono ? (
        <div className="mt-4">
          {cadastroAberto ? (
            <Cadastro
              avisar={avisar}
              aoTerminar={async () => {
                setCadastroAberto(false);
                await carregar();
              }}
              aoCancelar={() => setCadastroAberto(false)}
            />
          ) : (
            <button onClick={() => setCadastroAberto(true)} style={botaoNeutro}>
              Adicionar alguém
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Trocar o código de alguém.
 *
 * Aberto por um botão e não sempre à mostra: é a ação que muda a senha
 * de outra pessoa, e ela não deve ficar a um clique de distância em
 * cada linha.
 */
function TrocarCodigo({
  colaborador,
  avisar,
  aoTrocar,
}: {
  colaborador: Colaborador;
  avisar: (m: string) => void;
  aoTrocar: () => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [salvando, setSalvando] = useState(false);

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} style={botaoNeutro}>
        Trocar código
      </button>
    );
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (salvando) return;
    setSalvando(true);
    try {
      const deu = await dados.mudarCodigo(colaborador.id, codigo.trim());
      if (!deu) {
        avisar("O código tem de 4 a 6 números.");
        return;
      }
      setAberto(false);
      setCodigo("");
      await aoTrocar();
      avisar(`Código de ${colaborador.nome} trocado.`);
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não foi possível trocar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        placeholder="código novo"
        aria-label={`Código novo de ${colaborador.nome}`}
        style={{ ...campo, width: 140 }}
      />
      <button
        type="submit"
        disabled={codigo.trim().length < 4 || salvando}
        style={{
          ...botaoOuro,
          minHeight: 36,
          fontSize: 13,
          opacity: codigo.trim().length < 4 || salvando ? 0.4 : 1,
          cursor: codigo.trim().length < 4 || salvando ? "default" : "pointer",
        }}
      >
        {salvando ? "Trocando…" : "Trocar"}
      </button>
      <button
        type="button"
        onClick={() => {
          setAberto(false);
          setCodigo("");
        }}
        style={botaoNeutroGrande}
      >
        Cancelar
      </button>
    </form>
  );
}

function Cadastro({
  avisar,
  aoTerminar,
  aoCancelar,
}: {
  avisar: (m: string) => void;
  aoTerminar: () => Promise<void>;
  aoCancelar: () => void;
}) {
  const [nome, setNome] = useState("");
  const [login, setLogin] = useState("");
  const [codigo, setCodigo] = useState("");
  const [papel, setPapel] = useState<PapelNovo>("suporte");
  const [salvando, setSalvando] = useState(false);

  const acesso = login.trim().toLowerCase();
  const podeSalvar =
    nome.trim().length >= 2 && /^[a-z0-9._-]{2,40}$/.test(acesso) && codigo.trim().length >= 4;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (salvando || !podeSalvar) return;
    setSalvando(true);
    try {
      const r = await dados.cadastrarColaborador(nome.trim(), acesso, codigo.trim(), papel);
      if (!r.ok) {
        avisar(r.mensagem);
        return;
      }
      setNome("");
      setLogin("");
      setCodigo("");
      setPapel("suporte");
      await aoTerminar();
      avisar(`${nome.trim()} entrou como ${NOME_DO_PAPEL[papel].toLowerCase()}.`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="p-4" style={cartao}>
      <p className="mb-4 mt-0 text-[15px] font-semibold" style={{ color: tema.texto }}>
        Adicionar alguém à equipe
      </p>

      {/*
        A função vem antes do nome de propósito. É a escolha que decide
        o que a pessoa vai poder fazer, e as duas frases embaixo dizem o
        que cada uma quer dizer — no momento de escolher, não depois.
      */}
      <fieldset className="mb-4 border-0 p-0">
        <legend className="mb-2" style={rotulo}>
          Função
        </legend>
        <div className="flex flex-col gap-2">
          {PAPEIS_QUE_SE_CRIA.map((p) => (
            <label
              key={p}
              className="flex cursor-pointer gap-3 p-3"
              style={{
                background: papel === p ? tema.superficieAlta : "transparent",
                border: `1px solid ${papel === p ? tema.linha : tema.linhaSuave}`,
                borderRadius: 8,
              }}
            >
              <input
                type="radio"
                name="papel-novo"
                value={p}
                checked={papel === p}
                onChange={() => setPapel(p)}
                className="mt-1"
                /* O azul do navegador é a única cor estranha ao painel. */
                style={{ accentColor: tema.texto }}
              />
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold" style={{ color: tema.texto }}>
                  {NOME_DO_PAPEL[p]}
                </span>
                <span
                  className="mt-1 block text-[13px] leading-[1.5]"
                  style={{ color: tema.textoSecundario }}
                >
                  {O_QUE_PODE[p]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <label className="min-w-[180px] flex-1">
          <span className="mb-2 block" style={rotulo}>
            Nome
          </span>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="off"
            placeholder="Como ela assina as respostas"
            style={{ ...campo, width: "100%" }}
          />
        </label>

        <label className="min-w-[160px] flex-1">
          <span className="mb-2 block" style={rotulo}>
            Nome de acesso
          </span>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value.toLowerCase())}
            autoComplete="off"
            placeholder="ana.suporte"
            style={{ ...campo, width: "100%" }}
          />
        </label>

        <label className="min-w-[120px]">
          <span className="mb-2 block" style={rotulo}>
            Código
          </span>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="4 a 6 números"
            style={{ ...campo, width: "100%" }}
          />
        </label>
      </div>

      {/*
        O nome aparece assinando cada resposta que essa pessoa der às
        alunas. Dizer isso aqui evita o "Suporte 2" que ninguém pensou
        que ia virar assinatura.
      */}
      <p className="mb-0 mt-3 text-[13px]" style={{ color: tema.textoTerciario }}>
        O nome vai assinar as respostas dela nos comentários das aulas. O nome de acesso e o
        código são o que ela digita para entrar.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!podeSalvar || salvando}
          style={{
            ...botaoOuro,
            opacity: !podeSalvar || salvando ? 0.4 : 1,
            cursor: !podeSalvar || salvando ? "default" : "pointer",
          }}
        >
          {salvando ? "Criando…" : "Criar acesso"}
        </button>
        <button type="button" onClick={aoCancelar} style={botaoNeutroGrande}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
