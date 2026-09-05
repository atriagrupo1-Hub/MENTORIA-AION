import { Navigate, Route, Routes } from "react-router-dom";
import { Moldura } from "@/components/Moldura";
import { PainelAdmin } from "@/admin/PainelAdmin";
import { AulaAoVivo } from "@/screens/AulaAoVivo";
import { Inicio } from "@/screens/Inicio";
import { Login } from "@/screens/Login";
import { Modulos } from "@/screens/Modulos";
import { PaginaModulo } from "@/screens/PaginaModulo";
import { PaginaPresente } from "@/screens/PaginaPresente";
import { Perfil } from "@/screens/Perfil";
import { Presentes } from "@/screens/Presentes";
import { TelaAula } from "@/screens/TelaAula";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<PainelAdmin />} />

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
