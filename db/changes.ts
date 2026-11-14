/**
 * Prosty emiter „lokalne dane się zmieniły”. Repozytoria wołają `notifyLocalChange()`
 * po każdym zapisie; silnik synchronizacji (etap 7) subskrybuje i planuje wysyłkę.
 */
export type ChangeSource = 'user' | 'sync';
type Listener = (source: ChangeSource) => void;
const listeners = new Set<Listener>();

export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `sync` – zmiana wprowadzona przez synchronizację (nie powinna planować kolejnej wysyłki). */
export function notifyLocalChange(source: ChangeSource = 'user'): void {
  listeners.forEach((l) => l(source));
}
