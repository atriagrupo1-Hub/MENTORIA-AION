import { useState, type FormEvent } from "react";
import { useEstado } from "@/data/estado";
import type { Aula, Catalogo, Modulo } from "@/data/tipos";
import { cores } from "@/design/tokens";
import type { PedidoConfirmacao } from "./Confirmacao";
import { aba, botaoNeutro, botaoOuro, botaoRemover, campo } from "./estilos";

const BOTAO_LINHA: React.CSSProperties = {
  minHeight: 32,
  padding: "0 11px",
  fontSize: 12,
  color: "rgba(243,236,225,.75)",
  background: "none",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 99,
  cursor: "pointer",
};

/** Subaba Mentoria: módulos, aulas e o conteúdo anexado a cada aula. */
export function AbaConteudo({
  pedirConfirmacao,
  avisar,
}: {
  pedirConfirmacao: (p: PedidoConfirmacao) => void;
  avisar: (m: string) => void;
}) {
  const { catalogo, atualizarCatalogo } = useEstado();
  const [expandido, setExpandido] = useState(true);
  const [novoModulo, setNovoModulo] = useState("");
  const [novaAulaEm, setNovaAulaEm] = useState("");
  const [novaAula, setNovaAula] = useState("");
  const [editando, setEditando] = useState("");
  const [textoEdicao, setTextoEdicao] = useState("");
  const [conteudoDe, setConteudoDe] = useState("");
  const [video, setVideo] = useState("");
  const [capa, setCapa] = useState("");
  const [material, setMaterial] = useState("");

  const totalAulas = catalogo.modulos.reduce((s, m) => s + m.aulas.length, 0);

  function gravar(proximo: Catalogo) {
    atualizarCatalogo(proximo);
  }

  function trocarModulos(modulos: Modulo[]) {
    gravar({ ...catalogo, modulos });
  }

  function mapearModulo(moduloId: string, fn: (m: Modulo) => Modulo) {
    trocarModulos(catalogo.modulos.map((m) => (m.id === moduloId ? fn(m) : m)));
  }

  function renumerar(aulas: Aula[]): Aula[] {
    return aulas.map((a, i) => ({ ...a, numero: i + 1, ordem: i }));
  }

  function adicionarModulo(e: FormEvent) {
    e.preventDefault();
    if (!novoModulo.trim()) {
      avisar("Informe o nome do módulo.");
      return;
    }
    const numero = catalogo.modulos.length
      ? Math.max(...catalogo.modulos.map((m) => m.numero)) + 1
      : 0;
    trocarModulos([
      ...catalogo.modulos,
      {
        id: `modulo-${numero}-${Date.now()}`,
        numero,
        titulo: novoModulo.trim().toUpperCase(),
        intro: "",
        ordem: catalogo.modulos.length,
        bloqueadoGeral: false,
        aulas: [],
      },
    ]);
    setNovoModulo("");
    avisar("Módulo criado.");
  }

  return (
    <section
      className="rounded-cartao-lg p-4"
      style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.1)" }}
    >
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-[3px]">
          <span className="text-[11px] uppercase tracking-[.24em] text-[#a58a52]">
            Mentoria
          </span>
          <span className="font-titulo text-[22px] text-marfim">Caminho do Desbloqueio</span>
        </span>
        <span className="text-[13px] text-[rgba(243,236,225,.55)]">
          {catalogo.modulos.length} módulos · {totalAulas} aulas
        </span>
        <button
          onClick={() => setExpandido((v) => !v)}
          style={{ ...botaoNeutro, minHeight: 40, padding: "0 16px" }}
        >
          {expandido ? "Recolher" : "Expandir"}
        </button>
      </div>

      {!expandido ? null : (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <form
            onSubmit={adicionarModulo}
            className="mb-[22px] flex flex-wrap gap-[10px] rounded-[14px] p-4"
            style={{
              background: "rgba(255,255,255,.03)",
              border: "1px solid rgba(255,255,255,.1)",
            }}
          >
            <input
              type="text"
              value={novoModulo}
              onChange={(e) => setNovoModulo(e.target.value)}
              placeholder="Nome do novo módulo"
              aria-label="Nome do novo módulo"
              style={{ ...campo, flex: "2 1 260px" }}
            />
            <button type="submit" style={{ ...botaoOuro, flex: "0 0 auto" }}>
              Adicionar módulo
            </button>
          </form>

          <div className="flex flex-col gap-3">
            {catalogo.modulos.map((modulo) => (
              <div
                key={modulo.id}
                className="rounded-cartao p-4"
                style={{
                  background: "rgba(255,255,255,.03)",
                  border: `1px solid ${
                    modulo.bloqueadoGeral ? "rgba(230,168,154,.28)" : "rgba(255,255,255,.1)"
                  }`,
                }}
              >
                <div className="flex flex-wrap items-center gap-[10px]">
                  <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-[3px]">
                    <span className="text-[15px] font-bold text-white">
                      Módulo {modulo.numero} — {modulo.titulo}
                    </span>
                    <span className="text-[12px] text-[rgba(243,236,225,.5)]">
                      {modulo.aulas.length === 1 ? "1 aula" : `${modulo.aulas.length} aulas`}
                    </span>
                  </span>
                  <span
                    className="flex-none rounded-pilula px-[11px] py-[5px] text-[11px] uppercase tracking-[.1em]"
                    style={{
                      color: modulo.bloqueadoGeral ? cores.alerta : cores.concluido,
                      border: `1px solid ${
                        modulo.bloqueadoGeral ? cores.alerta : cores.concluido
                      }`,
                    }}
                  >
                    {modulo.bloqueadoGeral ? "Bloqueado para todas" : "Ativo"}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const chave = `m:${modulo.id}`;
                        setEditando(editando === chave ? "" : chave);
                        setTextoEdicao(modulo.titulo);
                      }}
                      style={{ ...botaoNeutro, minHeight: 36, padding: "0 13px" }}
                    >
                      {editando === `m:${modulo.id}` ? "Cancelar edição" : "Editar nome"}
                    </button>
                    <button
                      onClick={() => {
                        setNovaAulaEm(novaAulaEm === modulo.id ? "" : modulo.id);
                        setNovaAula("");
                      }}
                      style={{ ...botaoNeutro, minHeight: 36, padding: "0 13px" }}
                    >
                      {novaAulaEm === modulo.id ? "Fechar" : "Adicionar aula"}
                    </button>
                    <button
                      onClick={() =>
                        mapearModulo(modulo.id, (m) => ({
                          ...m,
                          bloqueadoGeral: !m.bloqueadoGeral,
                        }))
                      }
                      style={{ ...botaoNeutro, minHeight: 36, padding: "0 13px" }}
                    >
                      {modulo.bloqueadoGeral ? "Desbloquear módulo" : "Bloquear para todas"}
                    </button>
                    <button
                      onClick={() =>
                        pedirConfirmacao({
                          titulo: `Remover o Módulo ${modulo.numero}?`,
                          mensagem: `As ${modulo.aulas.length} aulas dele saem do curso para todas as alunas.`,
                          executar: () => {
                            trocarModulos(
                              catalogo.modulos.filter((m) => m.id !== modulo.id),
                            );
                            avisar("Módulo removido.");
                          },
                        })
                      }
                      style={{ ...botaoRemover, minHeight: 36, padding: "0 13px" }}
                    >
                      Remover módulo
                    </button>
                  </span>
                </div>

                {editando === `m:${modulo.id}` ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!textoEdicao.trim()) {
                        avisar("Informe o nome do módulo.");
                        return;
                      }
                      mapearModulo(modulo.id, (m) => ({
                        ...m,
                        titulo: textoEdicao.trim().toUpperCase(),
                      }));
                      setEditando("");
                      avisar("Nome do módulo atualizado.");
                    }}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input
                      type="text"
                      value={textoEdicao}
                      onChange={(e) => setTextoEdicao(e.target.value)}
                      aria-label="Nome do módulo"
                      style={{ ...campo, flex: "2 1 240px", minHeight: 44, fontSize: 14 }}
                    />
                    <button
                      type="submit"
                      style={{ ...botaoOuro, minHeight: 44, padding: "0 20px", fontSize: 14 }}
                    >
                      Salvar nome
                    </button>
                  </form>
                ) : null}

                {novaAulaEm === modulo.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!novaAula.trim()) {
                        avisar("Informe o nome da aula.");
                        return;
                      }
                      mapearModulo(modulo.id, (m) => ({
                        ...m,
                        aulas: renumerar([
                          ...m.aulas,
                          {
                            id: `aula-${m.numero}-${Date.now()}`,
                            moduloId: m.id,
                            numero: m.aulas.length + 1,
                            titulo: novaAula.trim(),
                            ordem: m.aulas.length,
                            duracaoSegundos: null,
                            videoProvider: null,
                            videoRef: null,
                            materialPath: null,
                            capaPath: null,
                            bloqueadoGeral: false,
                          },
                        ]),
                      }));
                      setNovaAula("");
                      avisar("Aula adicionada.");
                    }}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input
                      type="text"
                      value={novaAula}
                      onChange={(e) => setNovaAula(e.target.value)}
                      placeholder="Nome da nova aula"
                      aria-label="Nome da nova aula"
                      style={{ ...campo, flex: "2 1 240px", minHeight: 44, fontSize: 14 }}
                    />
                    <button
                      type="submit"
                      style={{ ...botaoOuro, minHeight: 44, padding: "0 20px", fontSize: 14 }}
                    >
                      Salvar aula
                    </button>
                  </form>
                ) : null}

                <div className="mt-[10px] flex flex-col">
                  {modulo.aulas.map((aula) => {
                    const anexos = [
                      aula.videoRef ? "vídeo" : null,
                      aula.capaPath ? "capa" : null,
                      aula.materialPath ? "material" : null,
                    ].filter(Boolean);

                    function mover(passo: number) {
                      const destino = aula.ordem + passo;
                      if (destino < 0 || destino >= modulo.aulas.length) {
                        avisar(
                          passo < 0
                            ? "Esta já é a primeira aula."
                            : "Esta já é a última aula.",
                        );
                        return;
                      }
                      const lista = [...modulo.aulas];
                      [lista[aula.ordem], lista[destino]] = [lista[destino], lista[aula.ordem]];
                      mapearModulo(modulo.id, (m) => ({ ...m, aulas: renumerar(lista) }));
                    }

                    return (
                      <div key={aula.id}>
                        <div
                          className="flex flex-wrap items-center gap-[10px] py-[9px]"
                          style={{ borderBottom: "1px solid rgba(255,255,255,.07)" }}
                        >
                          <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-[2px]">
                            <span
                              className="text-[13px]"
                              style={{
                                color: aula.bloqueadoGeral
                                  ? "rgba(243,236,225,.45)"
                                  : "#ffffff",
                              }}
                            >
                              Aula {aula.numero} — {aula.titulo}
                            </span>
                            <span className="text-[11px] text-[rgba(243,236,225,.4)]">
                              {anexos.length ? anexos.join(" · ") : "sem conteúdo anexado"}
                            </span>
                          </span>

                          <button
                            onClick={() => mover(-1)}
                            aria-label="Mover para cima"
                            className="grid h-8 w-8 place-items-center rounded-full bg-transparent text-[14px]"
                            style={{
                              color: "rgba(243,236,225,.7)",
                              border: "1px solid rgba(255,255,255,.14)",
                              cursor: "pointer",
                            }}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => mover(1)}
                            aria-label="Mover para baixo"
                            className="grid h-8 w-8 place-items-center rounded-full bg-transparent text-[14px]"
                            style={{
                              color: "rgba(243,236,225,.7)",
                              border: "1px solid rgba(255,255,255,.14)",
                              cursor: "pointer",
                            }}
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => {
                              const aberto = conteudoDe === aula.id;
                              setConteudoDe(aberto ? "" : aula.id);
                              setVideo(aula.videoRef ?? "");
                              setCapa(aula.capaPath ?? "");
                              setMaterial(aula.materialPath ?? "");
                            }}
                            style={{
                              ...BOTAO_LINHA,
                              color: cores.ouroMedio,
                              border: "1px solid rgba(212,177,112,.4)",
                            }}
                          >
                            {conteudoDe === aula.id ? "Fechar conteúdo" : "Conteúdo"}
                          </button>
                          <button
                            onClick={() => {
                              const chave = `a:${aula.id}`;
                              setEditando(editando === chave ? "" : chave);
                              setTextoEdicao(aula.titulo);
                            }}
                            style={BOTAO_LINHA}
                          >
                            {editando === `a:${aula.id}` ? "Cancelar" : "Editar"}
                          </button>
                          <button
                            onClick={() =>
                              mapearModulo(modulo.id, (m) => ({
                                ...m,
                                aulas: m.aulas.map((x) =>
                                  x.id === aula.id
                                    ? { ...x, bloqueadoGeral: !x.bloqueadoGeral }
                                    : x,
                                ),
                              }))
                            }
                            style={BOTAO_LINHA}
                          >
                            {aula.bloqueadoGeral ? "Desbloquear" : "Bloquear"}
                          </button>
                          <button
                            onClick={() =>
                              pedirConfirmacao({
                                titulo: `Remover a Aula ${aula.numero}?`,
                                mensagem: `"${aula.titulo}" sai do curso para todas as alunas.`,
                                executar: () => {
                                  mapearModulo(modulo.id, (m) => ({
                                    ...m,
                                    aulas: renumerar(
                                      m.aulas.filter((x) => x.id !== aula.id),
                                    ),
                                  }));
                                  avisar("Aula removida.");
                                },
                              })
                            }
                            style={{
                              ...BOTAO_LINHA,
                              color: cores.alerta,
                              border: "1px solid rgba(230,168,154,.28)",
                            }}
                          >
                            Remover
                          </button>
                        </div>

                        {conteudoDe === aula.id ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              mapearModulo(modulo.id, (m) => ({
                                ...m,
                                aulas: m.aulas.map((x) =>
                                  x.id === aula.id
                                    ? {
                                        ...x,
                                        videoRef: idDoVideo(video) || null,
                                        videoProvider: idDoVideo(video) ? "youtube" : null,
                                        capaPath: capa.trim() || null,
                                        materialPath: material.trim() || null,
                                      }
                                    : x,
                                ),
                              }));
                              setConteudoDe("");
                              avisar("Conteúdo da aula salvo.");
                            }}
                            className="flex flex-col gap-2 pb-[14px] pt-[6px]"
                          >
                            {[
                              {
                                rotulo: "Link do vídeo (YouTube)",
                                valor: video,
                                mudar: setVideo,
                                dica: "https://www.youtube.com/watch?v=...",
                              },
                              {
                                rotulo: "Capa da aula (arquivo 16:9)",
                                valor: capa,
                                mudar: setCapa,
                                dica: `/assets/capas/modulo-${modulo.numero}-aula-${aula.numero}.png`,
                              },
                              {
                                rotulo: "Material da aula (PDF)",
                                valor: material,
                                mudar: setMaterial,
                                dica: `/assets/materiais/modulo-${modulo.numero}-aula-${aula.numero}.pdf`,
                              },
                            ].map((linha) => (
                              <label key={linha.rotulo} className="flex flex-col gap-2">
                                <span className="text-[11px] uppercase tracking-[.1em] text-[rgba(243,236,225,.6)]">
                                  {linha.rotulo}
                                </span>
                                <input
                                  type="text"
                                  value={linha.valor}
                                  onChange={(e) => linha.mudar(e.target.value)}
                                  placeholder={linha.dica}
                                  style={{ ...campo, minHeight: 42, fontSize: 13 }}
                                />
                              </label>
                            ))}
                            <div className="mt-[2px] flex flex-wrap gap-2">
                              <button
                                type="submit"
                                style={{
                                  ...botaoOuro,
                                  minHeight: 42,
                                  padding: "0 18px",
                                  fontSize: 13,
                                }}
                              >
                                Salvar conteúdo
                              </button>
                              <button
                                type="button"
                                onClick={() => setConteudoDe("")}
                                style={{ ...botaoNeutro, minHeight: 42, padding: "0 16px" }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        ) : null}

                        {editando === `a:${aula.id}` ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!textoEdicao.trim()) {
                                avisar("Informe o nome da aula.");
                                return;
                              }
                              mapearModulo(modulo.id, (m) => ({
                                ...m,
                                aulas: m.aulas.map((x) =>
                                  x.id === aula.id ? { ...x, titulo: textoEdicao.trim() } : x,
                                ),
                              }));
                              setEditando("");
                              avisar("Nome da aula atualizado.");
                            }}
                            className="flex flex-wrap gap-2 pb-3 pt-1"
                          >
                            <input
                              type="text"
                              value={textoEdicao}
                              onChange={(e) => setTextoEdicao(e.target.value)}
                              aria-label="Nome da aula"
                              style={{ ...campo, flex: "2 1 220px", minHeight: 42, fontSize: 14 }}
                            />
                            <button
                              type="submit"
                              style={{
                                ...botaoOuro,
                                minHeight: 42,
                                padding: "0 18px",
                                fontSize: 13,
                              }}
                            >
                              Salvar
                            </button>
                          </form>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** Extrai o id do vídeo de um link do YouTube, como no protótipo. */
export function idDoVideo(entrada: string): string {
  const s = String(entrada).trim();
  if (!s) return "";
  const comQuery = s.match(/[?&]v=([\w-]{6,})/);
  if (comQuery) return comQuery[1];
  const curto = s.match(/youtu\.be\/([\w-]{6,})/) ?? s.match(/embed\/([\w-]{6,})/);
  if (curto) return curto[1];
  if (/^[\w-]{6,}$/.test(s)) return s;
  return "";
}

export { aba };
