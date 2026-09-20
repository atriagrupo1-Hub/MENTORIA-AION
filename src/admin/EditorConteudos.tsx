import { useState } from "react";
import type { Conteudo, TipoConteudo } from "@/data/tipos";
import type { PedidoConfirmacao } from "./Confirmacao";
import * as dados from "./dados";
import {
  botaoNeutro,
  botaoOuro,
  botaoRemover,
  campo,
  painel as tema,
  rotulo,
} from "./estilos";
import { marcaDoDestino, useArrastar } from "./arrastar";
import type { Painel } from "./usePainel";
import { idDoVideo, provedorDoLink } from "./video";

/*
 * A mídia — o último degrau.
 *
 *   módulo  ->  conteúdo  ->  MÍDIA
 *
 * Um componente só, montado no módulo e no conteúdo. É o que faz um
 * e-book e uma aula terem a mesma forma: onde a aula tem vídeo, o
 * e-book tem PDF, e a caixa que os cadastra é a mesma.
 *
 * Seis tipos, e não um por palavra do catálogo: "e-book" é um PDF,
 * "material complementar" é um PDF ou um link, "capa" é uma imagem.
 * Cada tipo aceita um valor, e o rótulo do campo muda junto.
 */

const TIPOS: Array<{ tipo: TipoConteudo; nome: string; campo: string; dica: string }> = [
  { tipo: "video", nome: "Vídeo", campo: "Link ou id do vídeo", dica: "Cloudflare Stream, YouTube ou Vimeo" },
  { tipo: "audio", nome: "Áudio", campo: "Arquivo no Storage", dica: "caminho do arquivo enviado" },
  { tipo: "texto", nome: "Texto", campo: "Texto", dica: "aparece na tela da aluna" },
  { tipo: "pdf", nome: "PDF / e-book", campo: "Arquivo no Storage", dica: "caminho do arquivo enviado" },
  { tipo: "link", nome: "Link", campo: "Endereço", dica: "endereço completo, com https://" },
  { tipo: "imagem", nome: "Imagem / capa", campo: "Arquivo no Storage", dica: "caminho do arquivo enviado" },
];

const NOME_DO_TIPO = Object.fromEntries(TIPOS.map((t) => [t.tipo, t.nome])) as Record<
  TipoConteudo,
  string
>;

const BOTAO_SETA: React.CSSProperties = {
  ...botaoNeutro,
  minHeight: 44,
  minWidth: 44,
  padding: 0,
  fontSize: 16,
};

/** Onde a mídia pendura. Os três nulos = direto no produto. */
export type DonoDoConteudo = {
  produtoId: string;
  moduloId?: string | null;
  aulaId?: string | null;
  presenteId?: string | null;
};

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
  const { executar } = painel;
  const [adicionando, setAdicionando] = useState(false);
  const [tipoNovo, setTipoNovo] = useState<TipoConteudo>("video");
  const [tituloNovo, setTituloNovo] = useState("");

  const lista = [...conteudos].sort((a, b) => a.ordem - b.ordem);

  async function adicionar() {
    if (!tituloNovo.trim()) {
      avisar("Dê um nome à mídia.");
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
      }),
    );
    if (!falha) {
      setTituloNovo("");
      setAdicionando(false);
    }
    avisar(falha ?? "Mídia adicionada.");
  }

  async function gravarOrdem(ids: string[]) {
    const falha = await executar(() => dados.ordenarConteudos(ids));
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
            ? "Nenhuma mídia aqui ainda."
            : `${lista.length} ${lista.length === 1 ? "mídia" : "mídias"}`}
        </span>
        <button
          onClick={() => setAdicionando((v) => !v)}
          style={{ ...botaoNeutro, minHeight: 44, padding: "0 16px", fontSize: 14 }}
        >
          {adicionando ? "Cancelar" : "+ Adicionar mídia"}
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
                onClick={() => setTipoNovo(t.tipo)}
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
          <div className="flex flex-wrap items-end gap-[10px]">
            <label className="flex min-w-[200px] flex-1 flex-col gap-[6px]">
              <span style={rotulo}>Nome da mídia</span>
              <input
                value={tituloNovo}
                onChange={(e) => setTituloNovo(e.target.value)}
                style={campo}
              />
            </label>
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
  const definicao = TIPOS.find((t) => t.tipo === conteudo.tipo)!;

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

    const bruto = valor.trim();
    const patch: Parameters<typeof dados.atualizarConteudo>[1] = { titulo: titulo.trim() };

    if (conteudo.tipo === "video") {
      /*
       * Guarda o id, não o link inteiro: é o id que a Edge Function
       * assina, e é o que `video_do_conteudo` devolve. Colar o
       * endereço da barra do navegador tem que funcionar.
       */
      const id = idDoVideo(bruto);
      if (bruto && !id) {
        avisar("Não reconheci esse endereço de vídeo.");
        return;
      }
      patch.video_ref = id || null;
      patch.video_provider = id ? provedorDoLink(bruto) : null;
    } else if (conteudo.tipo === "texto") {
      patch.texto = bruto || null;
    } else if (conteudo.tipo === "link") {
      patch.url = bruto || null;
    } else {
      patch.arquivo_path = bruto || null;
    }

    const falha = await executar(() => dados.atualizarConteudo(conteudo.id, patch));
    avisar(falha ?? "Mídia salva.");
  }

  /* Ocultar não apaga: a linha continua no banco, fora da vista da aluna. */
  async function alternarVisibilidade() {
    const falha = await executar(() =>
      dados.atualizarConteudo(conteudo.id, { publicado: !conteudo.publicado }),
    );
    avisar(
      falha ??
        (conteudo.publicado ? "Mídia oculta. Nada foi apagado." : "Mídia visível."),
    );
  }

  function remover() {
    pedirConfirmacao({
      titulo: `Remover ${conteudo.titulo}?`,
      mensagem:
        "Esta mídia some do produto e da área da aluna. Para só tirar da " +
        "frente sem perder nada, use Ocultar.",
      executar: async () => {
        const falha = await executar(() => dados.removerConteudo(conteudo.id));
        avisar(falha ?? "Mídia removida.");
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
        ...marcaDoDestino(arrasto, indice, "coluna"),
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
          {NOME_DO_TIPO[conteudo.tipo]}
        </span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-label="Nome da mídia"
          style={{ ...campo, flex: "1 1 180px", minWidth: 0 }}
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

      <label className="mt-3 flex flex-col gap-[6px]">
        <span style={rotulo}>
          {definicao.campo} · {definicao.dica}
        </span>
        {conteudo.tipo === "texto" ? (
          <textarea
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            rows={4}
            style={{ ...campo, minHeight: 96, padding: "12px 14px", resize: "vertical" }}
          />
        ) : (
          <input value={valor} onChange={(e) => setValor(e.target.value)} style={campo} />
        )}
      </label>

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

