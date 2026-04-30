import graphviz
import os

def generate_etasr_logical_architecture():
    # Diagrama Lógico Multimodal Multi-Agente (Sin Planificador)
    # Optimizado para ETASR Journal (B&W, Fuentes Grandes, Alta Visibilidad)
    dot = graphviz.Digraph('Synapsis_Logical_ETASR', comment='Logical Multi-Agent Architecture for ETASR')
    
    # 1. SETUP DE PÁGINA (Ajustado a una columna de 8.9cm)
    dot.attr(rankdir='TB', nodesep='0.6', ranksep='0.8', size='3.5,!', ratio='fill')
    dot.attr(splines='polyline', overlap='false', fontname='Arial Bold')
    
    # 2. ESTILOS GLOBALES (Referencia aprobada)
    dot.attr('node', shape='rect', style='solid', fontname='Arial Bold', fontsize='24', 
             color='black', fontcolor='black', fillcolor='white', penwidth='2.5')
    
    dot.attr('edge', fontname='Arial Bold', fontsize='20', color='black', 
             fontcolor='black', penwidth='2.0', arrowsize='1.5')

    # Estilos específicos
    db_style = {'shape': 'cylinder', 'style': 'solid', 'penwidth': '2.5'}

    # CAPA DE ENTRADA
    dot.node('INPUT', 'Technical\nQuery', shape='parallelogram')

    # ENJAMBRE CONVERSACIONAL (Pipeline de 5 Nodos)
    with dot.subgraph(name='cluster_logic') as c:
        c.attr(label='Multi-Agent Diagnostic Loop', style='dashed', color='black', fontname='Arial Bold', fontsize='22')
        
        c.node('N0', 'N0. Clarifier\n(gpt-4o-mini)')
        c.node('N1', 'N1. Librarian\n(Vector RAG)')
        c.node('N2', 'N2. Context\nSelector')
        c.node('N3', 'N3. Analyst\n(Gap Engine)')
        c.node('N4', 'N4. Head Eng.\n(gpt-4o)')

    # CAPA DE DATOS (Turso)
    with dot.subgraph(name='cluster_data') as d:
        d.attr(label='Knowledge Persistence', style='dashed', color='black', fontname='Arial Bold', fontsize='22')
        d.node('TURSO', 'Turso DB\n(Vectors)', **db_style)

    # FLUJO LÓGICO
    dot.edge('INPUT', 'N0')
    dot.edge('N0', 'N1')
    dot.edge('N1', 'N2')
    dot.edge('N2', 'N3')
    
    # BUCLE AGÉNTICO (RE-LOOP)
    # Si hay un gap de conocimiento, vuelve al Bibliotecario
    dot.edge('N3', 'N1', xlabel='Gap Detected\n(Re-loop)', style='dashed', constraint='false')
    
    # SALIDA FINAL
    dot.edge('N3', 'N4', xlabel='Validated')
    dot.edge('N4', 'TURSO', style='dotted', label='Log')
    
    # ACCESO A DATOS
    dot.edge('N1', 'TURSO', style='dashed', dir='both')

    # EXPORTACIÓN
    output_dir = 'imagenes'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    output_path = os.path.join(output_dir, 'synapsis_logical_etasr')
    dot.render(output_path, format='png', cleanup=True)
    dot.render(output_path, format='pdf', cleanup=True)
    
    print(f"✅ Logical ETASR Diagram generated at: {output_path}.pdf")

if __name__ == "__main__":
    generate_etasr_logical_architecture()
