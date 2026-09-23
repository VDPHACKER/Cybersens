// Erreur HTTP partagée par les routes de l'API et le relais Gemini.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
