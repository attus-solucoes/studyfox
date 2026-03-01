// ═══════════════════════════════════════════════════════
// STUDYOS — BANCO DE FÓRMULAS CURADO
// ═══════════════════════════════════════════════════════

export interface FormulaEntry {
  id: string;
  title: string;
  formula_latex: string;
  area: 'calculus' | 'mechanics' | 'fluids' | 'thermodynamics' | 'heat_transfer' | 'strength' | 'machines' | 'electrical';
  tags: string[];
  variables: { symbol: string; meaning: string; unit: string }[];
  when_to_use: string;
  semester: number;
  source?: string;
}

export const AREA_LABELS: Record<FormulaEntry['area'], string> = {
  calculus: 'Cálculo',
  mechanics: 'Mecânica',
  fluids: 'Fluidos',
  thermodynamics: 'Termodic',
  heat_transfer: 'Calor',
  strength: 'Resist',
  machines: 'Máquinas',
  electrical: 'Elétrica',
};

export const FORMULA_BANK: FormulaEntry[] = [
  // ─── TERMODINÂMICA ────────────────────────────────
  {
    id: 'thermo_cop_refrigeration',
    title: 'COP — Refrigeração',
    formula_latex: 'COP_R = \\frac{Q_L}{W_{ent}}',
    area: 'thermodynamics',
    tags: ['refrigeração', 'eficiência', 'COP'],
    variables: [
      { symbol: 'Q_L', meaning: 'Calor absorvido da fonte fria', unit: 'kW' },
      { symbol: 'W_{ent}', meaning: 'Trabalho do compressor', unit: 'kW' },
    ],
    when_to_use: 'Para calcular eficiência de sistemas de refrigeração e ar condicionado',
    semester: 6,
    source: 'Çengel, Termodinâmica, Cap. 6',
  },
  {
    id: 'thermo_first_law_cv',
    title: '1ª Lei — Volume de Controle',
    formula_latex: '\\dot{Q}_{vc} - \\dot{W}_{vc} = \\sum \\dot{m}_{out} h_{out} - \\sum \\dot{m}_{in} h_{in}',
    area: 'thermodynamics',
    tags: ['primeira lei', 'volume de controle', 'entalpia'],
    variables: [
      { symbol: '\\dot{Q}_{vc}', meaning: 'Taxa de transferência de calor', unit: 'kW' },
      { symbol: '\\dot{W}_{vc}', meaning: 'Potência (excl. fluxo)', unit: 'kW' },
      { symbol: '\\dot{m}', meaning: 'Vazão mássica', unit: 'kg/s' },
      { symbol: 'h', meaning: 'Entalpia específica', unit: 'kJ/kg' },
    ],
    when_to_use: 'Para análise de turbinas, compressores, caldeiras e trocadores de calor em regime permanente',
    semester: 5,
  },
  {
    id: 'thermo_carnot',
    title: 'Eficiência de Carnot',
    formula_latex: '\\eta_{Carnot} = 1 - \\frac{T_L}{T_H}',
    area: 'thermodynamics',
    tags: ['carnot', 'eficiência', 'ciclo'],
    variables: [
      { symbol: 'T_L', meaning: 'Temperatura da fonte fria', unit: 'K' },
      { symbol: 'T_H', meaning: 'Temperatura da fonte quente', unit: 'K' },
    ],
    when_to_use: 'Limite máximo teórico de eficiência. T deve estar em Kelvin.',
    semester: 5,
  },

  // ─── TRANSFERÊNCIA DE CALOR ───────────────────────
  {
    id: 'heat_fourier',
    title: 'Lei de Fourier (Condução)',
    formula_latex: 'q = -k A \\frac{dT}{dx}',
    area: 'heat_transfer',
    tags: ['condução', 'fourier', 'fluxo de calor'],
    variables: [
      { symbol: 'k', meaning: 'Condutividade térmica', unit: 'W/(m·K)' },
      { symbol: 'A', meaning: 'Área da seção transversal', unit: 'm²' },
      { symbol: 'dT/dx', meaning: 'Gradiente de temperatura', unit: 'K/m' },
    ],
    when_to_use: 'Condução de calor em regime permanente, parede plana',
    semester: 6,
    source: 'Incropera, Fundamentos de Transferência de Calor, Eq. 1.1',
  },
  {
    id: 'heat_newton',
    title: 'Lei de Newton (Convecção)',
    formula_latex: 'q = h A (T_s - T_\\infty)',
    area: 'heat_transfer',
    tags: ['convecção', 'newton', 'coeficiente convectivo'],
    variables: [
      { symbol: 'h', meaning: 'Coeficiente convectivo', unit: 'W/(m²·K)' },
      { symbol: 'A', meaning: 'Área de superfície', unit: 'm²' },
      { symbol: 'T_s', meaning: 'Temperatura da superfície', unit: 'K' },
      { symbol: 'T_\\infty', meaning: 'Temperatura do fluido distante', unit: 'K' },
    ],
    when_to_use: 'Convecção forçada ou natural em superfícies',
    semester: 6,
  },
  {
    id: 'heat_stefan',
    title: 'Lei de Stefan-Boltzmann (Radiação)',
    formula_latex: 'q = \\varepsilon \\sigma A T^4',
    area: 'heat_transfer',
    tags: ['radiação', 'stefan-boltzmann', 'emissividade'],
    variables: [
      { symbol: '\\varepsilon', meaning: 'Emissividade (0-1)', unit: '—' },
      { symbol: '\\sigma', meaning: 'Constante de Stefan-Boltzmann = 5.67×10⁻⁸', unit: 'W/(m²·K⁴)' },
      { symbol: 'T', meaning: 'Temperatura absoluta', unit: 'K' },
    ],
    when_to_use: 'Superfícies com troca de calor por radiação térmica',
    semester: 7,
  },

  // ─── MECÂNICA DOS FLUIDOS ─────────────────────────
  {
    id: 'fluid_bernoulli',
    title: 'Equação de Bernoulli',
    formula_latex: 'P + \\frac{1}{2}\\rho v^2 + \\rho g z = \\text{const}',
    area: 'fluids',
    tags: ['bernoulli', 'pressão', 'velocidade', 'escoamento'],
    variables: [
      { symbol: 'P', meaning: 'Pressão estática', unit: 'Pa' },
      { symbol: '\\rho', meaning: 'Massa específica do fluido', unit: 'kg/m³' },
      { symbol: 'v', meaning: 'Velocidade do escoamento', unit: 'm/s' },
      { symbol: 'g', meaning: 'Aceleração gravitacional', unit: 'm/s²' },
      { symbol: 'z', meaning: 'Altura em relação à referência', unit: 'm' },
    ],
    when_to_use: 'Escoamento invíscido, incompressível, permanente ao longo de uma linha de corrente',
    semester: 5,
  },
  {
    id: 'fluid_reynolds',
    title: 'Número de Reynolds',
    formula_latex: 'Re = \\frac{\\rho v D}{\\mu} = \\frac{v D}{\\nu}',
    area: 'fluids',
    tags: ['reynolds', 'turbulência', 'laminar', 'regime'],
    variables: [
      { symbol: '\\rho', meaning: 'Massa específica', unit: 'kg/m³' },
      { symbol: 'v', meaning: 'Velocidade', unit: 'm/s' },
      { symbol: 'D', meaning: 'Diâmetro característico', unit: 'm' },
      { symbol: '\\mu', meaning: 'Viscosidade dinâmica', unit: 'Pa·s' },
      { symbol: '\\nu', meaning: 'Viscosidade cinemática', unit: 'm²/s' },
    ],
    when_to_use: 'Re < 2300: laminar | Re > 4000: turbulento | 2300-4000: transição',
    semester: 5,
  },
  {
    id: 'fluid_darcy',
    title: 'Equação de Darcy-Weisbach',
    formula_latex: 'h_f = f \\frac{L}{D} \\frac{v^2}{2g}',
    area: 'fluids',
    tags: ['perda de carga', 'darcy', 'tubulação'],
    variables: [
      { symbol: 'f', meaning: 'Fator de atrito de Darcy (Moody)', unit: '—' },
      { symbol: 'L', meaning: 'Comprimento da tubulação', unit: 'm' },
      { symbol: 'D', meaning: 'Diâmetro interno', unit: 'm' },
      { symbol: 'v', meaning: 'Velocidade média', unit: 'm/s' },
    ],
    when_to_use: 'Cálculo de perda de carga em escoamento interno em tubos',
    semester: 5,
  },

  // ─── RESISTÊNCIA DOS MATERIAIS ────────────────────
  {
    id: 'strength_hooke',
    title: 'Lei de Hooke',
    formula_latex: '\\sigma = E \\varepsilon',
    area: 'strength',
    tags: ['hooke', 'tensão', 'deformação', 'módulo de elasticidade'],
    variables: [
      { symbol: '\\sigma', meaning: 'Tensão normal', unit: 'MPa' },
      { symbol: 'E', meaning: 'Módulo de Young (elasticidade)', unit: 'GPa' },
      { symbol: '\\varepsilon', meaning: 'Deformação específica', unit: '—' },
    ],
    when_to_use: 'Regime elástico linear, antes da deformação plástica (σ < σ_esc)',
    semester: 4,
  },
  {
    id: 'strength_flexion',
    title: 'Flexão Pura',
    formula_latex: '\\sigma = \\frac{M \\cdot y}{I}',
    area: 'strength',
    tags: ['flexão', 'momento fletor', 'viga'],
    variables: [
      { symbol: 'M', meaning: 'Momento fletor', unit: 'N·m' },
      { symbol: 'y', meaning: 'Distância da linha neutra', unit: 'm' },
      { symbol: 'I', meaning: 'Momento de inércia da seção', unit: 'm⁴' },
    ],
    when_to_use: 'Tensão em vigas submetidas a momento fletor',
    semester: 4,
  },

  // ─── MECÂNICA ─────────────────────────────────────
  {
    id: 'mechanics_newton2',
    title: '2ª Lei de Newton',
    formula_latex: '\\sum \\vec{F} = m \\vec{a}',
    area: 'mechanics',
    tags: ['newton', 'dinâmica', 'força', 'aceleração'],
    variables: [
      { symbol: '\\sum \\vec{F}', meaning: 'Resultante de forças', unit: 'N' },
      { symbol: 'm', meaning: 'Massa', unit: 'kg' },
      { symbol: '\\vec{a}', meaning: 'Aceleração', unit: 'm/s²' },
    ],
    when_to_use: 'Dinâmica de corpos rígidos em referencial inercial',
    semester: 1,
  },
  {
    id: 'mechanics_work_energy',
    title: 'Teorema Trabalho-Energia',
    formula_latex: 'T_1 + \\sum U_{1\\rightarrow 2} = T_2',
    area: 'mechanics',
    tags: ['trabalho', 'energia cinética', 'dinâmica'],
    variables: [
      { symbol: 'T', meaning: 'Energia cinética = ½mv²', unit: 'J' },
      { symbol: 'U', meaning: 'Trabalho das forças', unit: 'J' },
    ],
    when_to_use: 'Quando velocidade é a incógnita e não precisa de tempo',
    semester: 4,
  },
];
