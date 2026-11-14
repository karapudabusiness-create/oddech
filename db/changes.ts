/**
 * Prosty emiter „lokalne dane się zmieniły”. Repozytoria wołają `notifyLocalChange()`
 * po każdym zapisie; silnik synchronizacji (etap 7) subskrybuje i planuje wysyłkę.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyLocalChange(): void {
  listeners.forEach((l) => l());
}
