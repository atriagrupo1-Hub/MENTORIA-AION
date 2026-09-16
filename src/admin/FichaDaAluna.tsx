import { useCallback, useEffect, useState, type FormEvent } from "react";
import * as dados from "./dados";
import type { AlunaAdmin, ComentarioDaAutora, Ficha } from "./dados";
import { formatar, formatarDigitando, linkWhatsApp, soDigitos } from "./celular";
import type { PedidoConfirmacao } from "./Confirmacao";
import {
  botaoNeutro,
  botaoOuro,
  botaoRemover,
  campo,
  etiqueta,
  painel as tema,
  rotulo,
} from "./estilos";
import { CronogramaDaAluna } from "./CronogramaDaAluna";
import { PrazoDaAluna } from "./PrazoDaAluna";
import type { Painel } from "./usePainel";

/**
 * A ficha de uma aluna.
 *
 * Antes, para saber se alguém estava de fato assistindo, era preciso
 * abrir o Supabase e escrever SQL. Na prática, ninguém sabia. A lista
 * mostrava nome, acesso e quantas aulas tinham sido liberadas — que é o
 * que a equipe deu, não o que a aluna fez.
 *
 * Aqui estão as duas coisas, e a segunda primeiro: progresso, onde ela
 * parou, quando entrou, o que escreveu. Depois o que a equipe controla.
 *
 * Tudo abre dentro da própria linha, sem mudar de página. Quem
 * administra isto costuma percorrer várias alunas seguidas, e cada
 * ida-e-volta é uma chance de perder o lugar na lista.
 *
 * O que NÃO está aqui: tempo assistido. O banco guarda o ponto mais
 * distante de cada aula, não quanto tempo foi visto — somar as posições
 * daria um número que parece tempo e não é. Preferi não mostrar a
 * mostrar errado.
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

/** "há 3 dias" — o que a colaboradora quer saber sobre a última vez. */
function faz(iso: string | null): string {
  if (!iso) return "nunca";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  if (dias < 60) return "há um mês";
  return `há ${Math.floor(dias / 30)} meses`;
}

function Linha({ nome, children }: { nome: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-[7px]">
      <span style={{ ...rotulo, flex: "0 0 130px" }}>{nome}</span>
      <span className="min-w-0 flex-1 text-[14px]" style={{ color: tema.texto }}>
        {children}
      </span>
    </div>
  );
}

export function FichaDaAluna({
  aluna,
  painel,
  executar,
  avisar,
  pedirConfirmacao,
  aoFechar,
}: {
  aluna: AlunaAdmin;
  painel: Painel;
  executar: (f: () => Promise<unknown>) => Promise<string | null>;
  avisar: (m: string) => void;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  aoFechar: () => void;
}) {
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [comentarios, setComentarios] = useState<ComentarioDaAutora[] | null>(null);
  const [erro, setErro] = useState("");
  const [gaveta, setGaveta] = useState<"" | "editar" | "liberacoes" | "prazo" | "comentarios">("");

  const bloqueada = aluna.status === "bloqueada";
  const zap = linkWhatsApp(aluna.celular, `Olá, ${aluna.nome.split(" ")[0]}!`);

  const carregar = useCallback(async () => {
    try {
      setErro("");
      setFicha(await dados.fichaDaAluna(aluna.id));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível carregar a ficha.");
    }
  }, [aluna.id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /*
   * Os comentários só são buscados quando alguém pede.
   *
   * A maioria das visitas à ficha é para conferir progresso ou liberar
   * uma aula. Puxar os comentários de toda aluna aberta seria uma
   * viagem ao banco que quase nunca é lida.
   */
  async function abrirComentarios() {
    setGaveta(gaveta === "comentarios" ? "" : "comentarios");
    if (comentarios !== null) return;
    try {
      setComentarios(await dados.comentariosDaAutora(aluna.id));
    } catch {
      setComentarios([]);
      avisar("Não foi possível carregar os comentários.");
    }
  }

  const feitas = ficha?.aulasConcluidas ?? 0;
  const abertas = ficha?.aulasAbertas ?? 0;
  const atribuidas = ficha?.aulasAtribuidas ?? 0;
  const percentual = atribuidas ? Math.round((feitas / atribuidas) * 100) : 0;

  return (
    <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${tema.linhaSuave}` }}>
      {erro ? (
        <p
          className="mb-4 mt-0 p-3 text-[13px]"
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

      <div className="flex flex-wrap gap-x-10">
        <div className="min-w-[260px] flex-1">
          <Linha nome="Progresso">
            {ficha === null ? (
              <span style={{ color: tema.textoTerciario }}>carregando…</span>
            ) : atribuidas === 0 ? (
              <span style={{ color: tema.textoSecundario }}>sem conteúdo liberado</span>
            ) : (
              <>
                {feitas} de {atribuidas} aulas · {percentual}%
                {/*
                  Atribuídas e abertas não são a mesma coisa. Ela pode
                  ter o curso inteiro atribuído com só nove aulas
                  abertas pelo cronograma — e é sobre as atribuídas que
                  o percentual faz sentido, porque é o curso dela.
                */}
                {abertas < atribuidas ? (
                  <span style={{ color: tema.textoTerciario }}> · {abertas} abertas até hoje</span>
                ) : null}
              </>
            )}
          </Linha>

          <Linha nome="Parou em">
            {ficha === null ? (
              "…"
            ) : ficha.ultimaModulo === null ? (
              <span style={{ color: tema.textoSecundario }}>nunca abriu uma aula</span>
            ) : (
              <>
                Módulo {ficha.ultimaModulo} · Aula {ficha.ultimaAula}
                <span style={{ color: tema.textoTerciario }}> — {faz(ficha.ultimaAtividadeEm)}</span>
              </>
            )}
          </Linha>

          <Linha nome="Entrou em">{data(aluna.criadaEm)}</Linha>

          <Linha nome="Primeiro acesso">
            {aluna.primeiroAcessoEm ? (
              data(aluna.primeiroAcessoEm)
            ) : (
              <span style={{ color: tema.textoSecundario }}>nunca entrou</span>
            )}
          </Linha>

          <Linha nome="Último acesso">
            {aluna.ultimoAcessoEm ? (
              <>
                {data(aluna.ultimoAcessoEm)}
                <span style={{ color: tema.textoTerciario }}> — {faz(aluna.ultimoAcessoEm)}</span>
              </>
            ) : (
              <span style={{ color: tema.textoSecundario }}>nunca entrou</span>
            )}
          </Linha>
        </div>

        <div className="min-w-[260px] flex-1">
          <Linha nome="Nome de acesso">{aluna.login}</Linha>
          <Linha nome="Código">{aluna.codigo || "—"}</Linha>
          <Linha nome="Celular">
            {aluna.celular ? (
              formatar(aluna.celular)
            ) : (
              <span style={{ color: tema.textoSecundario }}>não informado</span>
            )}
          </Linha>
          <Linha nome="Comentários">
            {ficha === null ? (
              "…"
            ) : ficha.comentarios === 0 ? (
              <span style={{ color: tema.textoSecundario }}>nenhum</span>
            ) : (
              <button
                onClick={() => void abrirComentarios()}
                /*
                  A margem negativa devolve o espaço que o preenchimento
                  tomou: o alvo de toque cresce para 38px, e a linha
                  continua alinhada com as outras. Sem isso, no celular
                  este era o único alvo abaixo de 36px da tela.
                */
                className="-my-2 border-none bg-transparent px-0 py-2 text-left text-[14px] underline underline-offset-4"
                style={{ color: tema.texto, cursor: "pointer" }}
              >
                {ficha.comentarios === 1 ? "1 comentário" : `${ficha.comentarios} comentários`}
              </button>
            )}
          </Linha>
          <Linha nome="Curtidas">{ficha === null ? "…" : ficha.curtidas}</Linha>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {/*
          Falar com a aluna vem primeiro. É a ação que mais se usa e a
          única que sai daqui para o mundo — e, sem celular cadastrado,
          o botão não existe: melhor ausente que levando a uma conversa
          com um número que não é dela.
        */}
        {zap ? (
          <a
            href={zap}
            target="_blank"
            rel="noreferrer"
            style={{ ...botaoOuro, display: "inline-flex", alignItems: "center", textDecoration: "none" }}
          >
            Chamar no WhatsApp
          </a>
        ) : null}

        <button
          onClick={() => setGaveta(gaveta === "editar" ? "" : "editar")}
          style={botaoNeutro}
        >
          {gaveta === "editar" ? "Fechar edição" : "Editar cadastro"}
        </button>
        <button
          onClick={() => setGaveta(gaveta === "liberacoes" ? "" : "liberacoes")}
          style={botaoNeutro}
        >
          {gaveta === "liberacoes" ? "Fechar liberações" : "Liberações"}
        </button>
        <button onClick={() => setGaveta(gaveta === "prazo" ? "" : "prazo")} style={botaoNeutro}>
          {gaveta === "prazo" ? "Fechar prazo" : "Prazo de acesso"}
        </button>
        <button
          onClick={async () => {
            const falha = await executar(() =>
              dados.definirStatus(aluna.id, bloqueada ? "ativa" : "bloqueada"),
            );
            avisar(
              falha ??
                (bloqueada ? `${aluna.nome} foi desbloqueada.` : `${aluna.nome} foi bloqueada.`),
            );
          }}
          style={botaoNeutro}
        >
          {bloqueada ? "Desbloquear" : "Bloquear"}
        </button>
        <button
          onClick={() =>
            pedirConfirmacao({
              titulo: `Remover ${aluna.nome}?`,
              mensagem:
                "A aluna perde o acesso, e o progresso, as curtidas e os comentários dela são apagados junto.",
              executar: async () => {
                const falha = await executar(() => dados.removerAluna(aluna.id));
                aoFechar();
                avisar(falha ?? `${aluna.nome} foi removida.`);
              },
            })
          }
          style={botaoRemover}
        >
          Remover
        </button>
      </div>

      {gaveta === "editar" ? (
        <Editar aluna={aluna} executar={executar} avisar={avisar} aoTerminar={() => setGaveta("")} />
      ) : null}

      {gaveta === "prazo" ? (
        <PrazoDaAluna
          aluna={aluna}
          executar={executar}
          avisar={avisar}
          pedirConfirmacao={pedirConfirmacao}
        />
      ) : null}

      {gaveta === "liberacoes" ? (
        <CronogramaDaAluna
          aluna={aluna}
          catalogo={painel.catalogo}
          midiaAulas={painel.midiaAulas}
          intervaloPadrao={painel.configuracao.intervaloDias}
          executar={executar}
          avisar={avisar}
          pedirConfirmacao={pedirConfirmacao}
        />
      ) : null}

      {gaveta === "comentarios" ? (
        <div className="mt-4 flex flex-col gap-2">
          {comentarios === null ? (
            <p className="m-0 text-[13px]" style={{ color: tema.textoSecundario }}>
              Carregando…
            </p>
          ) : (
            comentarios.map((c) => (
              <div
                key={c.id}
                className="p-3"
                style={{ background: tema.superficieAlta, borderRadius: 8 }}
              >
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span style={rotulo}>
                    Módulo {c.moduloNumero} · Aula {c.aulaNumero}
                  </span>
                  {c.ehResposta ? (
                    <span className="text-[12px]" style={{ color: tema.textoTerciario }}>
                      ↳ resposta
                    </span>
                  ) : null}
                  <span className="text-[12px]" style={{ color: tema.textoTerciario }}>
                    {data(c.criadoEm)}
                  </span>
                  {c.status === "publicado" ? null : (
                    <span
                      className="ml-auto"
                      style={etiqueta(c.status === "removido" ? tema.perigo : tema.textoTerciario)}
                    >
                      {c.status}
                    </span>
                  )}
                </div>
                <p
                  className="m-0 whitespace-pre-wrap text-[13px] leading-[1.6]"
                  style={{ color: tema.texto }}
                >
                  {c.texto}
                </p>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Corrigir nome, nome de acesso e celular.
 *
 * O código de entrada não se edita aqui, de propósito: trocá-lo é
 * trocar a credencial da aluna, e isso pede um caminho próprio, com
 * aviso, não um campo no meio de uma correção de nome.
 */
function Editar({
  aluna,
  executar,
  avisar,
  aoTerminar,
}: {
  aluna: AlunaAdmin;
  executar: (f: () => Promise<unknown>) => Promise<string | null>;
  avisar: (m: string) => void;
  aoTerminar: () => void;
}) {
  const [nome, setNome] = useState(aluna.nome);
  const [login, setLogin] = useState(aluna.login);
  const [celular, setCelular] = useState(formatar(aluna.celular));
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const digitos = soDigitos(celular);
    if (digitos && (digitos.length < 10 || digitos.length > 15)) {
      avisar("O celular precisa do DDD. Ex.: 11 98765-4321.");
      return;
    }
    setSalvando(true);
    const falha = await executar(() =>
      dados.editarAluna(aluna.id, nome, login, digitos),
    );
    setSalvando(false);
    if (falha) {
      avisar(falha);
      return;
    }
    aoTerminar();
    avisar("Cadastro atualizado.");
  }

  return (
    <form onSubmit={salvar} className="mt-4 flex flex-wrap gap-[10px]">
      <input
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome"
        aria-label="Nome da aluna"
        style={{ ...campo, flex: "2 1 200px" }}
      />
      <input
        type="text"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        placeholder="Nome de acesso"
        aria-label="Nome de acesso"
        style={{ ...campo, flex: "1 1 160px" }}
      />
      <input
        type="tel"
        value={celular}
        onChange={(e) => setCelular(formatarDigitando(e.target.value))}
        placeholder="Celular"
        aria-label="Celular"
        inputMode="numeric"
        style={{ ...campo, flex: "1 1 160px" }}
      />
      <button type="submit" disabled={salvando} style={{ ...botaoOuro, opacity: salvando ? 0.7 : 1 }}>
        {salvando ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
