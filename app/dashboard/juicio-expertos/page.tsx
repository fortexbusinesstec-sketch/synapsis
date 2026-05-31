import { getCurrentUser } from '@/lib/db/auth';
import { redirect } from 'next/navigation';

export default async function JuicioExpertosPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "JuicioExperto") {
    redirect('/login');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold text-gray-800">Portal de Juicio de Expertos</h1>
      <p className="mt-3 text-lg text-gray-600">Bienvenido, {user.email}.</p>
      <p className="mt-3 text-lg text-gray-600">Aquí se construirá la vista de juicio de expertos.</p>
    </div>
  );
}
