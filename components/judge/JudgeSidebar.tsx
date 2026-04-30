"use client";

import { useState, useEffect } from "react";
import { 
    User, 
    Plus, 
    Building2, 
    History, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    ChevronRight,
    Loader2,
    Settings,
    Users,
    ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface JudgeSidebarProps {
  onCaseSelect: (caseId: string | null) => void;
  selectedCaseId: string | null;
  refreshTrigger: number;
  onRefresh: () => void;
}

export function JudgeSidebar({ onCaseSelect, selectedCaseId, refreshTrigger, onRefresh }: JudgeSidebarProps) {
  const [profile, setProfile] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [existingProfiles, setExistingProfiles] = useState<any[]>([]);

  // Profile Form State
  const [pForm, setPForm] = useState({
    fullName: "",
    company: "",
    yearsExperience: "",
    modelsWorked: [] as string[],
    primaryRole: "tecnico_campo",
    phone: ""
  });

  // Case Form State
  const [cForm, setCForm] = useState({
    title: "",
    equipmentModel: "3300",
    caseDescription: "",
    realExperience: "",
    actualOutcome: ""
  });

  useEffect(() => {
    const profileId = localStorage.getItem("judge_profile_id");
    if (profileId) {
      fetchProfileAndCases(profileId);
    } else {
      fetchExistingProfiles();
    }
  }, [refreshTrigger]);

  const fetchExistingProfiles = async () => {
      setLoading(true);
      try {
          const res = await fetch("/api/judge/profile");
          if (res.ok) {
              const data = await res.json();
              setExistingProfiles(data);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const fetchProfileAndCases = async (profileId: string) => {
    try {
      const res = await fetch(`/api/judge/cases?judgeProfileId=${profileId}`);
      if (res.ok) {
        const data = await res.json();
        setCases(data);
        const active = data.find((c: any) => c.status === 'in_progress');
        if (active && !selectedCaseId) {
            onCaseSelect(active.id);
            if (active.sessionId) localStorage.setItem("judge_session_id", active.sessionId);
        }
      }
      setProfile({ id: profileId, fullName: localStorage.getItem("judge_name") || "Juez" });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = (p: any) => {
      localStorage.setItem("judge_profile_id", p.id);
      localStorage.setItem("judge_name", p.fullName);
      setProfile(p);
      setShowProfileForm(false);
      fetchProfileAndCases(p.id);
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/judge/profile", {
        method: "POST",
        body: JSON.stringify(pForm)
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("judge_profile_id", data.id);
        localStorage.setItem("judge_name", data.fullName);
        setProfile(data);
        setShowProfileForm(false);
        fetchProfileAndCases(data.id);
      }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/judge/cases", {
        method: "POST",
        body: JSON.stringify({
            ...cForm,
            judgeProfileId: profile.id,
            caseNumber: cases.length + 1
        })
      });
      if (res.ok) {
        const data = await res.json();
        setShowCaseForm(false);
        fetchProfileAndCases(profile.id);
        onCaseSelect(data.id);
      }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleCancelSession = async (caseId: string) => {
      setLoading(true);
      try {
          const res = await fetch(`/api/judge/cases/${caseId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: 'draft' })
          });
          if (res.ok) {
              localStorage.removeItem("judge_session_id");
              onRefresh();
              fetchProfileAndCases(profile.id);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleStartSession = async (caseId: string, model: string) => {
      setLoading(true);
      try {
          const res = await fetch("/api/judge/sessions", {
              method: "POST",
              body: JSON.stringify({
                  judgeProfileId: profile.id,
                  judgeCaseId: caseId,
                  equipmentModel: model
              })
          });
          if (res.ok) {
              const data = await res.json();
              localStorage.setItem("judge_session_id", data.id);
              onRefresh();
              fetchProfileAndCases(profile.id);
              onCaseSelect(caseId);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  if (loading && !profile && existingProfiles.length === 0 && !showProfileForm) {
    return (
      <div className="w-96 border-r border-slate-200 h-full flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // 1. Profile Selection/Creation View
  if (!profile) {
    return (
      <div className="w-96 border-r border-slate-200 h-full flex flex-col bg-white overflow-hidden">
        {showProfileForm ? (
            <div className="p-8 space-y-6 overflow-y-auto scrollbar-hidden">
                <button onClick={() => setShowProfileForm(false)} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors mb-4">
                    <ArrowLeft className="w-3 h-3" />
                    Volver a selección
                </button>
                <div className="space-y-2">
                    <h2 className="text-xl font-black text-slate-900">Nuevo Perfil</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Registra tus datos como experto</p>
                </div>
                <form onSubmit={handleCreateProfile} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                        <input required value={pForm.fullName} onChange={e => setPForm({...pForm, fullName: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="Ej: Fabrizio Díaz" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Empresa</label>
                        <input value={pForm.company} onChange={e => setPForm({...pForm, company: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="Ej: Ascensores del Perú SAC" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Años Exp.</label>
                            <input type="number" required value={pForm.yearsExperience} onChange={e => setPForm({...pForm, yearsExperience: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="8" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol</label>
                            <select value={pForm.primaryRole} onChange={e => setPForm({...pForm, primaryRole: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:border-blue-500 transition-all appearance-none">
                                <option value="tecnico_campo">Técnico Campo</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="jefe_taller">Jefe de Taller</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelos Dominados</label>
                        <div className="flex gap-2">
                            {["3300", "5500", "6200"].map(m => (
                                <button key={m} type="button" onClick={() => {
                                    const newModels = pForm.modelsWorked.includes(m) 
                                        ? pForm.modelsWorked.filter(x => x !== m)
                                        : [...pForm.modelsWorked, m];
                                    setPForm({...pForm, modelsWorked: newModels});
                                }} className={cn("px-3 py-2 rounded-xl text-[10px] font-black border transition-all", pForm.modelsWorked.includes(m) ? "bg-blue-600 border-blue-600 text-white shadow-lg" : "bg-white border-slate-200 text-slate-400")}>
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                        <input required value={pForm.phone} onChange={e => setPForm({...pForm, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="+51 999..." />
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-zinc-900/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                        Crear Perfil de Juez
                    </button>
                </form>
            </div>
        ) : (
            <div className="p-8 space-y-8 flex flex-col h-full">
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">Experimento<br/><span className="text-blue-600">Juez Synapsis</span></h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecciona un perfil para continuar</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hidden">
                    {existingProfiles.map(p => (
                        <button key={p.id} onClick={() => handleSelectProfile(p)} className="w-full p-5 rounded-[2rem] border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all text-left flex items-center gap-4 group">
                            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                                <User className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-slate-900 truncate">{p.fullName}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{p.company || 'Independiente'}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                        </button>
                    ))}

                    {existingProfiles.length === 0 && !loading && (
                        <div className="py-10 text-center space-y-3 opacity-50">
                            <Users className="w-10 h-10 text-slate-300 mx-auto" />
                            <p className="text-xs font-bold text-slate-400">No hay jueces registrados aún</p>
                        </div>
                    )}
                </div>

                <button onClick={() => setShowProfileForm(true)} className="w-full py-5 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest mt-auto">
                    <Plus className="w-5 h-5" />
                    Registrar Nuevo Juez
                </button>
            </div>
        )}
      </div>
    );
  }

  // 2. Main Sidebar View
  const activeCase = cases.find(c => c.id === selectedCaseId);
  const canCreateNew = cases.length < 5 && !cases.some(c => c.status === 'in_progress');

  return (
    <div className="w-96 border-r border-slate-200 h-full flex flex-col bg-slate-50/50 overflow-hidden">
      {/* Profile Header */}
      <div className="p-6 bg-white border-b border-slate-100 flex items-center gap-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 text-white">
              <User className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-slate-900 truncate">{profile?.fullName}</h3>
              <button onClick={() => { localStorage.removeItem("judge_profile_id"); setProfile(null); setShowProfileForm(false); fetchExistingProfiles(); }} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700">Cambiar Juez</button>
          </div>
          <Settings className="w-5 h-5 text-slate-300" />
      </div>

      {/* Cases List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between px-2 mb-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tus Casos ({cases.length}/5)</h4>
              {canCreateNew && (
                  <button onClick={() => setShowCaseForm(true)} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                      <Plus className="w-4 h-4" />
                  </button>
              )}
          </div>

          {cases.length === 0 && !showCaseForm && (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-3xl space-y-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                      <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Sin casos creados</p>
                      <button onClick={() => setShowCaseForm(true)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Crear mi primer caso</button>
                  </div>
              </div>
          )}

          {cases.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => { 
                    onCaseSelect(c.id); 
                    setShowCaseForm(false); 
                    if (c.sessionId) {
                        localStorage.setItem("judge_session_id", c.sessionId);
                    } else {
                        localStorage.removeItem("judge_session_id");
                    }
                }}
                className={cn(
                    "w-full p-4 rounded-[2rem] border transition-all text-left flex items-center gap-4 group",
                    selectedCaseId === c.id 
                        ? "bg-white border-blue-500 shadow-xl shadow-blue-500/10" 
                        : "bg-white/50 border-slate-100 hover:border-blue-200 hover:bg-white"
                )}
              >
                  <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border",
                      c.status === 'completed' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                      c.status === 'in_progress' ? "bg-blue-50 border-blue-100 text-blue-600" :
                      "bg-slate-50 border-slate-100 text-slate-400"
                  )}>
                      #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-black truncate", selectedCaseId === c.id ? "text-slate-900" : "text-slate-500")}>{c.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                          <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              c.status === 'completed' ? "bg-emerald-500" :
                              c.status === 'in_progress' ? "bg-blue-500 animate-pulse" :
                              "bg-slate-300"
                          )} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                              {c.status === 'completed' ? 'Completado' : c.status === 'in_progress' ? 'En Progreso' : 'Borrador'}
                          </span>
                      </div>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 transition-transform", selectedCaseId === c.id ? "text-blue-500 translate-x-1" : "text-slate-300")} />
              </button>
          ))}
      </div>

      {/* Case Definition / Details Panel */}
      <div className="p-6 bg-white border-t border-slate-200 flex-shrink-0 min-h-[300px]">
          {showCaseForm ? (
              <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Definir Nuevo Caso</h4>
                      <button onClick={() => setShowCaseForm(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancelar</button>
                  </div>
                  <input value={cForm.title} onChange={e => setCForm({...cForm, title: e.target.value})} className="w-full px-4 py-2 text-xs font-bold bg-slate-50 border border-slate-100 rounded-xl text-slate-900" placeholder="Título del caso" />
                  <select value={cForm.equipmentModel} onChange={e => setCForm({...cForm, equipmentModel: e.target.value})} className="w-full px-4 py-2 text-xs font-bold bg-slate-50 border border-slate-100 rounded-xl appearance-none text-slate-900">
                      <option value="3300">Schindler 3300</option>
                      <option value="5500">Schindler 5500</option>
                      <option value="6200">Schindler 6200</option>
                  </select>
                  <textarea value={cForm.caseDescription} onChange={e => setCForm({...cForm, caseDescription: e.target.value})} className="w-full px-4 py-2 text-xs font-medium bg-slate-50 border border-slate-100 rounded-xl h-20 resize-none text-slate-900" placeholder="¿En qué consiste este caso?" />
                  <button onClick={handleCreateCase} disabled={!cForm.title || !cForm.caseDescription} className="w-full py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Crear y Seleccionar</button>
              </div>
          ) : activeCase ? (
              <div className="space-y-4 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Detalle del Caso</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase">Modelo {activeCase.equipmentModel}</span>
                  </div>
                  <div className="space-y-3">
                      <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Situación</p>
                          <p className="text-xs font-bold text-slate-700 leading-relaxed mt-0.5">{activeCase.caseDescription}</p>
                      </div>
                      {activeCase.status === 'in_progress' ? (
                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-3">
                              <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-blue-600" />
                                  <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Chat Activo</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-blue-800">Mensajes</span>
                                  <span className="text-lg font-black text-blue-900">{activeCase.messagesUsed}/10</span>
                              </div>
                              <div className="w-full h-1.5 bg-blue-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${(activeCase.messagesUsed/10)*100}%` }} />
                              </div>
                              <button 
                                onClick={() => handleCancelSession(activeCase.id)}
                                className="w-full py-2 text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 flex items-center justify-center gap-2"
                              >
                                <ArrowLeft className="w-3 h-3" />
                                Cancelar y Volver a Borrador
                              </button>
                          </div>
                      ) : activeCase.status === 'completed' ? (
                          <div className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Caso Evaluado</span>
                          </div>
                      ) : (
                          <button onClick={() => handleStartSession(activeCase.id, activeCase.equipmentModel)} className="w-full py-4 rounded-2xl bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-zinc-900/20 active:scale-95 transition-all">Iniciar Sesión de Chat</button>
                      )}
                  </div>
              </div>
          ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-10 opacity-50">
                  <Plus className="w-8 h-8 text-slate-300" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecciona un caso para ver los detalles</p>
              </div>
          )}
      </div>
    </div>
  );
}
