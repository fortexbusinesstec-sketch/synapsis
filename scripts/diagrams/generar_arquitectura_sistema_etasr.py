import graphviz
import os

def generate_etasr_system_architecture():
    # Arquitectura de Sistema Synapsis (Estilo ArchiMate simplificado para ETASR)
    # Sin Planificador, Blanco y Negro, Fuentes Grandes.
    dot = graphviz.Digraph('Synapsis_System_ETASR', comment='System Architecture for ETASR')
    
    # 1. SETUP DE PÁGINA (Columna de 8.9cm)
    dot.attr(rankdir='TB', nodesep='0.6', ranksep='0.8', size='3.5,!', ratio='fill')
    dot.attr(splines='polyline', fontname='Arial Bold')
    
    # 2. ESTILOS GLOBALES
    dot.attr('node', shape='rect', style='solid', fontname='Arial Bold', fontsize='24', 
             color='black', fontcolor='black', fillcolor='white', penwidth='2.5')
    
    dot.attr('edge', fontname='Arial Bold', fontsize='18', color='black', 
             fontcolor='black', penwidth='2.0', arrowsize='1.3')

    # --- CAPA DE APLICACIÓN ---
    with dot.subgraph(name='cluster_app') as a:
        a.attr(label='I. Application Layer', style='dashed', color='black', fontname='Arial Bold', fontsize='22')
        
        # Componentes Principales
        a.node('CORE', 'Synapse MAS\nCore (Next.js)')
        
        with a.subgraph(name='cluster_agents') as ag:
            ag.attr(label='Diagnostic Swarm', style='solid', color='black')
            ag.node('CLAR', 'Clarifier')
            ag.node('RET', 'Librarian')
            ag.node('ANAL', 'Analyst')
            ag.node('PRO', 'Head Eng.')
            
        a.node('CUR', 'Curious\nAgent')

    # --- CAPA DE DATOS ---
    with dot.subgraph(name='cluster_data') as d:
        d.attr(label='II. Data Layer', style='dashed', color='black', fontname='Arial Bold', fontsize='22')
        d.node('TURSO', 'Turso Cloud\n(Vector DB)', shape='cylinder')
        d.node('R2', 'Cloudflare R2\n(Storage)', shape='cylinder')

    # --- CAPA DE TECNOLOGÍA ---
    with dot.subgraph(name='cluster_tech') as t:
        t.attr(label='III. Technology Layer', style='dashed', color='black', fontname='Arial Bold', fontsize='22')
        t.node('OAI', 'OpenAI API\n(GPT-4o)', shape='component')
        t.node('MIS', 'Mistral AI\n(OCR)', shape='component')
        t.node('VER', 'Vercel\n(Edge)', shape='component')

    # RELACIONES LÓGICAS (Simplificadas)
    dot.edge('CORE', 'CLAR')
    dot.edge('CLAR', 'RET')
    dot.edge('RET', 'ANAL')
    dot.edge('ANAL', 'PRO')
    
    # Conexiones a Datos
    dot.edge('RET', 'TURSO', dir='both', xlabel='RAG')
    dot.edge('CUR', 'TURSO', xlabel='GAP')
    dot.edge('CORE', 'R2', xlabel='Docs')
    
    # Conexiones a Tecnología
    dot.edge('CORE', 'VER', style='dotted')
    dot.edge('ANAL', 'OAI', style='dashed')
    dot.edge('RET', 'MIS', style='dashed')

    # EXPORTACIÓN
    output_dir = 'imagenes'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    output_path = os.path.join(output_dir, 'synapsis_system_architecture_etasr')
    dot.render(output_path, format='png', cleanup=True)
    dot.render(output_path, format='pdf', cleanup=True)
    
    print(f"✅ System Architecture ETASR Diagram generated at: {output_path}.pdf")

if __name__ == "__main__":
    generate_etasr_system_architecture()
