export type RiskLevel = 'baixo' | 'moderado' | 'alto' | 'critico';
export type RiskStatus = 'pendente' | 'avaliacao' | 'validado' | 'resolvido' | 'rejeitado';
export type RoomType = 'sala' | 'laboratorio' | 'corredor' | 'banheiro' | 'area-tecnica' | 'secretaria' | 'auditorio' | 'deposito' | 'entrada';

export interface Risk {
  id: string;
  title: string;
  category: string;
  level: RiskLevel;
  status: RiskStatus;
  description: string;
  hazard: string;
  riskEvent: string;
  consequence: string;
  exposedPublic: string;
  circulation: string;
  severity: number;
  probability: number;
  riskScore: number;
  registeredAt: string;
  updatedAt: string;
  flags: string[];
  imageUrl?: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  type: RoomType;
  description?: string;
  activities?: string;
  exposureGroup?: string;
  risks: Risk[];
}

export interface Floor {
  id: string;
  name: string;
  rooms: Room[];
}

export interface Block {
  id: string;
  name: string;
  shortName: string;
  fullName: string;
  campus?: string;
  center?: string;
  unit?: string;
  description?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floors: Floor[];
}

function maxLevel(risks: Risk[]): RiskLevel | null {
  if (risks.length === 0) return null;
  const order: RiskLevel[] = ['critico', 'alto', 'moderado', 'baixo'];
  for (const l of order) {
    if (risks.some(r => r.level === l)) return l;
  }
  return null;
}

function countLevel(risks: Risk[], level: RiskLevel) {
  return risks.filter(r => r.level === level).length;
}

export function getBlockStats(block: Block) {
  const allRisks = block.floors.flatMap(f => f.rooms.flatMap(r => r.risks));
  const active = allRisks.filter(r => r.status !== 'resolvido' && r.status !== 'rejeitado');
  return {
    total: active.length,
    critical: countLevel(active, 'critico'),
    high: countLevel(active, 'alto'),
    moderate: countLevel(active, 'moderado'),
    low: countLevel(active, 'baixo'),
    maxLevel: maxLevel(active),
    floors: block.floors.length,
    rooms: block.floors.flatMap(f => f.rooms).length,
  };
}

export function getRoomStats(room: Room) {
  const active = room.risks.filter(r => r.status !== 'resolvido' && r.status !== 'rejeitado');
  return {
    total: active.length,
    critical: countLevel(active, 'critico'),
    high: countLevel(active, 'alto'),
    moderate: countLevel(active, 'moderado'),
    low: countLevel(active, 'baixo'),
    maxLevel: maxLevel(active),
    lastUpdate: active[0]?.updatedAt ?? null,
  };
}

export const CAMPUS_DATA: Block[] = [
  {
    id: 'caa',
    name: 'Bloco CAA',
    shortName: 'CAA',
    fullName: 'Centro de Atividades Acadêmicas',
    x: 58, y: 28, width: 14, height: 10,
    floors: [
      {
        id: 'caa-terreo',
        name: 'Térreo',
        rooms: [
          {
            id: 'caa-t-entrada', code: 'CAA Entrada', name: 'Entrada Principal', type: 'entrada',
            risks: [
              {
                id: 'r001', title: 'Piso escorregadio no acesso', category: 'Quedas e circulação',
                level: 'alto', status: 'validado',
                description: 'Piso de granito sem antiderrapante na entrada principal, com histórico de acidentes em dias chuvosos.',
                hazard: 'Superfície escorregadia sem sinalização adequada',
                riskEvent: 'Queda por escorregamento',
                consequence: 'Fratura, contusão, afastamento',
                exposedPublic: 'Toda a comunidade acadêmica e visitantes',
                circulation: 'Alta — acesso principal do bloco',
                severity: 4, probability: 4, riskScore: 16,
                registeredAt: '2025-08-12', updatedAt: '2025-09-10',
                flags: ['Urgência', 'Recorrência', 'Exposição coletiva'],
                imageUrl: undefined,
              },
              {
                id: 'r002', title: 'Rampa sem corrimão adequado', category: 'Acessibilidade',
                level: 'moderado', status: 'avaliacao',
                description: 'Rampa de acesso para PCD com inclinação fora do padrão NBR 9050 e corrimão em apenas um lado.',
                hazard: 'Inclinação irregular e suporte insuficiente',
                riskEvent: 'Queda ou dificuldade de acesso para PCD',
                consequence: 'Limitação de acesso, queda com lesão',
                exposedPublic: 'Pessoas com deficiência e mobilidade reduzida',
                circulation: 'Moderada',
                severity: 3, probability: 3, riskScore: 9,
                registeredAt: '2025-09-01', updatedAt: '2025-09-05',
                flags: ['Acessibilidade', 'Avaliação técnica'],
              },
            ],
          },
          {
            id: 'caa-t-secr', code: 'CAA Secretaria', name: 'Secretaria Acadêmica', type: 'secretaria',
            risks: [],
          },
          {
            id: 'caa-t-ban', code: 'CAA BM', name: 'Banheiro Masculino', type: 'banheiro',
            risks: [
              {
                id: 'r003', title: 'Fiação exposta próximo ao lavatório', category: 'Eletricidade',
                level: 'baixo', status: 'pendente',
                description: 'Fio de iluminação com isolamento parcialmente danificado visível acima do lavatório.',
                hazard: 'Fio com isolamento danificado',
                riskEvent: 'Choque elétrico por contato acidental',
                consequence: 'Choque elétrico leve',
                exposedPublic: 'Usuários do banheiro',
                circulation: 'Moderada',
                severity: 2, probability: 2, riskScore: 4,
                registeredAt: '2025-09-15', updatedAt: '2025-09-15',
                flags: [],
              },
            ],
          },
        ],
      },
      {
        id: 'caa-1',
        name: '1º Andar',
        rooms: [
          {
            id: 'caa-101', code: 'CAA 101', name: 'Sala de aula', type: 'sala',
            risks: [
              {
                id: 'r004', title: 'Infiltração no forro com risco de desabamento', category: 'Estrutura e infraestrutura',
                level: 'alto', status: 'validado',
                description: 'Mancha de umidade extensa no forro de gesso com abaulamento visível, indicando acúmulo de água.',
                hazard: 'Forro de gesso com infiltração e peso acumulado',
                riskEvent: 'Desabamento parcial do forro',
                consequence: 'Lesão por impacto, interrupção de aulas',
                exposedPublic: 'Docentes e discentes',
                circulation: 'Alta — sala com 40 estudantes',
                severity: 4, probability: 3, riskScore: 12,
                registeredAt: '2025-07-20', updatedAt: '2025-09-08',
                flags: ['Urgência', 'Exposição coletiva', 'Avaliação técnica'],
              },
              {
                id: 'r005', title: 'Tomada danificada junto ao quadro', category: 'Eletricidade',
                level: 'moderado', status: 'avaliacao',
                description: 'Tomada de 10A com placa quebrada expondo contatos internos, localizada junto ao quadro branco.',
                hazard: 'Contatos elétricos expostos',
                riskEvent: 'Choque elétrico ao manusear',
                consequence: 'Choque elétrico moderado',
                exposedPublic: 'Docentes',
                circulation: 'Baixa',
                severity: 3, probability: 2, riskScore: 6,
                registeredAt: '2025-08-30', updatedAt: '2025-09-02',
                flags: [],
              },
            ],
          },
          {
            id: 'caa-102', code: 'CAA 102', name: 'Sala de aula', type: 'sala',
            risks: [],
          },
          {
            id: 'caa-103', code: 'CAA 103', name: 'Laboratório de Informática', type: 'laboratorio',
            risks: [
              {
                id: 'r006', title: 'Cabos de rede sem organização no piso', category: 'Quedas e circulação',
                level: 'alto', status: 'pendente',
                description: 'Cabos de rede e energia passam pelo piso sem canaleta, criando risco de tropeço entre as estações.',
                hazard: 'Cabos no piso sem proteção',
                riskEvent: 'Tropeço e queda',
                consequence: 'Contusão, fratura, dano a equipamentos',
                exposedPublic: 'Discentes e servidores técnicos',
                circulation: 'Alta',
                severity: 3, probability: 4, riskScore: 12,
                registeredAt: '2025-09-03', updatedAt: '2025-09-03',
                flags: ['Recorrência', 'Avaliação técnica'],
              },
            ],
          },
        ],
      },
      {
        id: 'caa-2',
        name: '2º Andar',
        rooms: [
          {
            id: 'caa-201', code: 'CAA 201', name: 'Sala de aula', type: 'sala',
            risks: [],
          },
          {
            id: 'caa-202', code: 'CAA 202', name: 'Sala de reunião', type: 'sala',
            risks: [
              {
                id: 'r007', title: 'Janela com vidro trincado', category: 'Estrutura e infraestrutura',
                level: 'moderado', status: 'validado',
                description: 'Vidro de janela com trinca diagonal de 40 cm, risco de ruptura espontânea.',
                hazard: 'Vidro com trinca estrutural',
                riskEvent: 'Ruptura e projeção de fragmentos',
                consequence: 'Corte, lesão ocular',
                exposedPublic: 'Servidores e visitantes',
                circulation: 'Baixa',
                severity: 3, probability: 2, riskScore: 6,
                registeredAt: '2025-08-15', updatedAt: '2025-09-01',
                flags: [],
              },
            ],
          },
          {
            id: 'caa-203', code: 'CAA 203', name: 'Sala de aula', type: 'sala',
            risks: [
              {
                id: 'r008', title: 'Piso irregular próximo à entrada', category: 'Quedas e circulação',
                level: 'alto', status: 'validado',
                description: 'Desnível de aproximadamente 2 cm entre placas de piso cerâmico na entrada da sala, sem sinalização.',
                hazard: 'Desnível no piso sem sinalização',
                riskEvent: 'Tropeço e queda',
                consequence: 'Contusão, fratura de tornozelo ou punho',
                exposedPublic: 'Toda a comunidade acadêmica',
                circulation: 'Alta — sala com 45 estudantes',
                severity: 3, probability: 4, riskScore: 12,
                registeredAt: '2025-09-10', updatedAt: '2025-09-12',
                flags: ['Recorrência', 'Exposição coletiva'],
              },
              {
                id: 'r009', title: 'Tomada danificada', category: 'Eletricidade',
                level: 'moderado', status: 'avaliacao',
                description: 'Tomada com placa quebrada e contatos parcialmente expostos.',
                hazard: 'Contatos elétricos acessíveis',
                riskEvent: 'Choque elétrico',
                consequence: 'Choque leve a moderado',
                exposedPublic: 'Discentes e docentes',
                circulation: 'Moderada',
                severity: 3, probability: 2, riskScore: 6,
                registeredAt: '2025-09-11', updatedAt: '2025-09-11',
                flags: [],
              },
              {
                id: 'r010', title: 'Extintor com prazo de validade vencido', category: 'Incêndio e emergência',
                level: 'moderado', status: 'pendente',
                description: 'Extintor ABC afixado na parede com carga vencida há 3 meses, sem recarga ou substituição.',
                hazard: 'Extintor inoperante em caso de incêndio',
                riskEvent: 'Ineficácia no combate a incêndio inicial',
                consequence: 'Propagação de incêndio, danos materiais e humanos',
                exposedPublic: 'Toda a comunidade do andar',
                circulation: 'Alta',
                severity: 4, probability: 2, riskScore: 8,
                registeredAt: '2025-09-14', updatedAt: '2025-09-14',
                flags: ['Urgência'],
              },
            ],
          },
          {
            id: 'caa-204', code: 'CAA 204', name: 'Área Técnica / Elétrica', type: 'area-tecnica',
            risks: [
              {
                id: 'r011', title: 'Quadro elétrico sem proteção adequada', category: 'Eletricidade',
                level: 'critico', status: 'validado',
                description: 'Quadro de distribuição elétrica sem tampa, com barramentos expostos, sem sinalização de perigo e sem travas de segurança.',
                hazard: 'Barramentos energizados expostos',
                riskEvent: 'Choque elétrico de alta tensão ou arco elétrico',
                consequence: 'Morte, queimadura grave, incêndio',
                exposedPublic: 'Técnicos de manutenção e qualquer servidor com acesso ao local',
                circulation: 'Baixa — área técnica',
                severity: 5, probability: 4, riskScore: 20,
                registeredAt: '2025-08-28', updatedAt: '2025-09-09',
                flags: ['Urgência', 'Avaliação técnica', 'Exposição coletiva'],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'cct',
    name: 'Bloco CCT',
    shortName: 'CCT',
    fullName: 'Centro de Ciências e Tecnologia',
    x: 36, y: 44, width: 16, height: 12,
    floors: [
      {
        id: 'cct-terreo', name: 'Térreo',
        rooms: [
          {
            id: 'cct-t-lab1', code: 'CCT Lab 01', name: 'Laboratório de Física', type: 'laboratorio',
            risks: [
              {
                id: 'r012', title: 'Gás comprimido sem fixação adequada', category: 'Químico e gases',
                level: 'alto', status: 'validado',
                description: 'Cilindro de nitrogênio sem corrente de fixação à parede, risco de tombamento.',
                hazard: 'Cilindro de gás pressurizado sem ancoragem',
                riskEvent: 'Tombamento e vazamento ou projetil',
                consequence: 'Lesão grave, asfixia, explosão',
                exposedPublic: 'Discentes e docentes do laboratório',
                circulation: 'Moderada',
                severity: 5, probability: 2, riskScore: 10,
                registeredAt: '2025-07-15', updatedAt: '2025-09-01',
                flags: ['Urgência', 'Avaliação técnica'],
              },
            ],
          },
          {
            id: 'cct-t-corr', code: 'CCT Corredor', name: 'Corredor Principal', type: 'corredor',
            risks: [
              {
                id: 'r013', title: 'Iluminação insuficiente no corredor', category: 'Ergonomia e iluminação',
                level: 'baixo', status: 'pendente',
                description: 'Três luminárias com lâmpadas queimadas no corredor do térreo, causando zona de sombra.',
                hazard: 'Iluminação abaixo do padrão mínimo',
                riskEvent: 'Queda por falta de visibilidade',
                consequence: 'Contusão',
                exposedPublic: 'Toda a comunidade do bloco',
                circulation: 'Alta',
                severity: 2, probability: 2, riskScore: 4,
                registeredAt: '2025-09-18', updatedAt: '2025-09-18',
                flags: [],
              },
            ],
          },
        ],
      },
      {
        id: 'cct-1', name: '1º Andar',
        rooms: [
          {
            id: 'cct-101', code: 'CCT 101', name: 'Sala de aula', type: 'sala',
            risks: [],
          },
          {
            id: 'cct-102', code: 'CCT 102', name: 'Sala de aula', type: 'sala',
            risks: [],
          },
        ],
      },
    ],
  },
  {
    id: 'ceei',
    name: 'Bloco CEEI',
    shortName: 'CEEI',
    fullName: 'Centro de Eng. Elétrica e Informática',
    x: 18, y: 36, width: 14, height: 11,
    floors: [
      {
        id: 'ceei-terreo', name: 'Térreo',
        rooms: [
          {
            id: 'ceei-lab1', code: 'CEEI Lab 01', name: 'Laboratório de Eletrônica', type: 'laboratorio',
            risks: [
              {
                id: 'r014', title: 'Bancadas sem aterramento adequado', category: 'Eletricidade',
                level: 'alto', status: 'avaliacao',
                description: 'Bancadas de trabalho do laboratório sem ponto de aterramento, risco ao manusear circuitos energizados.',
                hazard: 'Ausência de aterramento nas bancadas',
                riskEvent: 'Choque elétrico durante experimentos',
                consequence: 'Choque, queimadura, parada cardíaca',
                exposedPublic: 'Discentes e pesquisadores',
                circulation: 'Alta',
                severity: 4, probability: 3, riskScore: 12,
                registeredAt: '2025-08-20', updatedAt: '2025-09-05',
                flags: ['Avaliação técnica', 'Urgência'],
              },
            ],
          },
        ],
      },
      {
        id: 'ceei-1', name: '1º Andar',
        rooms: [
          { id: 'ceei-101', code: 'CEEI 101', name: 'Sala de aula', type: 'sala', risks: [] },
          { id: 'ceei-102', code: 'CEEI 102', name: 'Sala de projetos', type: 'sala', risks: [] },
        ],
      },
    ],
  },
  {
    id: 'biblioteca',
    name: 'Biblioteca Central',
    shortName: 'BCx',
    fullName: 'Biblioteca Central da UFCG',
    x: 26, y: 18, width: 18, height: 9,
    floors: [
      {
        id: 'bib-terreo', name: 'Térreo',
        rooms: [
          {
            id: 'bib-acervo', code: 'BCx Acervo', name: 'Acervo Geral', type: 'sala',
            risks: [
              {
                id: 'r015', title: 'Estantes superlotadas com risco de tombamento', category: 'Estrutura e infraestrutura',
                level: 'moderado', status: 'pendente',
                description: 'Estantes metálicas com excesso de livros e sem travas de piso, risco de tombamento em cadeia.',
                hazard: 'Estantes instáveis e sobrepeso',
                riskEvent: 'Tombamento de estante',
                consequence: 'Lesão por esmagamento',
                exposedPublic: 'Usuários e servidores da biblioteca',
                circulation: 'Alta',
                severity: 4, probability: 2, riskScore: 8,
                registeredAt: '2025-09-16', updatedAt: '2025-09-16',
                flags: ['Exposição coletiva'],
              },
            ],
          },
          { id: 'bib-recep', code: 'BCx Recepção', name: 'Recepção e Atendimento', type: 'secretaria', risks: [] },
        ],
      },
      {
        id: 'bib-1', name: '1º Andar',
        rooms: [
          { id: 'bib-estudo', code: 'BCx Estudo', name: 'Sala de Estudo Individual', type: 'sala', risks: [] },
        ],
      },
    ],
  },
  {
    id: 'reitoria',
    name: 'Reitoria',
    shortName: 'REIT',
    fullName: 'Reitoria e Pró-Reitorias',
    x: 48, y: 16, width: 12, height: 9,
    floors: [
      {
        id: 'reit-terreo', name: 'Térreo',
        rooms: [
          { id: 'reit-recep', code: 'REIT Recepção', name: 'Recepção', type: 'secretaria', risks: [] },
          { id: 'reit-proreit', code: 'REIT Pró-Reitoria', name: 'Pró-Reitorias', type: 'secretaria', risks: [] },
        ],
      },
    ],
  },
  {
    id: 'restaurante',
    name: 'Restaurante Universitário',
    shortName: 'RU',
    fullName: 'Restaurante Universitário',
    x: 22, y: 60, width: 14, height: 9,
    floors: [
      {
        id: 'ru-terreo', name: 'Térreo',
        rooms: [
          {
            id: 'ru-cozinha', code: 'RU Cozinha', name: 'Cozinha Industrial', type: 'area-tecnica',
            risks: [
              {
                id: 'r016', title: 'Piso úmido sem antiderrapante na cozinha', category: 'Quedas e circulação',
                level: 'moderado', status: 'pendente',
                description: 'Piso da cozinha industrial constantemente úmido sem revestimento antiderrapante adequado.',
                hazard: 'Superfície molhada em ambiente de trabalho',
                riskEvent: 'Queda por escorregamento',
                consequence: 'Fratura, contusão, afastamento de servidor',
                exposedPublic: 'Servidores da cozinha',
                circulation: 'Alta',
                severity: 3, probability: 4, riskScore: 12,
                registeredAt: '2025-09-12', updatedAt: '2025-09-12',
                flags: ['Recorrência'],
              },
            ],
          },
          { id: 'ru-refeitorio', code: 'RU Refeitório', name: 'Refeitório', type: 'sala', risks: [] },
        ],
      },
    ],
  },
  {
    id: 'cw2',
    name: 'Bloco CW2',
    shortName: 'CW2',
    fullName: 'Central de laboratórios Professor Shiva Prasad',
    campus: 'Campina Grande',
    center: 'CCT',
    unit: 'UAEQ',
    description: 'Bloco da Central de laboratórios Professor Shiva Prasad, vinculado ao setor CCT/UAEQ no campus Campina Grande. A base inicial registra neste prédio o Laboratório de Química Analítica no segundo pavimento.',
    x: 64, y: 32, width: 12, height: 9,
    floors: [
      {
        id: 'cw2-terreo',
        name: 'Térreo',
        rooms: [],
      },
      {
        id: 'cw2-1',
        name: '1º Pavimento',
        rooms: [],
      },
      {
        id: 'cw2-2',
        name: '2º Pavimento',
        rooms: [
          {
            id: 'cw2-lab-quimica-analitica',
            code: 'CW2 Lab Química Analítica',
            name: 'Laboratório de Química Analítica - CW2',
            type: 'laboratorio',
            activities: 'Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.',
            exposureGroup: 'Alunos e servidores',
            description: 'Laboratório no segundo pavimento do Bloco CW2, com bancadas, capela exaustora, estufas, forno mufla, vidrarias, botijão de gás, bomba a vácuo e equipamentos de análise. A planilha registra teto com partes de salitre.',
            risks: [
              {
                id: 'xlsx-r001',
                title: 'Substâncias compostas e produtos químicos em geral',
                category: 'Químicos',
                level: 'moderado',
                status: 'pendente',
                description: 'Risco químico associado a atividades de ensino e pesquisa com preparo de soluções químicas diversas.',
                hazard: 'Substâncias compostas e produtos químicos em geral',
                riskEvent: 'Exposição a agentes químicos',
                consequence: 'Intoxicação, dores de cabeça, vertigem',
                exposedPublic: 'Alunos e servidores',
                circulation: 'Laboratório de ensino e pesquisa',
                severity: 2, probability: 3, riskScore: 6,
                registeredAt: '2026-09-22', updatedAt: '2026-09-22',
                flags: ['Importado da planilha'],
                imageUrl: '20230503_111119.jpg',
              },
              {
                id: 'xlsx-r002',
                title: 'Exigência de postura inadequada',
                category: 'Ergonômicos',
                level: 'moderado',
                status: 'pendente',
                description: 'Risco ergonômico associado à exigência de postura inadequada no laboratório.',
                hazard: 'Exigência de postura inadequada',
                riskEvent: 'Sobrecarga postural',
                consequence: 'Desconforto, fadiga ou lesão musculoesquelética',
                exposedPublic: 'Alunos e servidores',
                circulation: 'Laboratório de ensino e pesquisa',
                severity: 2, probability: 4, riskScore: 6,
                registeredAt: '2026-09-22', updatedAt: '2026-09-22',
                flags: ['Importado da planilha'],
                imageUrl: '20230503_111119.jpg',
              },
              {
                id: 'xlsx-r003',
                title: 'Manipulação de produtos químicos',
                category: 'Acidentes',
                level: 'alto',
                status: 'pendente',
                description: 'Risco de acidente durante manipulação de produtos químicos.',
                hazard: 'Manipulação de produtos químicos',
                riskEvent: 'Contato acidental com produto químico',
                consequence: 'Queimaduras',
                exposedPublic: 'Alunos e servidores',
                circulation: 'Laboratório de ensino e pesquisa',
                severity: 3, probability: 5, riskScore: 15,
                registeredAt: '2026-09-22', updatedAt: '2026-09-22',
                flags: ['Importado da planilha'],
                imageUrl: '20230503_111119.jpg',
              },
              {
                id: 'xlsx-r004',
                title: 'Manuseio de vidrarias',
                category: 'Acidentes',
                level: 'moderado',
                status: 'pendente',
                description: 'Risco de acidente no manuseio de vidrarias do laboratório.',
                hazard: 'Manuseio de vidrarias',
                riskEvent: 'Quebra de vidraria durante uso',
                consequence: 'Cortes e ferimentos nas mãos',
                exposedPublic: 'Alunos e servidores',
                circulation: 'Laboratório de ensino e pesquisa',
                severity: 2, probability: 4, riskScore: 8,
                registeredAt: '2026-09-22', updatedAt: '2026-09-22',
                flags: ['Importado da planilha'],
                imageUrl: '20230503_111119.jpg',
              },
              {
                id: 'xlsx-r005',
                title: 'Contato com superfícies quentes',
                category: 'Acidentes',
                level: 'moderado',
                status: 'pendente',
                description: 'Risco de queimadura por contato com superfícies quentes em equipamentos de laboratório.',
                hazard: 'Contato com superfícies quentes',
                riskEvent: 'Contato acidental com superfície aquecida',
                consequence: 'Queimaduras',
                exposedPublic: 'Alunos e servidores',
                circulation: 'Laboratório de ensino e pesquisa',
                severity: 3, probability: 3, riskScore: 9,
                registeredAt: '2026-09-22', updatedAt: '2026-09-22',
                flags: ['Importado da planilha'],
                imageUrl: '20230503_111119.jpg',
              },
              {
                id: 'xlsx-r006',
                title: 'Sobrecarga elétrica',
                category: 'Acidentes',
                level: 'alto',
                status: 'pendente',
                description: 'Risco de acidente associado à sobrecarga elétrica no laboratório.',
                hazard: 'Sobrecarga elétrica',
                riskEvent: 'Falha elétrica, curto-circuito ou princípio de incêndio',
                consequence: 'Choque elétrico, incêndios',
                exposedPublic: 'Alunos e servidores',
                circulation: 'Laboratório de ensino e pesquisa',
                severity: 5, probability: 3, riskScore: 15,
                registeredAt: '2026-09-22', updatedAt: '2026-09-22',
                flags: ['Importado da planilha'],
                imageUrl: '20230503_111119.jpg',
              },
              {
                id: 'xlsx-r007',
                title: 'Botijão de gás (vazamento/fogo)',
                category: 'Acidentes',
                level: 'alto',
                status: 'pendente',
                description: 'Risco de acidente associado a botijão de gás no laboratório.',
                hazard: 'Botijão de gás (vazamento/fogo)',
                riskEvent: 'Vazamento, fogo ou explosão',
                consequence: 'Incêndios e explosões',
                exposedPublic: 'Alunos e servidores',
                circulation: 'Laboratório de ensino e pesquisa',
                severity: 5, probability: 3, riskScore: 15,
                registeredAt: '2026-09-22', updatedAt: '2026-09-22',
                flags: ['Importado da planilha'],
                imageUrl: '20230503_111119.jpg',
              },
              {
                id: 'xlsx-r008',
                title: 'Teto com salitre (queda de reboco)',
                category: 'Acidentes',
                level: 'moderado',
                status: 'pendente',
                description: 'Risco de desprendimento de revestimento do teto observado no laboratório.',
                hazard: 'Teto com salitre (queda de reboco)',
                riskEvent: 'Queda de reboco ou revestimento do teto',
                consequence: 'Desabamento de revestimento do teto, lesões na cabeça, danos em equipamentos',
                exposedPublic: 'Alunos e servidores',
                circulation: 'Laboratório de ensino e pesquisa',
                severity: 2, probability: 3, riskScore: 6,
                registeredAt: '2026-09-22', updatedAt: '2026-09-22',
                flags: ['Importado da planilha'],
                imageUrl: '20230503_111119.jpg',
              },
            ],
          },
        ],
      },
    ],
  },
];

export const ALL_RISKS: Risk[] = CAMPUS_DATA.flatMap(b =>
  b.floors.flatMap(f => f.rooms.flatMap(r => r.risks))
);
