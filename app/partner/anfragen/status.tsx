'use client';
import { useFormState } from 'react-dom';
import { anfrageAction } from '../actions';

const SCHRITTE: { status: 'Weitergeleitet' | 'Erledigt' | 'Abgebrochen'; label: string }[] = [
  { status: 'Weitergeleitet', label: 'In Bearbeitung' },
  { status: 'Erledigt', label: 'Muster verschickt' },
  { status: 'Abgebrochen', label: 'Nicht möglich' },
];

export function StatusKnoepfe({ anfrageId, status }: { anfrageId: string; status: string }) {
  const [state, action] = useFormState(anfrageAction, null);
  return (
    <form action={action} className="pa-statuszeile">
      <input type="hidden" name="anfrageId" value={anfrageId} />
      {SCHRITTE.filter((s) => s.status !== status).map((s) => (
        <button key={s.status} type="submit" name="status" value={s.status} className="pa-btn klein zweit">{s.label}</button>
      ))}
      {state?.fehler && <span className="pa-fehler">{state.fehler}</span>}
    </form>
  );
}
