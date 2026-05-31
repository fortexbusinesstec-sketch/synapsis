"use client";

import { useState, useRef, useEffect } from 'react';
import { useFormStatus, useFormState } from 'react-dom';
import { createExpertAction } from '@/app/dashboard/juicio/perfil/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { toast } from 'sonner';
import { Loader2, ChevronRight, User, Briefcase, Phone, CheckCircle2, AlertCircle } from 'lucide-react';
import { Expert } from '@/lib/db/schema';

const inputBase = "w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-white dark:text-slate-900 dark:border-slate-200";

interface FieldErrors {
  nombre?: string;
  anosExperiencia?: string;
  rolActual?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      aria-disabled={pending}
      disabled={pending}
      className="group relative inline-flex items-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm md:text-base shadow-2xl shadow-blue-600/20 hover:bg-blue-700 hover:scale-105 transition-all duration-200 active:scale-95 w-full sm:w-auto justify-center"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          Guardar y Continuar <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
        </span>
      )}
    </Button>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <span className="text-blue-600">{icon}</span>
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-6 space-y-5">
        {children}
      </div>
    </div>
  );
}

function FieldGroup({ label, required, error, children, htmlFor }: { label: string; required?: boolean; error?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500 text-base leading-none">*</span>}
      </Label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600 mt-1 animate-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export default function ExpertProfileForm({
  suggestedCodigo,
  allExperts,
}: { suggestedCodigo: string; allExperts: Expert[] }) {
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>('new');
  const [state, formAction] = useFormState(createExpertAction, null);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [rolActual, setRolActual] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const marcasHiddenRef = useRef<HTMLInputElement>(null);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [nombreVal, setNombreVal] = useState("");
  const [expVal, setExpVal] = useState("");

  const requiredFilled = [nombreVal.trim(), rolActual, expVal && parseInt(expVal) >= 3 ? expVal : ''].filter(Boolean).length;
  const requiredTotal = 3;

  useEffect(() => {
    if (marcasHiddenRef.current) {
      marcasHiddenRef.current.value = JSON.stringify(marcas);
    }
  }, [marcas]);

  useEffect(() => {
    if (selectedExpertId === "new") {
      formRef.current?.reset();
      setMarcas([]);
      setRolActual("");
      setNombreVal("");
      setExpVal("");
      setTouched({});
      setErrors({});
    } else {
      const expert = allExperts.find(e => e.id.toString() === selectedExpertId);
      if (expert && formRef.current) {
        (formRef.current.elements.namedItem("codigo") as HTMLInputElement).value = expert.codigo;
        (formRef.current.elements.namedItem("nombre") as HTMLInputElement).value = expert.nombre;
        (formRef.current.elements.namedItem("empresa") as HTMLInputElement).value = expert.empresa || "";
        (formRef.current.elements.namedItem("anosExperiencia") as HTMLInputElement).value = expert.anosExperiencia.toString();
        setRolActual(expert.rolActual);
        const parsedMarcas = expert.marcasDomina ? JSON.parse(expert.marcasDomina) : [];
        setMarcas(parsedMarcas);
        (formRef.current.elements.namedItem("certificaciones") as HTMLTextAreaElement).value = expert.certificaciones || "";
        (formRef.current.elements.namedItem("zonaTrabajo") as HTMLInputElement).value = expert.zonaTrabajo || "";
        (formRef.current.elements.namedItem("contacto") as HTMLInputElement).value = expert.contacto || "";
        setNombreVal(expert.nombre);
        setExpVal(expert.anosExperiencia.toString());
        setTouched({});
        setErrors({});
      }
    }
  }, [selectedExpertId, allExperts, suggestedCodigo]);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.message);
    } else if (state?.message && !state?.success) {
      toast.error(state.message);
    }
  }, [state]);

  function validateField(name: string, value: string): string | undefined {
    switch (name) {
      case "nombre":
        return !value.trim() ? "El nombre es obligatorio." : undefined;
      case "anosExperiencia":
        return !value ? "Este campo es obligatorio." : parseInt(value) < 3 ? "Mínimo 3 años de experiencia." : undefined;
      case "rolActual":
        return !value ? "Selecciona un rol." : undefined;
      default:
        return undefined;
    }
  }

  function handleBlur(name: string) {
    setTouched((prev) => ({ ...prev, [name]: true }));
    let value = "";
    const el = formRef.current?.elements.namedItem(name);
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      value = el.value;
    }
    if (name === "rolActual") value = rolActual;
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  }

  const showError = (field: keyof FieldErrors) => touched[field] ? errors[field] : undefined;

  return (
    <div className="space-y-6">
      {/* Expert selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Label htmlFor="selectExpert" className="text-sm font-semibold text-slate-700 shrink-0">Experto:</Label>
          <Select onValueChange={(value) => setSelectedExpertId(value)} value={selectedExpertId || "new"}>
            <SelectTrigger id="selectExpert" className="w-full sm:w-72">
              <SelectValue placeholder="Seleccionar o crear" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">+ Nuevo Experto</SelectItem>
              {allExperts.map((expert) => (
                <SelectItem key={expert.id} value={expert.id.toString()}>
                  {expert.nombre} ({expert.codigo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-400 ml-auto">
            {selectedExpertId === "new" ? "Creando un nuevo perfil" : "Editando perfil existente"}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Progreso</span>
          <span className="text-sm font-bold text-slate-900">{requiredFilled}/{requiredTotal} obligatorios</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(requiredFilled / requiredTotal) * 100}%` }}
          />
        </div>
      </div>

      <form action={formAction} ref={formRef} className="space-y-6">
        <SectionCard icon={<User className="h-4 w-4" />} title="Identificación">
          <FieldGroup label="Código de Experto" htmlFor="codigo">
            <Input
              id="codigo"
              name="codigo"
              defaultValue={suggestedCodigo}
              readOnly
              className="bg-slate-50 text-slate-500 font-mono text-sm cursor-default"
            />
          </FieldGroup>

          <FieldGroup label="Nombre Completo" required error={showError("nombre")} htmlFor="nombre">
            <Input
              id="nombre"
              name="nombre"
              placeholder="Ej: Juan Pérez"
              value={nombreVal}
              onChange={(e) => { setNombreVal(e.target.value); setErrors((p) => ({ ...p, nombre: validateField("nombre", e.target.value) })); }}
              onBlur={() => handleBlur("nombre")}
              className={`transition-all duration-200 ${showError("nombre") ? "border-red-400 focus:ring-red-400" : ""}`}
            />
          </FieldGroup>

          <FieldGroup label="Empresa" htmlFor="empresa">
            <Input
              id="empresa"
              name="empresa"
              placeholder="Ej: Schindler del Perú"
              className="transition-all duration-200"
            />
          </FieldGroup>
        </SectionCard>

        <SectionCard icon={<Briefcase className="h-4 w-4" />} title="Perfil Profesional">
          <FieldGroup label="Años de Experiencia" required error={showError("anosExperiencia")} htmlFor="anosExperiencia">
            <Input
              id="anosExperiencia"
              name="anosExperiencia"
              type="number"
              min={3}
              placeholder="Mínimo 3 años"
              value={expVal}
              onChange={(e) => { setExpVal(e.target.value); setErrors((p) => ({ ...p, anosExperiencia: validateField("anosExperiencia", e.target.value) })); }}
              onBlur={() => handleBlur("anosExperiencia")}
              className={`transition-all duration-200 ${showError("anosExperiencia") ? "border-red-400 focus:ring-red-400" : ""}`}
            />
          </FieldGroup>

          <FieldGroup label="Rol Actual" required error={showError("rolActual")} htmlFor="rolActual">
            <Select
              name="rolActual"
              value={rolActual}
              onValueChange={(v) => { setRolActual(v); setTouched((p) => ({ ...p, rolActual: true })); setErrors((p) => ({ ...p, rolActual: validateField("rolActual", v) })); }}
              required
            >
              <SelectTrigger id="rolActual" className={`transition-all duration-200 ${showError("rolActual") ? "border-red-400 focus:ring-red-400" : ""}`}>
                <SelectValue placeholder="Selecciona tu rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tecnico_especialista">Técnico Especialista</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>

          {rolActual === "tecnico_especialista" && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <FieldGroup label="Marcas que domina" htmlFor="marcasDomina">
                <MultiSelect value={marcas} onChange={setMarcas} placeholder="Seleccionar marcas" />
                <input type="hidden" name="marcasDomina" ref={marcasHiddenRef} />
                <p className="text-xs text-slate-400 mt-1">Selecciona las marcas de ascensores que dominas</p>
              </FieldGroup>
            </div>
          )}

          <FieldGroup label="Certificaciones" htmlFor="certificaciones">
            <Textarea
              id="certificaciones"
              name="certificaciones"
              placeholder="Ej: Certificación Schindler MX-3300, Curso de Variadores"
              className="min-h-[80px] transition-all duration-200"
            />
          </FieldGroup>
        </SectionCard>

        <SectionCard icon={<Phone className="h-4 w-4" />} title="Contacto">
          <FieldGroup label="Zona de Trabajo" htmlFor="zonaTrabajo">
            <Input
              id="zonaTrabajo"
              name="zonaTrabajo"
              placeholder="Ej: Lima, Provincia"
              className="transition-all duration-200"
            />
          </FieldGroup>

          <FieldGroup label="Contacto (Email o Teléfono)" htmlFor="contacto">
            <Input
              id="contacto"
              name="contacto"
              type="text"
              placeholder="Ej: juan@email.com / +51 999 888 777"
              className="transition-all duration-200"
            />
          </FieldGroup>
        </SectionCard>

        {state?.message && !state?.success && (
          <div role="alert" className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <span>{state.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
