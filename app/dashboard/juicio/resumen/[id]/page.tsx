import { getCurrentUser } from '@/lib/db/auth';
import { redirect } from 'next/navigation';

export default async function JuicioResumenPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();

  if (!user || user.role !== "Auditor" && user.role !== "JuicioExperto") {
    redirect('/login');
  }

  const sessionId = params.id;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Resumen de Sesión de Juicio</h1>
      <p>ID de Sesión: {sessionId}</p>
      <p>Aquí se mostrará el resumen detallado de la sesión, incluyendo datos del experto, la sesión, los mensajes y la encuesta.</p>
    </div>
  );
}
