import graphviz
import os

def generate_architecture():
    # Create the graph
    dot = graphviz.Digraph('Synapse_MAS_Architecture', comment='Synapse MAS ArchiMate Architecture')
    
    # Global visual settings for HD quality
    dot.attr(rankdir='TB', size='15,20!', ratio='fill', splines='ortho', fontname='Arial', fontsize='12')
    dot.attr('node', shape='box', style='filled,rounded', fontname='Arial', fontsize='10')
    dot.attr('edge', fontname='Arial', fontsize='8', color='#666666')

    # Color Constants
    COLOR_BUSINESS = '#FFF9C4'
    COLOR_APPLICATION = '#B2EBF2'
    COLOR_DATA = '#BBDEFB'
    COLOR_TECHNOLOGY = '#C8E6C9'

    # Layer 1: Business Layer
    with dot.subgraph(name='cluster_0') as b:
        b.attr(label='① BUSINESS LAYER — Capa de Presentación', style='filled', color='#F9F9F9', fillcolor='#FFFFFF', fontname='Arial Bold', fontsize='14')
        
        # Sub-clusters for rows within Business Layer
        with b.subgraph(name='cluster_b_row1') as br1:
            br1.attr(label='', style='invis')
            br1.node('ACTOR', '👤 Técnico / Ingeniero\n(Business Actor)', fillcolor=COLOR_BUSINESS)
            br1.node('ROLE_ADMIN', '👔 Administrador\n(Business Role)', fillcolor=COLOR_BUSINESS)

        with b.subgraph(name='cluster_b_row2') as br2:
            br2.attr(label='', style='invis')
            br2.node('SERV_AUTH', '🔐 Autenticación\n(Business Service)', fillcolor=COLOR_BUSINESS)
            br2.node('INT_DASH', '📊 Dashboard Web\n(Business Interface)', fillcolor=COLOR_BUSINESS)

        with b.subgraph(name='cluster_b_row3') as br3:
            br3.attr(label='', style='invis')
            br3.node('PROC_DL', '📋 Consulta de Diagnóstico\n(Business Process)', fillcolor=COLOR_BUSINESS)
            br3.node('PROC_IDX', '📤 Indexación de Documentos\n(Business Process)', fillcolor=COLOR_BUSINESS)

    # Layer 2: Application Layer
    with dot.subgraph(name='cluster_1') as a:
        a.attr(label='② APPLICATION LAYER — Capa de Aplicación', style='filled', color='#F9F9F9', fillcolor='#F0FBFF', fontname='Arial Bold', fontsize='14')
        
        a.node('CORE', '⚙️ Synapse MAS Core\n(Application Component)', fillcolor=COLOR_APPLICATION)

        with a.subgraph(name='cluster_staged') as st:
            st.attr(label='Componentes Staged', style='dashed', color='#999999')
            st.node('FIDELITY', '🛡️ Verificador de Fidelidad', fillcolor=COLOR_APPLICATION)
            st.node('SELECTOR', '🗺️ Selector de Contexto', fillcolor=COLOR_APPLICATION)
            st.node('ROUTER', '⚡ Enrutador Semántico', fillcolor=COLOR_APPLICATION)

        with a.subgraph(name='cluster_rag') as rag:
            rag.attr(label='Pipeline RAG / Indexing', style='filled', color='#E0F7FA')
            rag.node('ORCH', '🎯 Orchestrator', fillcolor=COLOR_APPLICATION)
            rag.node('OCR', '📖 OCR', fillcolor=COLOR_APPLICATION)
            rag.node('VIS', '👁️ Vision', fillcolor=COLOR_APPLICATION)

        with a.subgraph(name='cluster_chat') as chat:
            chat.attr(label='Pipeline Chat — Agentic Loop', style='filled', color='#E0F7FA')
            chat.node('CLAR', '🔤 Clarificador', fillcolor=COLOR_APPLICATION)
            chat.node('PLAN', '📋 Planificador', fillcolor=COLOR_APPLICATION)
            chat.node('ANAL', '🔬 Analista', fillcolor=COLOR_APPLICATION)

        a.node('SERV_CHAT', '💬 Servicio de Chat RAG', fillcolor=COLOR_APPLICATION)
        a.node('SERV_IDX', '🔂 Servicio de Indexación', fillcolor=COLOR_APPLICATION)
        a.node('CURIOUS', '🤔 Agente Curious — HITL', fillcolor=COLOR_APPLICATION)
        a.node('LOGGER', '📈 Logger + FinOps', fillcolor=COLOR_APPLICATION)

    # Layer 3: Data Layer
    with dot.subgraph(name='cluster_2') as d:
        d.attr(label='③ DATA LAYER — Capa de Datos', style='filled', color='#F9F9F9', fillcolor='#F0F7FF', fontname='Arial Bold', fontsize='14')
        d.node('ART_PDF', '📄 PDFs + Imágenes Procesadas\n(Artifact)', fillcolor=COLOR_DATA)
        d.node('DO_CHUNKS', '📦 Chunks + Embeddings\n(Data Object)', fillcolor=COLOR_DATA)
        d.node('DO_IMGS', '🖼️ Imágenes + Embeddings\n(Data Object)', fillcolor=COLOR_DATA)
        d.node('DO_SESS', '💬 Chat Sessions + Messages\n(Data Object)', fillcolor=COLOR_DATA)
        d.node('DO_ENR', '💡 Enrichments — HITL\n(Data Object)', fillcolor=COLOR_DATA)
        d.node('DO_METRICS', '📊 Agent Logs + Métricas\n(Data Object)', fillcolor=COLOR_DATA)

    # Layer 4: Technology Layer
    with dot.subgraph(name='cluster_3') as t:
        t.attr(label='④ TECHNOLOGY LAYER — Capa de Tecnología', style='filled', color='#F9F9F9', fillcolor='#F1F8F1', fontname='Arial Bold', fontsize='14')
        t.node('MISTRAL', '☁️ Mistral AI API', fillcolor=COLOR_TECHNOLOGY)
        t.node('OPENAI', '☁️ OpenAI API', fillcolor=COLOR_TECHNOLOGY)
        t.node('R2', '🪣 Cloudflare R2', fillcolor=COLOR_TECHNOLOGY)
        t.node('NEXT', '⚛️ Next.js 16.2.1 + Vercel AI SDK', fillcolor=COLOR_TECHNOLOGY)
        t.node('VERCEL', '⚡ Vercel Serverless', fillcolor=COLOR_TECHNOLOGY)
        t.node('TURSO', '🗄️ Turso Cloud — LibSQL', fillcolor=COLOR_TECHNOLOGY)

    # Relationships
    dot.edge('ACTOR', 'PROC_DL', label='triggering')
    dot.edge('ROLE_ADMIN', 'PROC_IDX', label='triggering')
    dot.edge('INT_DASH', 'ROLE_ADMIN', label='serving')
    
    dot.edge('PROC_DL', 'SERV_CHAT', label='uses')
    dot.edge('PROC_IDX', 'SERV_IDX', label='uses')
    
    dot.edge('SERV_CHAT', 'CLAR', label='realization')
    dot.edge('SERV_IDX', 'ORCH', label='realization')
    
    dot.edge('ANAL', 'DO_SESS', label='reads')
    dot.edge('ANAL', 'DO_CHUNKS', label='reads')
    dot.edge('ANAL', 'DO_ENR', label='reads')
    
    dot.edge('OCR', 'DO_CHUNKS', label='writes')
    dot.edge('VIS', 'DO_IMGS', label='writes')
    dot.edge('ORCH', 'ART_PDF', label='writes')
    
    dot.edge('CURIOUS', 'DO_ENR', label='writes')
    dot.edge('LOGGER', 'DO_METRICS', label='writes')
    
    dot.edge('NEXT', 'CORE', label='realizes')
    dot.edge('VERCEL', 'NEXT', label='hosts')
    dot.edge('TURSO', 'DO_CHUNKS', label='hosts')
    dot.edge('R2', 'ART_PDF', label='hosts')
    dot.edge('OPENAI', 'CORE', label='serving')
    dot.edge('MISTRAL', 'CORE', label='serving')

    # Output paths
    output_dir = 'imagenes'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Save as PNG (High DPI) and SVG (Vector)
    file_base = os.path.join(output_dir, 'arquitectura_sistema_hd')
    dot.render(file_base, format='png', cleanup=False)
    dot.render(file_base, format='svg', cleanup=False)
    
    print(f"Diagrama generado con éxito en:\n - {file_base}.png\n - {file_base}.svg")

if __name__ == "__main__":
    generate_architecture()
