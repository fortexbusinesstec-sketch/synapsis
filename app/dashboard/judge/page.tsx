"use client";

import { useState, useEffect } from "react";
import { JudgeSidebar } from "@/components/judge/JudgeSidebar";
import { JudgeChat } from "@/components/judge/JudgeChat";
import { JudgeEvaluationModal } from "@/components/judge/JudgeEvaluationModal";

export default function JudgePage() {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [activeCase, setActiveCase] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);

  // Sync sessionId from localStorage on refresh or trigger
  useEffect(() => {
    const sId = localStorage.getItem("judge_session_id");
    setSessionId(sId);
  }, [refreshTrigger, selectedCaseId]);

  // Fetch current case data when selectedCaseId changes
  useEffect(() => {
    if (selectedCaseId) {
      fetchCase(selectedCaseId);
    } else {
      setActiveCase(null);
    }
  }, [selectedCaseId, refreshTrigger]);

  const fetchCase = async (id: string) => {
    try {
      const profileId = localStorage.getItem("judge_profile_id");
      if (!profileId) return;
      
      const res = await fetch(`/api/judge/cases?judgeProfileId=${profileId}`);
      if (res.ok) {
        const data = await res.json();
        const found = data.find((c: any) => c.id === id);
        setActiveCase(found);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinishCase = () => {
    setIsEvalModalOpen(true);
  };

  const handleEvaluationComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full lg:h-[calc(100vh-120px)] -mx-8 -my-8 overflow-hidden bg-white">
      {/* Columna Izquierda: Sidebar */}
      <div className="w-full lg:w-96 h-auto lg:h-full flex-shrink-0">
        <JudgeSidebar 
          onCaseSelect={setSelectedCaseId} 
          selectedCaseId={selectedCaseId}
          refreshTrigger={refreshTrigger}
          onRefresh={() => setRefreshTrigger(prev => prev + 1)}
        />
      </div>

      {/* Columna Derecha: Chat Area */}
      <div className="flex-1 min-w-0 bg-slate-50 p-0 lg:p-4 h-full overflow-hidden">
        <JudgeChat 
          caseId={selectedCaseId}
          sessionId={sessionId}
          equipmentModel={activeCase?.equipmentModel || null}
          caseTitle={activeCase?.title || ""}
          messagesUsed={activeCase?.messagesUsed || 0}
          status={activeCase?.status || "draft"}
          onFinish={handleFinishCase}
          onRefresh={() => setRefreshTrigger(prev => prev + 1)}
        />
      </div>

      {/* Evaluation Modal */}
      <JudgeEvaluationModal 
        isOpen={isEvalModalOpen}
        onClose={() => setIsEvalModalOpen(false)}
        judgeCaseId={selectedCaseId}
        judgeSessionId={sessionId}
        judgeProfileId={localStorage.getItem("judge_profile_id")}
        sessionMetrics={{
            loop_count: 0,
            total_ms: 0,
            final_confidence: 0,
            stopped_reason: "finished_by_user"
        }}
        onEvaluationComplete={handleEvaluationComplete}
      />
    </div>
  );
}
