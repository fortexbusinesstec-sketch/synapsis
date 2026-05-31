"use client";

import { useState } from "react";
import { Expert } from "@/lib/db/schema";
import ExpertProfileForm from "@/components/juicio/ExpertProfileForm";
import EnterJudgment from "@/components/juicio/EnterJudgment";

export default function TabbedProfile({
  suggestedCodigo,
  allExperts,
}: {
  suggestedCodigo: string;
  allExperts: Expert[];
}) {
  const [activeTab, setActiveTab] = useState<"create" | "enter">("create");

  const tabClass = (tab: "create" | "enter") =>
    `px-6 py-3 text-sm font-bold rounded-t-lg transition-colors ${
      activeTab === tab
        ? "bg-white text-blue-600 border-t-2 border-blue-600"
        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
    }`;

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        <button
          type="button"
          className={tabClass("create")}
          onClick={() => setActiveTab("create")}
        >
          + Crear Nuevo Experto
        </button>
        <button
          type="button"
          className={tabClass("enter")}
          onClick={() => setActiveTab("enter")}
        >
          Entrar a Juicio
        </button>
      </div>

      {activeTab === "create" ? (
        <ExpertProfileForm suggestedCodigo={suggestedCodigo} allExperts={allExperts} />
      ) : (
        <EnterJudgment experts={allExperts} />
      )}
    </div>
  );
}
