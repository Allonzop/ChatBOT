/** Premier message d'une conversation créée depuis une tuile, en attente d'envoi. */
const KEY = (id: string) => `pending-message:${id}`;

export function setPendingMessage(conversationId: string, content: string): void {
  try {
    sessionStorage.setItem(KEY(conversationId), content);
  } catch {
    /* stockage indisponible */
  }
}

export function takePendingMessage(conversationId: string): string | null {
  try {
    const value = sessionStorage.getItem(KEY(conversationId));
    if (value !== null) sessionStorage.removeItem(KEY(conversationId));
    return value;
  } catch {
    return null;
  }
}
