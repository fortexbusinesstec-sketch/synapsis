import graphviz
import os

def generate_etasr_gap_engine_loop():
    # Diagrama de Bucle Agéntico (Gap Engine)
    # Estilo ETASR: B&W, Fuentes Grandes, Minimalista.
    dot = graphviz.Digraph('Synapsis_GapEngine_ETASR', comment='Gap Engine Decision Loop for ETASR')
    
    # 1. SETUP DE PÁGINA (Columna de 8.9cm)
    dot.attr(rankdir='TB', nodesep='0.8', ranksep='0.8', size='3.5,!', ratio='fill')
    dot.attr(splines='curved', fontname='Arial Bold') # 'curved' para que el loop se vea mejor
    
    # 2. ESTILOS GLOBALES
    dot.attr('node', shape='rect', style='solid', fontname='Arial Bold', fontsize='24', 
             color='black', fontcolor='black', fillcolor='white', penwidth='2.5')
    
    dot.attr('edge', fontname='Arial Bold', fontsize='18', color='black', 
             fontcolor='black', penwidth='2.0', arrowsize='1.3')

    # NODOS DEL PROCESO
    dot.node('N1', 'N1. Librarian\n(Search)')
    dot.node('N2', 'N2. Context\nSelector')
    dot.node('N3', 'N3. Analyst\n(Refactoring)')
    
    # ROMBO DE DECISIÓN (Gap Engine Core)
    dot.node('DEC', 'shouldLoop?\n(Gap Engine)', shape='diamond', fontsize='20')
    
    dot.node('N4', 'N4. Head Eng.\n(Output)')

    # FLUJO PRINCIPAL
    dot.edge('N1', 'N2')
    dot.edge('N2', 'N3')
    dot.edge('N3', 'DEC')
    
    # CAMINO A: RE-LOOP (Detección de Vacío de Información)
    dot.edge('DEC', 'N1', xlabel='YES\n(New Gap)', style='dashed', constraint='false', color='black')
    
    # CAMINO B: SALIDA (Información Suficiente o Límite Alcanzado)
    dot.edge('DEC', 'N4', xlabel='NO\n(Resolved)', color='black')

    # NOTAS TÉCNICAS (Burbujas pequeñas o etiquetas en los bordes)
    # Usamos un nodo de leyenda o etiquetas directas para las 3 reglas
    with dot.subgraph(name='cluster_rules') as r:
        r.attr(label='Gap Engine Stop Rules', style='dotted', color='black', fontname='Arial Bold', fontsize='18')
        r.node('R1', '1. Max Loops (3)', shape='plaintext', fontsize='16')
        r.node('R2', '2. No Confidence Gain', shape='plaintext', fontsize='16')
        r.node('R3', '3. Stale Gap Target', shape='plaintext', fontsize='16')

    # EXPORTACIÓN
    output_dir = 'imagenes'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    output_path = os.path.join(output_dir, 'synapsis_gap_engine_loop_etasr')
    dot.render(output_path, format='png', cleanup=True)
    dot.render(output_path, format='pdf', cleanup=True)
    
    print(f"✅ Gap Engine Loop ETASR Diagram generated at: {output_path}.pdf")

if __name__ == "__main__":
    generate_etasr_gap_engine_loop()
