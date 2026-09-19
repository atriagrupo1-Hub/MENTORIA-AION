import { useEffect, useState } from "react";
import * as api from "@/data/api";
import type { Conteudo } from "@/data/tipos";
import { Player } from "@/components/Player";
import { cores } from "@/design/tokens";

/**
 * Os conteúdos, na tela da aluna.
 *
 * Um componente só para os seis tipos, pelo mesmo motivo que o banco
 * tem uma tabela só: o e-book, a frequência, o documentário e a aula
 * mostram as mesmas peças em combinações diferentes. Quem decide a
 * combinação é quem montou o produto no painel — a tela só desenha o
 * que veio, na ordem que veio.
 *
 * O que NÃO chega aqui já foi barrado antes: a política de leitura de
 * `conteudos` não devolve linha de aula, item ou produto que a aluna
 * não tenha. A tela não confere liberação porque não é ela quem sabe.
 */

export function Conteudos({ itens }: { itens: Conteudo[] }) {
  if (itens.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {itens.map((item) => (
        <Bloco key={item.id} item={item} />
      ))}
    </div>
  );
}

function Bloco({ item }: { item: Conteudo }) {
  if (item.tipo === "texto") return <Texto item={item} />;
  if (item.tipo === "imagem") return <Imagem item={item} />;
  if (item.tipo === "link") return <Link item={item} />;
  if (item.tipo === "video") return <Video item={item} />;
  if (item.tipo === "audio") return <Arquivo item={item} deposito="audios" />;
  return <Arquivo item={item} deposito="materiais" />;
}

function Titulo({ texto }: { texto: string }) {
  if (!texto) return null;
  return (
    <h3 className="text-realce m-0 mb-3 font-titulo font-semibold text-marfim">{texto}</h3>
  );
}

function Texto({ item }: { item: Conteudo }) {
  if (!item.texto) return null;
  return (
    <section>
      <Titulo texto={item.titulo} />
      {/*
        Uma linha do banco por parágrafo na tela. `white-space: pre-line`
        sozinho preservaria a quebra, mas não daria o respiro entre
        parágrafos que um texto longo precisa para ser lido no celular.
      */}
      {item.texto.split(/\n{2,}/).map((paragrafo, i) => (
        <p
          key={i}
          className="text-corpo mb-3 mt-0 leading-[1.6] text-marfim-corpo"
          style={{ whiteSpace: "pre-line" }}
        >
          {paragrafo}
        </p>
      ))}
    </section>
  );
}

function Imagem({ item }: { item: Conteudo }) {
  const endereco = api.urlDaCapa(item.arquivoPath);
  if (!endereco) return null;
  return (
    <section>
      <Titulo texto={item.titulo} />
      <img
        src={endereco}
        alt={item.titulo || "Imagem do conteúdo"}
        className="block w-full rounded-botao"
        style={{ border: `1px solid ${cores.divisoria}` }}
      />
    </section>
  );
}

function Link({ item }: { item: Conteudo }) {
  if (!item.url) return null;
  return (
    <section>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer noopener"
        className="text-corpo flex min-h-[52px] items-center justify-center rounded-pilula px-6 py-4 text-marfim-corpo no-underline"
        style={{ background: cores.vidro, border: `1px solid ${cores.vidroBorda}` }}
      >
        {item.titulo || "Abrir link"} ↗
      </a>
    </section>
  );
}

function Video({ item }: { item: Conteudo }) {
  const [video, setVideo] = useState<api.Video | null>(null);
  const [buscando, setBuscando] = useState(true);

  /*
   * O endereço vem do servidor, nunca do catálogo: `carregarCatalogo`
   * não traz `video_ref` para a aluna, e a Edge Function só assina
   * depois de o banco confirmar a liberação.
   */
  useEffect(() => {
    let valeAinda = true;
    setBuscando(true);
    void api
      .videoDoConteudo(item.id)
      .then((v) => valeAinda && setVideo(v))
      .catch(() => undefined)
      .finally(() => valeAinda && setBuscando(false));
    return () => {
      valeAinda = false;
    };
  }, [item.id]);

  return (
    <section>
      <Titulo texto={item.titulo} />
      {buscando ? (
        <p className="text-corpo m-0 text-terciario">Carregando o vídeo…</p>
      ) : video ? (
        <Player
          identificador={video.ref}
          aoRenovar={async () => {
            const novo = await api.videoDoConteudo(item.id);
            if (!novo) return false;
            setVideo(novo);
            return true;
          }}
        />
      ) : (
        <p className="text-corpo m-0 text-terciario">
          Este vídeo ainda não está disponível.
        </p>
      )}
    </section>
  );
}

function Arquivo({
  item,
  deposito,
}: {
  item: Conteudo;
  deposito: "materiais" | "audios";
}) {
  const [endereco, setEndereco] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(true);

  const caminho = item.arquivoPath;

  useEffect(() => {
    if (!caminho) {
      setBuscando(false);
      return;
    }
    let valeAinda = true;
    setBuscando(true);
    void api
      .enderecoDoArquivo(deposito, caminho)
      .then((e) => valeAinda && setEndereco(e))
      .catch(() => undefined)
      .finally(() => valeAinda && setBuscando(false));
    return () => {
      valeAinda = false;
    };
  }, [caminho, deposito]);

  if (!caminho) return null;

  return (
    <section>
      <Titulo texto={item.titulo} />
      {buscando ? (
        <p className="text-corpo m-0 text-terciario">Carregando…</p>
      ) : !endereco ? (
        <p className="text-corpo m-0 text-terciario">
          Este arquivo ainda não está disponível.
        </p>
      ) : deposito === "audios" ? (
        // Os controles são os do navegador: os mesmos que ela já usa em
        // todo áudio, com leitor de tela e teclado funcionando.
        <audio controls preload="none" src={endereco} className="w-full" />
      ) : (
        <a
          href={endereco}
          target="_blank"
          rel="noreferrer noopener"
          className="text-corpo flex min-h-[52px] items-center justify-center rounded-pilula px-6 py-4 text-marfim-corpo no-underline"
          style={{ background: cores.vidro, border: `1px solid ${cores.vidroBorda}` }}
        >
          Abrir {item.titulo || "o material"} ↗
        </a>
      )}
    </section>
  );
}
