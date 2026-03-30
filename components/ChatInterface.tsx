'use client';

import { useChat } from 'ai/react';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button'; // Placeholder (Shadcn)
import { Input } from '@/components/ui/input';   // Placeholder (Shadcn)
import { Paperclip, Send, Image as ImageIcon, Zap, Cpu, History as HistoryIcon, Search, Eye } from 'lucide-react';

/**
 * COMPONENTE DE CHAT MULTIMODAL (Schindler MAS)
 * Interfaz premium para técnicos e ingenieros de mantenimiento.
 * Visualiza el estado de la orquestación de agentes.
 */

export function ChatInterface() {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      equipmentId: 'SCH-3300-MX823', // ID de ejemplo
    },
  });

  return (
    <div className="flex flex-col h-[80vh] w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0b] shadow-2xl backdrop-blur-xl">
      
      {/* HEADER: Estado de Agentes */}
      <div className="p-6 border-b border-white/5 bg-gradient-to-r from-red-900/10 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/20 rounded-xl">
            <Zap className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide">ASSISTANT CORE v2</h2>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-medium">Orquestación Multi-Agente Activa</p>
          </div>
        </div>
        
        {/* Chips de Agentes Activos */}
        <div className="hidden md:flex gap-2">
          <AgentBadge icon={Search} label="Documental" active />
          <AgentBadge icon={HistoryIcon} label="Historiador" active />
          <AgentBadge icon={Eye} label="Visionario" />
          <AgentBadge icon={Cpu} label="Refinador" active />
        </div>
      </div>

      {/* CHAT MESSAGES */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-white/10">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <div className="p-4 bg-white/5 rounded-full ring-1 ring-white/10">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <p className="text-sm text-balance max-w-xs">
              Introduce un código de error o sube una imagen del panel SMLCD para iniciar el diagnóstico.
            </p>
          </div>
        )}
        
        {messages.map((m: any) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-lg ${
              m.role === 'user' 
                ? 'bg-red-600 text-white rounded-br-none' 
                : 'bg-white/5 text-slate-200 border border-white/10 rounded-bl-none'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {/* INPUT AREA: Soporte Multimodal */}
      <div className="p-6 bg-white/5 border-t border-white/5">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-3">
          <div className="flex gap-2 mb-1.5">
             <button 
               type="button" 
               onClick={() => fileInputRef.current?.click()}
               className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
             >
               <ImageIcon className="w-5 h-5" />
             </button>
          </div>

          <div className="flex-1 relative group">
            <input 
              value={input}
              onChange={handleInputChange}
              placeholder="Describa la avería o consulte un manual..."
              className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 pr-12 focus:ring-1 focus:ring-red-500/50 outline-none transition-all placeholder:text-white/20 text-slate-200"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-red-600 rounded-xl text-white hover:bg-red-500 disabled:opacity-30 disabled:hover:bg-red-600 transition-all shadow-lg"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,application/pdf"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              if (file) {
                // Implementación de carga multimodal pendiente
                console.log('Archivo seleccionado:', file.name);
              }
            }}
          />
        </form>
      </div>
    </div>
  );
}

function AgentBadge({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase font-bold tracking-tighter transition-all ${
      active 
        ? 'bg-green-500/10 border-green-500/30 text-green-400 opacity-100 ring-4 ring-green-500/5' 
        : 'bg-white/5 border-white/10 text-white/30 opacity-40'
    }`}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
}
