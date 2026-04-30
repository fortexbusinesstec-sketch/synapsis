import graphviz
import os

def generate_etasr_indexing_pipeline():
    # Creación del grafo optimizado para publicación científica (ETASR)
    dot = graphviz.Digraph('Synapsis_Indexing_ETASR', comment='Technical Pipeline for ETASR Journal')
    
    # 1. SETUP DE PÁGINA: Forzamos el ancho a una columna (~3.5 pulgadas o 8.9 cm)
    # Esto asegura que las fuentes se vean grandes en relación al gráfico.
    dot.attr(rankdir='TB', nodesep='0.6', ranksep='0.8', size='3.5,!', ratio='fill')
    # splines='polyline' es más seguro para etiquetas grandes que 'ortho' en Graphviz
    dot.attr(splines='polyline', overlap='false', fontname='Arial Bold')
    
    # 2. ESTILOS GLOBALES (Negro puro, fuentes grandes, líneas gruesas)
    dot.attr('node', shape='rect', style='solid', fontname='Arial Bold', fontsize='24', 
             color='black', fontcolor='black', fillcolor='white', penwidth='2.5')
    
    dot.attr('edge', fontname='Arial Bold', fontsize='20', color='black', 
             fontcolor='black', penwidth='2.0', arrowsize='1.5')

    # Estilos de componentes específicos
    db_style = {'shape': 'cylinder'}
    model_style = {'shape': 'component'}

    # I. CAPA DE INGESTA
    with dot.subgraph(name='cluster_0') as c:
        c.attr(label='I. Ingestion Layer', style='dashed', color='black', fontname='Arial Bold', fontsize='22')
        c.node('POST', 'POST /api/upload', shape='invhouse')
        c.node('R2', 'Cloudflare R2', **db_style)

    # II. CAPA DE TRANSFORMACIÓN
    with dot.subgraph(name='cluster_1') as c:
        c.attr(label='II. Structural OCR', style='dashed', color='black', fontname='Arial Bold', fontsize='22')
        c.node('MISTRAL', 'Mistral OCR\nEngine', **model_style)

    # Nodo de bifurcación
    dot.node('SPLIT', '', shape='circle', width='0.15', height='0.15', style='filled', color='black', fillcolor='black')

    # III. CAPA DE BIFURCACIÓN (Paralelismo)
    with dot.subgraph(name='cluster_text') as t:
        t.attr(label='III-A. Text', color='black', style='solid', fontname='Arial Bold', fontsize='22')
        t.node('CHUNKER', 'Semantic\nChunker')
        t.node('EMBEDDER', 'Text\nEmbedder')

    with dot.subgraph(name='cluster_img') as i:
        i.attr(label='III-B. Visual', color='black', style='solid', fontname='Arial Bold', fontsize='22')
        i.node('VISION', 'Vision\nAgent')

    # Forzar nivel horizontal
    with dot.subgraph() as align:
        align.attr(rank='same')
        align.node('CHUNKER')
        align_agents.node('VISION') if 'align_agents' in locals() else align.node('VISION')

    # IV. CAPA DE PERSISTENCIA
    with dot.subgraph(name='cluster_db') as db:
        db.attr(label='IV. Persistence (Turso)', style='dashed', color='black', fontname='Arial Bold', fontsize='22')
        db.node('T_DOCS', 'Documents', **db_style)
        db.node('T_CHUNKS', 'Chunks', **db_style)
        db.node('T_IMGS', 'Images', **db_style)
        db.node('T_ENR', 'Gaps (QA)', **db_style)

    # V. ORQUESTACIÓN
    dot.node('ORCH', 'Orchestrator', shape='doubleoctagon')
    dot.node('CURIOUS', 'Curious Agent', **model_style)

    # FLUJO DE DATOS (Usando xlabel para evitar solapamientos)
    dot.edge('POST', 'R2', xlabel='Backup')
    dot.edge('POST', 'MISTRAL', xlabel='PDF')
    dot.edge('MISTRAL', 'SPLIT', xlabel='JSON')

    dot.edge('SPLIT', 'CHUNKER', xlabel='Text')
    dot.edge('CHUNKER', 'EMBEDDER')
    dot.edge('EMBEDDER', 'T_CHUNKS')

    dot.edge('SPLIT', 'VISION', xlabel='Images')
    dot.edge('VISION', 'T_IMGS')

    dot.edge('T_CHUNKS', 'ORCH', style='dotted')
    dot.edge('ORCH', 'T_DOCS', xlabel='Ready')

    dot.edge('T_CHUNKS', 'CURIOUS', xlabel='Scan')
    dot.edge('CURIOUS', 'T_ENR', xlabel='Gaps')

    # Exportación en alta calidad
    output_dir = 'imagenes'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    output_path = os.path.join(output_dir, 'synapsis_etasr_final')
    # PDF es el formato preferido para ETASR por su escalabilidad vectorial
    dot.render(output_path, format='png', cleanup=True)
    dot.render(output_path, format='pdf', cleanup=True) 
    
    print(f"✅ ETASR-Ready Diagram generated at: {output_path}.pdf")

if __name__ == "__main__":
    generate_etasr_indexing_pipeline()