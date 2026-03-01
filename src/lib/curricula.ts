// ═══════════════════════════════════════════════════════
// STUDYOS — TEMPLATES DE GRADE CURRICULAR
// ═══════════════════════════════════════════════════════

export interface CurriculaTemplate {
  id: string;
  name: string;
  institution: string;
  semesters: SemesterTemplate[];
}

export interface SemesterTemplate {
  number: number;
  subjects: SubjectTemplate[];
}

export interface SubjectTemplate {
  code: string;
  name: string;
  ch: number;
  type: 'teoria' | 'lab' | 'projeto';
}

export const UNIFEI_ENG_MECANICA: CurriculaTemplate = {
  id: 'unifei_eng_mecanica_2023',
  name: 'Engenharia Mecânica',
  institution: 'UNIFEI',
  semesters: [
    { number: 1, subjects: [
      { code: 'MAT00A', name: 'Cálculo A', ch: 64, type: 'teoria' },
      { code: 'QUI202', name: 'Química Geral', ch: 32, type: 'teoria' },
      { code: 'DES005', name: 'Desenho Técnico Básico', ch: 32, type: 'teoria' },
      { code: 'CCO016', name: 'Fundamentos de Programação', ch: 64, type: 'teoria' },
      { code: 'EME040', name: 'Introdução à Engenharia Mecânica', ch: 32, type: 'teoria' },
      { code: 'LET013', name: 'Escrita Acadêmico-Científica', ch: 32, type: 'teoria' },
    ]},
    { number: 2, subjects: [
      { code: 'MAT00B', name: 'Cálculo B', ch: 64, type: 'teoria' },
      { code: 'MAT00D', name: 'Equações Diferenciais A', ch: 64, type: 'teoria' },
      { code: 'FIS210', name: 'Física I', ch: 64, type: 'teoria' },
      { code: 'DES006', name: 'Desenho Técnico CAD', ch: 48, type: 'teoria' },
      { code: 'MCM006', name: 'Estruturas e Propriedades dos Materiais', ch: 32, type: 'teoria' },
    ]},
    { number: 3, subjects: [
      { code: 'MAT00C', name: 'Cálculo C', ch: 64, type: 'teoria' },
      { code: 'MAT00N', name: 'Cálculo Numérico', ch: 64, type: 'teoria' },
      { code: 'FIS310', name: 'Física II A', ch: 32, type: 'teoria' },
      { code: 'EME303', name: 'Mecânica Vetorial — Estática', ch: 64, type: 'teoria' },
      { code: 'MCM003T', name: 'Materiais para Construção Mecânica', ch: 64, type: 'teoria' },
    ]},
    { number: 4, subjects: [
      { code: 'MAT00E', name: 'Equações Diferenciais B', ch: 64, type: 'teoria' },
      { code: 'MAT013', name: 'Probabilidade e Estatística', ch: 64, type: 'teoria' },
      { code: 'FIS410', name: 'Física III', ch: 64, type: 'teoria' },
      { code: 'IEM404', name: 'Mecânica Vetorial — Dinâmica', ch: 64, type: 'teoria' },
      { code: 'EME405T', name: 'Resistência dos Materiais', ch: 64, type: 'teoria' },
      { code: 'EME703', name: 'Desenho de Máquinas', ch: 64, type: 'teoria' },
    ]},
    { number: 5, subjects: [
      { code: 'EME502T', name: 'Mecânica dos Fluidos I', ch: 64, type: 'teoria' },
      { code: 'EME503T', name: 'Termodinâmica I', ch: 64, type: 'teoria' },
      { code: 'EME505T', name: 'Resistência dos Materiais II', ch: 64, type: 'teoria' },
      { code: 'EME514', name: 'Vibrações Mecânicas I', ch: 48, type: 'teoria' },
      { code: 'EEB100', name: 'Eletricidade Básica I', ch: 48, type: 'teoria' },
      { code: 'FAB002', name: 'Tecnologia de Fabricação I', ch: 64, type: 'teoria' },
    ]},
    { number: 6, subjects: [
      { code: 'EME605T', name: 'Transferência de Calor I', ch: 48, type: 'teoria' },
      { code: 'EME606T', name: 'Termodinâmica II', ch: 48, type: 'teoria' },
      { code: 'IEM603T', name: 'Mecânica dos Fluidos II', ch: 64, type: 'teoria' },
      { code: 'EME614T', name: 'Fratura e Fadiga dos Materiais', ch: 32, type: 'teoria' },
      { code: 'EME618T', name: 'Vibrações Mecânicas II', ch: 48, type: 'teoria' },
      { code: 'EMA501', name: 'Métodos Numéricos em Engenharia', ch: 64, type: 'teoria' },
      { code: 'FAB003', name: 'Tecnologia de Fabricação II', ch: 64, type: 'teoria' },
    ]},
    { number: 7, subjects: [
      { code: 'EME701T', name: 'Transferência de Calor II', ch: 48, type: 'teoria' },
      { code: 'EME702T', name: 'Eletrônica e Instrumentação', ch: 32, type: 'teoria' },
      { code: 'EME704', name: 'Elementos de Máquinas I', ch: 64, type: 'teoria' },
      { code: 'EME706', name: 'Sistemas Térmicos I', ch: 64, type: 'teoria' },
      { code: 'EME707T', name: 'Sistemas Hidropneumáticos I', ch: 32, type: 'teoria' },
      { code: 'EME715T', name: 'Máquinas de Fluxo I', ch: 48, type: 'teoria' },
    ]},
    { number: 8, subjects: [
      { code: 'EME802', name: 'Elementos de Máquinas II', ch: 64, type: 'teoria' },
      { code: 'EME804', name: 'Sistemas Térmicos II', ch: 64, type: 'teoria' },
      { code: 'EME805T', name: 'Sistemas Hidropneumáticos II', ch: 48, type: 'teoria' },
      { code: 'EME813T', name: 'Máquinas de Fluxo II', ch: 32, type: 'teoria' },
      { code: 'EEN702', name: 'Tubulações Industriais', ch: 32, type: 'teoria' },
      { code: 'FAB005T', name: 'Tecnologia de Fabricação IV', ch: 32, type: 'teoria' },
    ]},
    { number: 9, subjects: [
      { code: 'EME905', name: 'Controle de Sistemas Mecânicos', ch: 48, type: 'teoria' },
      { code: 'EME910', name: 'Projeto de Máquinas', ch: 48, type: 'teoria' },
      { code: 'EME914', name: 'Manutenção Mecânica', ch: 48, type: 'teoria' },
      { code: 'FAB006', name: 'Automação da Manufatura', ch: 32, type: 'teoria' },
      { code: 'IEM907', name: 'Centrais Hidrelétricas', ch: 48, type: 'teoria' },
      { code: 'IEPG10', name: 'Engenharia Econômica', ch: 48, type: 'teoria' },
    ]},
    { number: 10, subjects: [
      { code: 'ESTEME2023', name: 'Estágio Supervisionado', ch: 175, type: 'projeto' },
      { code: 'TCC2EME2023', name: 'TCC II', ch: 72, type: 'projeto' },
    ]},
  ],
};

export const AVAILABLE_CURRICULA: CurriculaTemplate[] = [UNIFEI_ENG_MECANICA];

/**
 * Find a matching curriculum template based on course name and institution.
 */
export function findCurriculumMatch(courseName: string, institution: string): CurriculaTemplate | null {
  const name = courseName.toLowerCase().trim();
  const inst = institution.toLowerCase().trim();

  for (const tmpl of AVAILABLE_CURRICULA) {
    const nameMatch = tmpl.name.toLowerCase();
    const instMatch = tmpl.institution.toLowerCase();

    // Match if both name and institution contain the template's values (or vice versa)
    if (
      (name.includes(nameMatch) || nameMatch.includes(name)) &&
      (inst.includes(instMatch) || instMatch.includes(inst))
    ) {
      return tmpl;
    }
  }
  return null;
}
