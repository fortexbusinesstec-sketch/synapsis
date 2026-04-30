import graphviz
import os

def generate_q1_indexing_pipeline():
    dot = graphviz.Digraph('Synapsis_Indexing_Q1', comment='Formal Data Processing Pipeline for Q1 Paper')
    
    # 1. ATRIBUTOS GLOBALES: Layout estructurado y espacioso
    # splines='ortho' para líneas rectas profesionales. Aumentamos nodesep y ranksep para dar "aire".
    dot.attr(rankdir='TB', nodesep='0.8', ranksep='0.8', size='12,12', splines='ortho')
    dot.attr(fontname='Helvetica,Arial,sans-serif', fontsize='12', fontcolor='#0f172a')
    
    # Atributos por defecto para Nodos y Aristas
    dot.attr('node', shape='rect', style='filled', fontname='Helvetica,Arial,sans-serif', fontsize='10', 
             color='#1e293b', fillcolor='#f1f5f9', penwidth='1.2')
    # Se reduce el tamaño de fuente de las flechas para que no saturen el gráfico
    dot.attr('edge', fontname='Helvetica,Arial,sans-serif', fontsize='9', color='#475569', fontcolor='#1e293b')

    # Estilos específicos
    db_style = {'shape': 'cylinder', 'fillcolor': '#e2e8f0', 'color': '#475569'}
    model_style = {'shape': 'component', 'fillcolor': '#f8fafc', 'color': '#1e293b', 'fontcolor': '#0f172a'}

    # I. CAPA DE INGESTA
    with dot.subgraph(name='cluster_0') as c:
        c.attr(label='I. Data Ingestion Layer', style='dashed', color='#64748b', fontname='Helvetica Bold')
        c.node('POST', 'POST /api/upload\n(REST Entry Point)', shape='invhouse')
        c.node('R2', 'Cloudflare R2\n«Binary Blob Storage»', **db_style)

    # II. CAPA DE TRANSFORMACIÓN
    with dot.subgraph(name='cluster_1') as c:
        c.attr(label='II. Structural Transformation Layer', style='dashed', color='#64748b', fontname='Helvetica Bold')
        c.node('MISTRAL', 'Mistral OCR Engine\n«mistral-ocr-latest»', **model_style)

    # Nodo invisible para bifurcación limpia
    dot.node('SPLIT', '', shape='circle', width='0.05', height='0.05', style='filled', fillcolor='#1e293b')

    # III. CAPA DE BIFURCACIÓN (Alineando ramas paralelas)
    with dot.subgraph(name='cluster_text') as t:
        t.attr(label='III-A. Semantic Text Extraction', color='#cbd5e1', style='rounded')
        t.node('CHUNKER', 'Semantic Chunker\n«gpt-4o-mini»', fillcolor='#f8fafc')
        t.node('EMBEDDER', 'Text Embedder\n«text-embedding-3-small»', fillcolor='#f8fafc')

    with dot.subgraph(name='cluster_img') as i:
        i.attr(label='III-B. Visual Extraction', color='#cbd5e1', style='rounded')
        i.node('VISION', 'Vision Multimodal Agent\n«pixtral-12b-2409»', fillcolor='#f8fafc')

    # Alineamos Chunker y Vision en el mismo nivel horizontal para que se note el paralelismo
    with dot.subgraph() as align_agents:
        align_agents.attr(rank='same')
        align_agents.node('CHUNKER')
        align_agents.node('VISION')

    # IV. CAPA DE PERSISTENCIA
    with dot.subgraph(name='cluster_db') as db:
        db.attr(label='IV. Knowledge Persistence (Turso LibSQL)', style='dashed', color='#64748b', fontname='Helvetica Bold')
        # Alineamos las tablas horizontalmente
        db.attr(rank='same') 
        db.node('T_DOCS', 'Table: documents\n(Metadata)', **db_style)
        db.node('T_CHUNKS', 'Table: document_chunks\n(Vectors F32_BLOB)', **db_style)
        db.node('T_IMGS', 'Table: extracted_images\n(Descriptions & Refs)', **db_style)
        db.node('T_ENR', 'Table: enrichments\n(HITL Gaps)', **db_style)

    # V. ORQUESTACIÓN
    with dot.subgraph(name='cluster_orch') as orch:
        orch.attr(style='invis') # Capa invisible solo para agrupar abajo
        orch.node('ORCH', 'System Orchestrator\n(Final Costing & State Update)', shape='doubleoctagon', fillcolor='#f1f5f9')
        orch.node('CURIOUS', 'Curious Agent\n(Semantic Gap Analysis)', **model_style)

    # FLUJO DE DATOS (Cambiado xlabel a label)
    # ---------------------------------------------------------
    dot.edge('POST', 'R2', label=' Binary Backup')
    dot.edge('POST', 'MISTRAL', label=' Multipart PDF')
    dot.edge('MISTRAL', 'SPLIT', label=' JSON Object')

    # Rama Texto
    dot.edge('SPLIT', 'CHUNKER', label=' Markdown')
    dot.edge('CHUNKER', 'EMBEDDER', label=' Semantic Chunks')
    dot.edge('EMBEDDER', 'T_CHUNKS', label=' Vector UPSERT')

    # Rama Imagen
    dot.edge('SPLIT', 'VISION', label=' Base64 Image List')
    dot.edge('VISION', 'T_IMGS', label=' Structured Desc.')

    # Consolidación
    dot.edge('T_CHUNKS', 'ORCH', style='dotted')
    dot.edge('T_IMGS', 'ORCH', style='dotted')
    dot.edge('ORCH', 'T_DOCS', label=' Status: READY')

    # Disparador Secundario
    dot.edge('T_CHUNKS', 'CURIOUS', label=' Scan')
    dot.edge('CURIOUS', 'T_ENR', label=' Insert Gaps')

    # Exportación a formato vectorial (Ideal para ETASR)
    output_dir = 'imagenes'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    output_path = os.path.join(output_dir, 'synapsis_q1_pipeline_architecture')
    # Guardamos en PNG y PDF. Usa el PDF en LaTeX para resolución infinita.
    dot.render(output_path, format='png', cleanup=True)
    dot.render(output_path, format='pdf', cleanup=True) 
    print(f"✅ Q1 Pipeline Diagram generated at: {output_path}.pdf")

if __name__ == "__main__":
    generate_q1_indexing_pipeline()