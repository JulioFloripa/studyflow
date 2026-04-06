/**
 * Retorna a data local do usuário no formato YYYY-MM-DD.
 * Evita o bug de fuso horário do toISOString() que usa UTC
 * e pode retornar o dia errado para usuários em GMT-3 ou similar.
 */
export function localDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adiciona N dias a uma data local e retorna no formato YYYY-MM-DD.
 * Usa manipulação local para evitar bugs de fuso horário.
 */
export function addDaysLocal(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateStr(date);
}
