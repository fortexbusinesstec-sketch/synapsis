"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Expert } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase, Building2, UserCircle, Search, MapPin, Award, ChevronDown } from "lucide-react";

const roleConfig: Record<string, { label: string; icon: React.ReactNode; border: string; badge: string; gradient: string }> = {
  tecnico_especialista: {
    label: "Técnico Especialista",
    icon: <Briefcase className="h-5 w-5" />,
    border: "border-l-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    gradient: "from-blue-50 to-transparent",
  },
  comercial: {
    label: "Comercial",
    icon: <Building2 className="h-5 w-5" />,
    border: "border-l-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    gradient: "from-emerald-50 to-transparent",
  },
};

export default function EnterJudgment({ experts }: { experts: Expert[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return experts.filter((e) => {
      const matchesSearch = search.toLowerCase() === "" ||
        e.nombre.toLowerCase().includes(search.toLowerCase()) ||
        e.codigo.toLowerCase().includes(search.toLowerCase()) ||
        (e.empresa && e.empresa.toLowerCase().includes(search.toLowerCase()));
      const matchesRole = !filterRole || e.rolActual === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [experts, search, filterRole]);

  const roles = Object.keys(roleConfig);
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    experts.forEach((e) => { counts[e.rolActual] = (counts[e.rolActual] || 0) + 1; });
    return counts;
  }, [experts]);

  if (experts.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="h-20 w-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
          <UserCircle className="h-10 w-10 text-slate-300" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700">No hay expertos aún</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
          Crea un nuevo experto en la pestaña &quot;Crear Nuevo Experto&quot; para comenzar el proceso de juicio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilterRole(null)}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              !filterRole ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            Todos ({experts.length})
          </button>
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(filterRole === role ? null : role)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                filterRole === role ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {roleConfig[role]?.label.split(" ")[0]} ({roleCounts[role] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((expert) => {
          const config = roleConfig[expert.rolActual];
          const marcas = expert.marcasDomina ? JSON.parse(expert.marcasDomina) as string[] : [];

          return (
            <div
              key={expert.id}
              className={`group relative bg-white rounded-xl border border-slate-200 border-l-4 ${config?.border || "border-l-slate-400"} shadow-sm hover:shadow-md transition-all duration-200`}
            >
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${config?.gradient || ""} opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`} />
              <div className="relative flex items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar */}
                  <div className={`shrink-0 h-12 w-12 rounded-xl flex items-center justify-center border ${
                    config?.badge || "bg-slate-50 text-slate-400 border-slate-200"
                  }`}>
                    {config?.icon || <UserCircle className="h-6 w-6" />}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 truncate">{expert.nombre}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${config?.badge || "bg-slate-100 text-slate-500 border-slate-200"}`}>
                        {config?.label || expert.rolActual}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span className="font-mono text-slate-400">{expert.codigo}</span>
                      {expert.empresa && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {expert.empresa}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Award className="h-3 w-3" /> {expert.anosExperiencia} años
                      </span>
                      {expert.zonaTrabajo && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {expert.zonaTrabajo}
                        </span>
                      )}
                    </div>
                    {marcas.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {marcas.slice(0, 3).map((m: string) => (
                          <span key={m} className="text-[10px] font-medium text-slate-500 bg-slate-100 rounded-md px-1.5 py-0.5">{m}</span>
                        ))}
                        {marcas.length > 3 && (
                          <span className="text-[10px] text-slate-400">+{marcas.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Enter button */}
                <Button
                  onClick={() => router.push(`/dashboard/juicio/fases?expertoId=${expert.codigo}`)}
                  className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-all hover:gap-3 active:scale-[0.97]"
                >
                  Entrar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">No se encontraron expertos con los filtros actuales.</p>
          </div>
        )}
      </div>
    </div>
  );
}
