/* Vorschläge sind jetzt Projekte. */
import { redirect } from 'next/navigation';
export default function Vorschlag({ params }: { params: { id: string } }) { redirect(`/studio/p/${params.id}`); }
