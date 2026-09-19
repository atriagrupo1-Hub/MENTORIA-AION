import { Navigate, Route, Routes } from "react-router-dom";
import { Moldura } from "@/components/Moldura";
import { AulaAoVivo } from "@/screens/AulaAoVivo";
import { Inicio } from "@/screens/Inicio";
import { Login } from "@/screens/Login";
import { Modulos } from "@/screens/Modulos";
import { PaginaModulo } from "@/screens/PaginaModulo";
import { PaginaPresente } from "@/screens/PaginaPresente";
import { Perfil } from "@/screens/Perfil";
import { Presentes } from "@/screens/Presentes";
import { TelaAula } from "@/screens/TelaAula";

/**
 * As rotas da área da aluna.
 *
 * Elas são escritas a partir da raiz — `/inicio`, `/modulo/3` — e o
 * prefixo real (`/appmentoria`) é posto pelo `basename` em `main.tsx`.
 * É por isso que trocar o caminho do aplicativo não encosta neste
 * arquivo nem nas telas.
 *
 * O painel não está mais aqui. Ele é uma porta separada, em
 * `/admappmentoria`, montada fora deste roteador — o endereço de quem
 * administra não se descobre a partir do endereço de quem estuda.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<Moldura />}>
        <Route path="/inicio" element={<Inicio />} />
        <Route path="/modulos" element={<Modulos />} />
        <Route path="/modulo/:mi" element={<PaginaModulo />} />
        <Route path="/aula/:mi/:li" element={<TelaAula />} />
        <Route path="/ao-vivo/:mi" element={<AulaAoVivo />} />
        <Route path="/presentes" element={<Presentes />} />
        <Route path="/presente/:id" element={<PaginaPresente />} />
        <Route path="/perfil" element={<Perfil />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
