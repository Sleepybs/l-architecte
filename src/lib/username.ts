// Les pseudos chess.com ne contiennent que lettres, chiffres, _ et -.
// Valider avant tout appel réseau évite d'envoyer n'importe quoi dans une URL.
export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,25}$/

/** Renvoie le pseudo nettoyé (minuscules, sans espaces autour) ou null s'il est invalide. */
export function normalizeUsername(raw: string): string | null {
  const value = raw.trim()
  return USERNAME_PATTERN.test(value) ? value.toLowerCase() : null
}
