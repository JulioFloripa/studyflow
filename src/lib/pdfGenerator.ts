import { Student } from '@/types/educational';
import { Subject } from '@/types/study';
import type { StudyCycleResult } from './cycleGenerator';
import { formatCycleForWeek } from './cycleGenerator';
import { DAY_LABELS, STUDY_METHOD_LABELS, LEARNING_PACE_LABELS } from '@/types/educational';

/**
 * Gera HTML para o relatório de estudos do aluno
 */
export function generateReportHTML(
  student: Student,
  cycle: StudyCycleResult,
  subjects: Subject[]
): string {
  const weeklySchedule = formatCycleForWeek(cycle);
  const currentDate = new Date().toLocaleDateString('pt-BR');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plano de Estudos - ${student.fullName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 40px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4338CA;
    }
    
    .header h1 {
      color: #4338CA;
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .header .subtitle {
      color: #666;
      font-size: 18px;
    }
    
    .student-info {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    
    .student-info h2 {
      color: #4338CA;
      font-size: 24px;
      margin-bottom: 15px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
    }
    
    .info-label {
      font-weight: 600;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 16px;
      color: #333;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .summary-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    
    .summary-card .number {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .summary-card .label {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .section h2 {
      color: #4338CA;
      font-size: 22px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .distribution {
      display: grid;
      gap: 15px;
    }
    
    .distribution-item {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .color-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .distribution-info {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .subject-name {
      font-weight: 600;
    }
    
    .subject-time {
      color: #666;
      font-size: 14px;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }
    
    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
    }
    
    .schedule {
      display: grid;
      gap: 20px;
    }
    
    .day-schedule {
      page-break-inside: avoid;
    }
    
    .day-header {
      font-weight: 600;
      color: #4338CA;
      font-size: 16px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .time-slots {
      display: grid;
      gap: 10px;
    }
    
    .time-slot {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 4px solid;
    }
    
    .time-slot-time {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #666;
      min-width: 120px;
    }
    
    .time-slot-content {
      flex: 1;
    }
    
    .time-slot-subject {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .time-slot-topics {
      font-size: 12px;
      color: #666;
    }
    
    .time-slot-duration {
      background: #e5e7eb;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      color: #666;
    }
    
    .recommendations {
      background: #fef3c7;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #f59e0b;
    }
    
    .recommendations h3 {
      color: #92400e;
      margin-bottom: 15px;
    }
    
    .recommendations ul {
      list-style: none;
      display: grid;
      gap: 10px;
    }
    
    .recommendations li {
      padding-left: 25px;
      position: relative;
      color: #78350f;
    }
    
    .recommendations li:before {
      content: "→";
      position: absolute;
      left: 0;
      font-weight: bold;
    }
    
    .methods {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    
    .method-badge {
      background: #4338CA;
      color: white;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .summary-card {
        break-inside: avoid;
      }
      
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📚 Plano de Estudos Personalizado</h1>
    <div class="subtitle">Gerado em ${currentDate}</div>
  </div>

  <div class="student-info">
    <h2>👤 Informações do Aluno</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Nome Completo</div>
        <div class="info-value">${student.fullName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Email</div>
        <div class="info-value">${student.email || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Carreira Pretendida</div>
        <div class="info-value">${student.targetCareer || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Universidade Alvo</div>
        <div class="info-value">${student.targetUniversity || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Série/Ano</div>
        <div class="info-value">${student.currentGrade || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Ritmo de Aprendizagem</div>
        <div class="info-value">${student.learningPace ? LEARNING_PACE_LABELS[student.learningPace] : '-'}</div>
      </div>
    </div>
    ${student.studyMethods && student.studyMethods.length > 0 ? `
    <div style="margin-top: 15px;">
      <div class="info-label">Métodos de Estudo Preferidos</div>
      <div class="methods">
        ${student.studyMethods.map(method => `
          <span class="method-badge">${STUDY_METHOD_LABELS[method]}</span>
        `).join('')}
      </div>
    </div>
    ` : ''}
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="number">${cycle.weeklyHours.toFixed(1)}h</div>
      <div class="label">Horas Semanais</div>
    </div>
    <div class="summary-card">
      <div class="number">${cycle.slots.length}</div>
      <div class="label">Sessões de Estudo</div>
    </div>
    <div class="summary-card">
      <div class="number">${subjects.length}</div>
      <div class="label">Disciplinas</div>
    </div>
  </div>

  <div class="section">
    <h2>📊 Distribuição por Disciplina</h2>
    <div class="distribution">
      ${subjects.map(subject => {
        const minutes = cycle.distribution[subject.id] || 0;
        const hours = (minutes / 60).toFixed(1);
        const percentage = cycle.totalMinutes > 0
          ? Math.round((minutes / cycle.totalMinutes) * 100)
          : 0;
        
        return `
          <div class="distribution-item">
            <div class="color-indicator" style="background-color: ${subject.color}"></div>
            <div style="flex: 1;">
              <div class="distribution-info">
                <span class="subject-name">${subject.name}</span>
                <span class="subject-time">${hours}h (${percentage}%)</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%; background-color: ${subject.color}"></div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  </div>

  <div class="section">
    <h2>📅 Cronograma Semanal</h2>
    <div class="schedule">
      ${[1, 2, 3, 4, 5, 6, 0].map(day => {
        const daySlots = weeklySchedule[day] || [];
        if (daySlots.length === 0) return '';
        
        return `
          <div class="day-schedule">
            <div class="day-header">${DAY_LABELS[day]}</div>
            <div class="time-slots">
              ${daySlots.map(slot => {
                const subject = subjects.find(s => s.id === slot.subjectId);
                return `
                  <div class="time-slot" style="border-left-color: ${subject?.color}">
                    <div class="time-slot-time">${slot.startTime} - ${slot.endTime}</div>
                    <div class="time-slot-content">
                      <div class="time-slot-subject">${slot.subjectName}</div>
                      ${slot.topics.length > 0 ? `
                        <div class="time-slot-topics">${slot.topics.join(', ')}</div>
                      ` : ''}
                    </div>
                    <div class="time-slot-duration">${slot.duration}min</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  </div>

  <div class="section">
    <div class="recommendations">
      <h3>💡 Recomendações Personalizadas</h3>
      <ul>
        ${cycle.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
  </div>

  <div class="footer">
    <p>Este plano foi gerado automaticamente pelo Study Cycle Wizard</p>
    <p>Lembre-se: consistência é mais importante que perfeição. Bons estudos!</p>
  </div>
</body>
</html>
  `;
}

/**
 * Gera e baixa o PDF do relatório
 */
export async function downloadReportPDF(
  student: Student,
  cycle: StudyCycleResult,
  subjects: Subject[]
): Promise<void> {
  const html = generateReportHTML(student, cycle, subjects);
  
  // Criar blob com o HTML
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  // Criar link temporário e fazer download
  const a = document.createElement('a');
  a.href = url;
  a.download = `plano-estudos-${student.fullName.replace(/\s+/g, '-').toLowerCase()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Nota: Para gerar PDF real, seria necessário usar uma biblioteca como jsPDF ou html2pdf
  // ou um serviço backend. Por enquanto, geramos HTML que pode ser impresso como PDF pelo navegador.
}
