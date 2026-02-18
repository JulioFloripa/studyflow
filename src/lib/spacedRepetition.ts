/**
 * Algoritmo de Repetição Espaçada Simplificado (baseado em SM-2)
 * 
 * Ajusta o intervalo da próxima revisão baseado na facilidade reportada pelo usuário
 */

export type EaseFactor = 1 | 2 | 3 | 4 | 5;

export interface ReviewResult {
  nextInterval: number; // dias até próxima revisão
  newEaseFactor: number; // fator de facilidade ajustado (usado internamente)
}

/**
 * Calcula o próximo intervalo de revisão baseado na facilidade
 * 
 * @param currentInterval - Intervalo atual em dias (1, 7, 30, etc)
 * @param easeFactor - Quão fácil foi a revisão (1=muito difícil, 5=muito fácil)
 * @param previousEaseFactor - Fator de facilidade anterior (2.5 por padrão)
 * @returns Próximo intervalo e novo fator de facilidade
 */
export function calculateNextReview(
  currentInterval: number,
  easeFactor: EaseFactor,
  previousEaseFactor: number = 2.5
): ReviewResult {
  // Mapear facilidade (1-5) para ajuste do fator
  // 1 (muito difícil) -> -0.8
  // 2 (difícil) -> -0.4
  // 3 (médio) -> 0
  // 4 (fácil) -> +0.2
  // 5 (muito fácil) -> +0.4
  const adjustment = (easeFactor - 3) * 0.4;
  
  // Calcular novo fator de facilidade (mínimo 1.3)
  let newEaseFactor = Math.max(1.3, previousEaseFactor + adjustment);
  
  // Calcular próximo intervalo
  let nextInterval: number;
  
  if (easeFactor <= 2) {
    // Se foi difícil, reiniciar o ciclo
    nextInterval = 1;
    newEaseFactor = Math.max(1.3, newEaseFactor - 0.2); // Penalidade extra
  } else if (currentInterval === 1) {
    // Primeira revisão bem-sucedida -> 6 dias
    nextInterval = 6;
  } else if (currentInterval < 7) {
    // Segunda revisão bem-sucedida -> 14 dias
    nextInterval = 14;
  } else {
    // Revisões subsequentes: multiplicar pelo fator de facilidade
    nextInterval = Math.round(currentInterval * newEaseFactor);
  }
  
  // Limitar intervalo máximo a 180 dias (6 meses)
  nextInterval = Math.min(nextInterval, 180);
  
  return {
    nextInterval,
    newEaseFactor,
  };
}

/**
 * Determina o tipo de revisão baseado no intervalo
 */
export function getReviewType(interval: number): 'D1' | 'D7' | 'D30' {
  if (interval <= 1) return 'D1';
  if (interval <= 14) return 'D7';
  return 'D30';
}

/**
 * Sugere o próximo intervalo de revisão para uma nova sessão de estudo
 */
export function getInitialReviewIntervals(): number[] {
  return [1, 7, 30]; // Padrão: 1 dia, 7 dias, 30 dias
}

/**
 * Calcula a "urgência" de uma revisão atrasada
 * Quanto maior o atraso, maior a urgência
 */
export function calculateReviewUrgency(scheduledDate: string, today: string): number {
  const scheduled = new Date(scheduledDate);
  const current = new Date(today);
  const daysLate = Math.floor((current.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysLate <= 0) return 0; // Não está atrasada
  if (daysLate <= 3) return 1; // Baixa urgência
  if (daysLate <= 7) return 2; // Média urgência
  return 3; // Alta urgência
}

/**
 * Retorna labels descritivos para os níveis de facilidade
 */
export function getEaseFactorLabel(ease: EaseFactor): string {
  const labels = {
    1: 'Muito Difícil',
    2: 'Difícil',
    3: 'Médio',
    4: 'Fácil',
    5: 'Muito Fácil',
  };
  return labels[ease];
}

/**
 * Retorna emojis para os níveis de facilidade
 */
export function getEaseFactorEmoji(ease: EaseFactor): string {
  const emojis = {
    1: '😰',
    2: '😕',
    3: '😐',
    4: '😊',
    5: '😎',
  };
  return emojis[ease];
}
