import { useRef, useState } from "react";
import type { Conteudo, TipoConteudo } from "@/data/tipos";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import {
  botaoNeutro,
  botaoOuro,
  botaoRemover,
  campo,
  LARGURA_DE_NOME,
  painel as tema,
  rotulo,
} from "./estilos";
import { useArrastar } from "./arrastar";
import type { Painel } from "./usePainel";
import { idDoVideo, provedorDoLink } from "./video";

/*
 * O conteúdo — o último degrau, e o que a aluna de fato recebe.
 *
 *   produto  ->  módulo  ->  aula  ->  CONTEÚDO
 *
 * Um componente só, montado no módulo e na aula. É o que faz um e-book
 * e uma aula terem a mesma forma: onde a aula tem vídeo, o e-book tem
 * PDF, e a caixa que os cadastra é a mesma. Escolhem-se quantos
 * quiser, e só o que for preenchido aparece para a aluna.
 *
 * Seis tipos, e não um por palavra do catálogo: "e-book" é um PDF,
 * "material complementar" é um PDF ou um link, "capa" é uma imagem.
 *
 * O TIPO manda no campo. Escolher "Vídeo" ou "PDF" muda o rótulo, a
 * dica, o exemplo dentro do campo e o feitio dele — e, nos tipos de
 * arquivo, o depósito para onde o envio vai. Antes escolher o tipo não
 * mudava nada: o campo do valor só existia depois, na linha já criada,
 * e quem escolhia "Vídeo" não via onde colar o link.
 */

/** Tudo o que um tipo precisa dizer sobre si. Fonte única das duas telas. */
type Definicao = {
  tipo: TipoConteudo;
  nome: string;
  /** Rótulo do campo do valor. */
  campo: string;
  dica: string;
  /** Aparece dentro do campo vazio, como exemplo. */
  exemplo: string;
  /** Para onde o envio vai. Nulo = não é arquivo. */
  deposito: dados.Deposito | null;
  /** O que o seletor de arquivo oferece. */
  aceita: string;
  /** 1 = campo de uma linha; mais que isso, caixa de texto. */
  linhas: number;
};

const TIPOS: Definicao[] = [
  {
    tipo: "video",
    nome: "Vídeo",
    campo: "Link ou id do vídeo",
    dica: "Cloudflare Stream, YouTube ou Vimeo — pode colar o endereço da barra",
    exemplo: "https://youtu.be/AbCdEf12345",
    deposito: null,
    aceita: "",
    linhas: 1,
  },
  {
    tipo: "audio",
    nome: "Áudio",
    campo: "Arquivo no depósito audios",
    dica: "MP3 ou M4A — envie o arquivo aqui, ou cole o caminho",
    exemplo: "modulo-1/oracao.mp3",
    deposito: "audios",
    aceita: "audio/*",
    linhas: 1,
  },
  {
    tipo: "texto",
    nome: "Texto",
    campo: "Texto",
    dica: "aparece na tela da aluna; linha em branco separa parágrafo",
    exemplo: "Escreva aqui o que a aluna vai ler.",
    deposito: null,
    aceita: "",
    linhas: 4,
  },
  {
    tipo: "pdf",
    nome: "PDF / e-book",
    campo: "Arquivo no depósito materiais",
    dica: "PDF — envie o arquivo aqui, ou cole o caminho",
    exemplo: "ebooks/manuscritos.pdf",
    deposito: "materiais",
    aceita: "application/pdf",
    linhas: 1,
  },
  {
    tipo: "link",
    nome: "Link",
    campo: "Endereço",
    dica: "endereço completo, com https://",
    exemplo: "https://exemplo.com/pagina",
    deposito: null,
    aceita: "",
    linhas: 1,
  },
  {
    tipo: "imagem",
    nome: "Imagem / capa",
    campo: "Arquivo no depósito capas",
    dica: "JPG, PNG ou WEBP — envie o arquivo aqui, ou cole o caminho",
    exemplo: "capas/modulo-1.jpg",
    deposito: "capas",
    aceita: "image/*",
    linhas: 1,
  },
];

const DEFINICAO = Object.fromEntries(TIPOS.map((t) => [t.tipo, t])) as Record<
  TipoConteudo,
  Definicao
>;

/**
 * O valor cru vira as colunas do banco — ou uma recusa com motivo.
 *
 * Mora fora dos componentes porque criar e editar gravam a mesma
 * coisa: o que mudava entre as duas telas era só onde o campo estava.
 */
function valorDoTipo(
  tipo: TipoConteudo,
  bruto: string,
): { valor: dados.ValorDoConteudo } | { erro: string } {
  const s = bruto.trim();

  if (tipo === "video") {
    /*
     * Guarda o id, não o link inteiro: é o id que a Edge Function
     * assina, e é o que `video_do_conteudo` devolve. Colar o endereço
     * da barra do navegador tem que funcionar.
     */
    const id = idDoVideo(s);
    if (s && !id) return { erro: "Não reconheci esse endereço de vídeo." };
    return {
      valor: { video_ref: id || null, video_provider: id ? provedorDoLink(s) : null },
    };
  }

  if (tipo === "texto") return { valor: { texto: s || null } };

  if (tipo === "link") {
    if (s && !/^https?:\/\//i.test(s)) {
      return { erro: "O endereço precisa começar com https://" };
    }
    return { valor: { url: s || null } };
  }

  return { valor: { arquivo_path: s || null } };
}

/**
 * Confere o arquivo antes de gravar.
 *
 * Caminho digitado errado era gravado calado, e só aparecia como
 * "ainda não está disponível" na tela da aluna, semanas depois. O
 * aviso nomeia o depósito, que é justamente o que se erra.
 */
async function conferirArquivo(def: Definicao, bruto: string): Promise<string | null> {
  const s = bruto.trim();
  if (!def.deposito || !s) return null;
  const existe = await dados.arquivoExiste(def.deposito, s);
  if (existe) return null;
  return `Não encontrei "${s}" no depósito ${def.deposito}. Confira o caminho, ou envie o arquivo pelo botão.`;
}

const BOTAO_SETA: React.CSSProperties = {
  ...botaoNeutro,
  minHeight: 44,
  minWidth: 44,
  padding: 0,
  fontSize: 16,
};

/** Onde o conteúdo pendura. Os três nulos = direto no produto. */
export type DonoDoConteudo = {
  produtoId: string;
  moduloId?: string | null;
  aulaId?: string | null;
  presenteId?: string | null;
};

/**
 * O campo do valor, do feitio do tipo escolhido.
 *
 * O mesmo nas duas telas — por isso vive aqui, e não dentro de uma
 * delas: era esse o jeito de "escolher o tipo muda o campo" valer
 * também na hora de criar.
 */
function CampoDoValor({
  def,
  valor,
  aoMudar,
  produtoId,
  avisar,
}: {
  def: Definicao;
  valor: string;
  aoMudar: (v: string) => void;
  produtoId: string;
  avisar: (m: string) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const seletor = useRef<HTMLInputElement | null>(null);

  async function enviar(arquivo: File | undefined) {
    if (!arquivo || !def.deposito) return;
    setEnviando(true);
    try {
      const caminho = await dados.enviarArquivo(def.deposito, produtoId, arquivo);
      aoMudar(caminho);
      avisar("Arquivo enviado. Agora é só salvar.");
    } catch (falha) {
      avisar(falha instanceof Error ? falha.message : "Não consegui enviar o arquivo.");
    } finally {
      setEnviando(false);
      if (seletor.current) seletor.current.value = "";
    }
  }

  return (
    <label className="flex min-w-[200px] flex-1 flex-col gap-[6px]">
      <span style={rotulo}>
        {def.campo} · {def.dica}
      </span>

      <div className="flex flex-wrap items-start gap-[8px]">
        {def.linhas > 1 ? (
          <textarea
            value={valor}
            onChange={(e) => aoMudar(e.target.value)}
            rows={def.linhas}
            placeholder={def.exemplo}
            aria-label={def.campo}
            style={{
              ...campo,
              flex: "1 1 200px",
              minWidth: 0,
              minHeight: 96,
              padding: "12px 14px",
              resize: "vertical",
            }}
          />
        ) : (
          <input
            value={valor}
            onChange={(e) => aoMudar(e.target.value)}
            placeholder={def.exemplo}
            aria-label={def.campo}
            style={{ ...campo, flex: "1 1 200px", minWidth: 0 }}
          />
        )}

        {def.deposito ? (
          <>
            <button
              type="button"
              onClick={() => seletor.current?.click()}
              disabled={enviando}
              style={{
                ...botaoNeutro,
                minHeight: 44,
                padding: "0 16px",
                fontSize: 13,
                opacity: enviando ? 0.5 : 1,
              }}
            >
              {enviando ? "Enviando…" : "Enviar arquivo"}
            </button>
            {/*
              O seletor de arquivo do navegador não se deixa pintar, e
              cada navegador desenha o dele de um jeito. Fica escondido
              atrás de um botão do painel, que é igual em todos.
            */}
            <input
              ref={seletor}
              type="file"
              accept={def.aceita}
              onChange={(e) => void enviar(e.target.files?.[0])}
              className="hidden"
              aria-label={`Enviar arquivo para o depósito ${def.deposito}`}
            />
          </>
        ) : null}
      </div>
    </label>
  );
}

export function EditorConteudos({
  dono,
  conteudos,
  painel,
  pedirConfirmacao,
  avisar,
}: {
  dono: DonoDoConteudo;
  conteudos: Conteudo[];
  painel: Painel;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { executar, reordenar } = painel;
  const [adicionando, setAdicionando] = useState(false);
  const [tipoNovo, setTipoNovo] = useState<TipoConteudo>("video");
  const [tituloNovo, setTituloNovo] = useState("");
  const [valorNovo, setValorNovo] = useState("");

  const lista = [...conteudos].sort((a, b) => a.ordem - b.ordem);
  const def = DEFINICAO[tipoNovo];

  async function adicionar() {
    if (!tituloNovo.trim()) {
      avisar("Dê um nome ao conteúdo.");
      return;
    }

    const lido = valorDoTipo(tipoNovo, valorNovo);
    if ("erro" in lido) {
      avisar(lido.erro);
      return;
    }
    const reclamacao = await conferirArquivo(def, valorNovo);
    if (reclamacao) {
      avisar(reclamacao);
      return;
    }

    const falha = await executar(() =>
      dados.criarConteudo({
        produtoId: dono.produtoId,
        moduloId: dono.moduloId ?? null,
        aulaId: dono.aulaId ?? null,
        presenteId: dono.presenteId ?? null,
        tipo: tipoNovo,
        titulo: tituloNovo.trim(),
        ordem: lista.length,
        valor: lido.valor,
      }),
    );
    if (!falha) {
      setTituloNovo("");
      setValorNovo("");
      setAdicionando(false);
    }
    avisar(falha ?? "Conteúdo adicionado.");
  }

  async function gravarOrdem(ids: string[]) {
    const falha = await reordenar(ids, () => dados.ordenarConteudos(ids));
    avisar(falha ?? "Ordem salva.");
  }

  async function mover(id: string, direcao: -1 | 1) {
    const atual = lista.findIndex((k) => k.id === id);
    const destino = atual + direcao;
    if (atual < 0 || destino < 0 || destino >= lista.length) return;
    const ordenada = [...lista];
    const [movido] = ordenada.splice(atual, 1);
    ordenada.splice(destino, 0, movido);
    await gravarOrdem(ordenada.map((k) => k.id));
  }

  const arrasto = useArrastar(
    lista.map((k) => k.id),
    gravarOrdem,
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-[10px]">
        <span className="flex-1 text-[13px]" style={{ color: tema.textoSecundario }}>
          {lista.length === 0
            ? "Nada aqui ainda. O que você escolher é o que a aluna recebe."
            : `${lista.length} ${lista.length === 1 ? "conteúdo" : "conteúdos"}`}
        </span>
        <button
          onClick={() => setAdicionando((v) => !v)}
          style={{ ...botaoNeutro, minHeight: 44, padding: "0 16px", fontSize: 14 }}
        >
          {adicionando ? "Cancelar" : "+ Adicionar conteúdo"}
        </button>
      </div>

      {adicionando ? (
        <div
          className="mb-4 rounded-cartao p-4"
          style={{ background: tema.superficie, border: `1px solid ${tema.linhaSuave}` }}
        >
          <span className="mb-[8px] block" style={rotulo}>
            Tipo
          </span>
          <div className="mb-4 flex flex-wrap gap-[8px]">
            {TIPOS.map((t) => (
              <button
                key={t.tipo}
                onClick={() => {
                  /*
                   * Trocar de tipo limpa o valor: o que servia para um
                   * não serve para o outro, e um caminho de PDF deixado
                   * num campo de vídeo vira `video_ref` inválido.
                   */
                  setTipoNovo(t.tipo);
                  setValorNovo("");
                }}
                aria-pressed={tipoNovo === t.tipo}
                style={{
                  ...botaoNeutro,
                  minHeight: 44,
                  padding: "0 16px",
                  fontSize: 14,
                  fontWeight: tipoNovo === t.tipo ? 600 : 400,
                  background: tipoNovo === t.tipo ? tema.superficieAlta : "transparent",
                }}
              >
                {t.nome}
              </button>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-end gap-[10px]">
            <label
              className="flex min-w-[200px] flex-1 flex-col gap-[6px]"
              style={{ maxWidth: LARGURA_DE_NOME }}
            >
              <span style={rotulo}>Nome do conteúdo</span>
              <input
                value={tituloNovo}
                onChange={(e) => setTituloNovo(e.target.value)}
                style={campo}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-[10px]">
            <CampoDoValor
              def={def}
              valor={valorNovo}
              aoMudar={setValorNovo}
              produtoId={dono.produtoId}
              avisar={avisar}
            />
            <button onClick={adicionar} style={botaoOuro}>
              Adicionar
            </button>
          </div>
        </div>
      ) : null}

      <ol className="m-0 flex list-none flex-col gap-[8px] p-0">
        {lista.map((k, i) => (
          <LinhaConteudo
            key={k.id}
            conteudo={k}
            primeiro={i === 0}
            ultimo={i === lista.length - 1}
            arrasto={arrasto}
            indice={i}
            painel={painel}
            aoMover={mover}
            pedirConfirmacao={pedirConfirmacao}
            avisar={avisar}
          />
        ))}
      </ol>
    </div>
  );
}

function LinhaConteudo({
  conteudo,
  primeiro,
  ultimo,
  arrasto,
  indice,
  painel,
  aoMover,
  pedirConfirmacao,
  avisar,
}: {
  conteudo: Conteudo;
  primeiro: boolean;
  ultimo: boolean;
  arrasto: ReturnType<typeof useArrastar>;
  indice: number;
  painel: Painel;
  aoMover: (id: string, direcao: -1 | 1) => void;
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { executar } = painel;
  const def = DEFINICAO[conteudo.tipo];

  const valorAtual =
    conteudo.tipo === "video"
      ? (conteudo.videoRef ?? "")
      : conteudo.tipo === "texto"
        ? (conteudo.texto ?? "")
        : conteudo.tipo === "link"
          ? (conteudo.url ?? "")
          : (conteudo.arquivoPath ?? "");

  const [titulo, setTitulo] = useState(conteudo.titulo);
  const [valor, setValor] = useState(valorAtual);

  async function salvar() {
    if (!titulo.trim()) {
      avisar("O nome não pode ficar vazio.");
      return;
    }

    const lido = valorDoTipo(conteudo.tipo, valor);
    if ("erro" in lido) {
      avisar(lido.erro);
      return;
    }
    const reclamacao = await conferirArquivo(def, valor);
    if (reclamacao) {
      avisar(reclamacao);
      return;
    }

    const falha = await executar(() =>
      dados.atualizarConteudo(conteudo.id, { titulo: titulo.trim(), ...lido.valor }),
    );
    avisar(falha ?? "Conteúdo salvo.");
  }

  /* Ocultar não apaga: a linha continua no banco, fora da vista da aluna. */
  async function alternarVisibilidade() {
    const falha = await executar(() =>
      dados.atualizarConteudo(conteudo.id, { publicado: !conteudo.publicado }),
    );
    avisar(
      falha ??
        (conteudo.publicado ? "Conteúdo oculto. Nada foi apagado." : "Conteúdo visível."),
    );
  }

  function remover() {
    pedirConfirmacao({
      titulo: `Remover ${conteudo.titulo}?`,
      mensagem:
        "Este conteúdo some do produto e da área da aluna. Para só tirar da " +
        "frente sem perder nada, use Ocultar.",
      executar: async () => {
        const falha = await executar(() => dados.removerConteudo(conteudo.id));
        avisar(falha ?? "Conteúdo removido.");
      },
    });
  }

  return (
    <li
      {...(({ style: _e, ...resto }) => resto)(arrasto.props(indice))}
      className="rounded-cartao p-4"
      style={{
        background: tema.superficie,
        border: `1px solid ${tema.linhaSuave}`,
        ...arrasto.props(indice).style,
      }}
    >
      <div className="flex flex-wrap items-center gap-[10px]">
        <span
          className="flex-none px-[10px] py-[5px] text-[10px] uppercase"
          style={{
            letterSpacing: ".12em",
            color: tema.textoTerciario,
            border: `1px solid ${tema.linha}`,
            borderRadius: 4,
          }}
        >
          {def.nome}
        </span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-label="Nome do conteúdo"
          style={{ ...campo, flex: "1 1 180px", minWidth: 0, maxWidth: LARGURA_DE_NOME }}
        />
        <button
          onClick={() => aoMover(conteudo.id, -1)}
          disabled={primeiro}
          aria-label={`Subir ${conteudo.titulo}`}
          style={{ ...BOTAO_SETA, opacity: primeiro ? 0.4 : 1 }}
        >
          ↑
        </button>
        <button
          onClick={() => aoMover(conteudo.id, 1)}
          disabled={ultimo}
          aria-label={`Descer ${conteudo.titulo}`}
          style={{ ...BOTAO_SETA, opacity: ultimo ? 0.4 : 1 }}
        >
          ↓
        </button>
      </div>

      <div className="mt-3">
        <CampoDoValor
          def={def}
          valor={valor}
          aoMudar={setValor}
          produtoId={conteudo.produtoId}
          avisar={avisar}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-[10px]">
        <button
          onClick={salvar}
          style={{ ...botaoOuro, minHeight: 40, padding: "0 16px", fontSize: 13 }}
        >
          Salvar
        </button>
        <button onClick={alternarVisibilidade} style={{ ...botaoNeutro, minHeight: 40 }}>
          {conteudo.publicado ? "Ocultar" : "Mostrar"}
        </button>
        <button onClick={remover} style={{ ...botaoRemover, minHeight: 40 }}>
          Remover
        </button>
        {conteudo.publicado ? null : (
          <span
            className="flex items-center text-[12px]"
            style={{ color: tema.textoTerciario }}
          >
            Oculta para a aluna
          </span>
        )}
      </div>
    </li>
  );
}
