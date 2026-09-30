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
  coordinates?: [number, number] | null;
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
  coordinates?: [number, number] | null;
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
    "id": "bloco-cw2",
    "name": "Bloco CW2",
    "shortName": "CW2",
    "fullName": "Central de laboratórios Professor Shiva Prasad",
    "campus": "Campina Grande",
    "center": "CCT",
    "unit": "UAEQ",
    "description": "Edificação de 3 (três) pavimentos: No pavimento térreo, encontra-se: auditório, secretaria, sala de monitoria, 2 salas de aulas e cantina (no momento da vistoria encontrava-se desativada).\nNo segundo pavimento, situam-se: Laboratório de química analítica, laboratório de química geral 1, laboratório de química geral 2, laboratório de química orgânica, 2 salas destinadas ao programa de tutoria (PET) e cantina (encontrando-se fechada).\nNo terceiro pavimento, encontram-se: 1 sala desocupada, depósito (LEMAS), 2 salas de almoxarifado, 2 salas multimídias, laboratório de engenharia química I, laboratório de engenharia química III e IV.",
    "coordinates": [
      -7.21297969766558,
      -35.90613289321617
    ],
    "x": 0,
    "y": 0,
    "width": 12,
    "height": 9,
    "floors": [
      {
        "id": "bloco-cw2-0",
        "name": "Térreo",
        "rooms": []
      },
      {
        "id": "bloco-cw2-1",
        "name": "1º Pavimento",
        "rooms": []
      },
      {
        "id": "bloco-cw2-2",
        "name": "2º Pavimento",
        "rooms": [
          {
            "id": "bloco-cw2-laboratorio-de-quimica-analitica-cw2",
            "code": "Laboratório de Química Analítica - CW2",
            "name": "Laboratório de Química Analítica - CW2",
            "type": "laboratorio",
            "coordinates": [
              -7.21297969766558,
              -35.90613289321617
            ],
            "description": "Localizado no segundo pavimento do bloco CW2, do Centro de Ciência e Tecnologia, campus Campina Grande, o laboratório é construído em estrutura de concreto armado, com área aproximada 4,8x7,5m² e altura de 3m, possui ventilação natural por janelas e artificial por ar condicionado, iluminação natural e artificial, paredes em cerâmica e parte emassada, piso em cerâmica, teto em laje e gesso e instalações elétricas embutidas.  Apresentam boas condições de piso, parede e das instalações elétricas. Teto apresentando partes salitres.\nAmbiente composto por Bancada em mármore, Cadeiras/bancos, Agitadores magnéticos, capela exaustora, Estufas de Secagem e esterilização, Forno mufla, Vidrarias, Botijão de gás, Bomba a vacuo, deionizador, fotômetro de chamas, destilador, extrator de óleos e graxas, centrifugador, medidor de umidade, phmetro e condutivímetro, medidor de umidade\nPossui uma sala de balanças anexa medindo 1,9x3,8m² com altura de 3,0m, contendo armário para guarda de reagentes, phmetro e, Condutivímetro.",
            "activities": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
            "exposureGroup": "Alunos e servidores",
            "risks": [
              {
                "id": "xlsx-r001",
                "title": "Substâncias compostas e produtos químicos em geral",
                "category": "Químicos",
                "level": "moderado",
                "status": "pendente",
                "description": "Risco químicos importado da planilha para este ambiente.",
                "hazard": "Substâncias compostas e produtos químicos em geral",
                "riskEvent": "Substâncias compostas e produtos químicos em geral",
                "consequence": "Intoxicação, dores de cabeça, vertigem",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 2,
                "probability": 3,
                "riskScore": 6,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha"
                ],
                "imageUrl": "20230503_111119.jpg"
              },
              {
                "id": "xlsx-r002",
                "title": "Exigência de postura inadequada",
                "category": "Ergonômicos",
                "level": "moderado",
                "status": "pendente",
                "description": "Risco ergonômicos importado da planilha para este ambiente.",
                "hazard": "Exigência de postura inadequada",
                "riskEvent": "Exigência de postura inadequada",
                "consequence": "Não informado na planilha.",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 2,
                "probability": 4,
                "riskScore": 6,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha"
                ],
                "imageUrl": "20230503_111119.jpg"
              },
              {
                "id": "xlsx-r003",
                "title": "Manipulação de produtos químicos",
                "category": "Acidentes",
                "level": "alto",
                "status": "pendente",
                "description": "Risco acidentes importado da planilha para este ambiente.",
                "hazard": "Manipulação de produtos químicos",
                "riskEvent": "Manipulação de produtos químicos",
                "consequence": "Queimaduras",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 3,
                "probability": 5,
                "riskScore": 15,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha"
                ],
                "imageUrl": "20230503_111119.jpg"
              },
              {
                "id": "xlsx-r004",
                "title": "Manuseio de vidrarias",
                "category": "Acidentes",
                "level": "moderado",
                "status": "pendente",
                "description": "Risco acidentes importado da planilha para este ambiente.",
                "hazard": "Manuseio de vidrarias",
                "riskEvent": "Manuseio de vidrarias",
                "consequence": "Cortes e ferimentos nas mãos",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 2,
                "probability": 4,
                "riskScore": 8,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha"
                ],
                "imageUrl": "20230503_111119.jpg"
              },
              {
                "id": "xlsx-r005",
                "title": "Contato com superfícies quentes",
                "category": "Acidentes",
                "level": "moderado",
                "status": "pendente",
                "description": "Risco acidentes importado da planilha para este ambiente.",
                "hazard": "Contato com superfícies quentes",
                "riskEvent": "Contato com superfícies quentes",
                "consequence": "Queimaduras",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 3,
                "probability": 3,
                "riskScore": 9,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha"
                ],
                "imageUrl": "20230503_111119.jpg"
              },
              {
                "id": "xlsx-r006",
                "title": "Sobrecarga elétrica",
                "category": "Acidentes",
                "level": "alto",
                "status": "pendente",
                "description": "Risco acidentes importado da planilha para este ambiente.",
                "hazard": "Sobrecarga elétrica",
                "riskEvent": "Sobrecarga elétrica",
                "consequence": "Choque elétrico, incêndios",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 5,
                "probability": 3,
                "riskScore": 15,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha"
                ],
                "imageUrl": "20230503_111119.jpg"
              },
              {
                "id": "xlsx-r007",
                "title": "Botijão de gás (vazamento/fogo)",
                "category": "Acidentes",
                "level": "alto",
                "status": "pendente",
                "description": "Risco acidentes importado da planilha para este ambiente.",
                "hazard": "Botijão de gás (vazamento/fogo)",
                "riskEvent": "Botijão de gás (vazamento/fogo)",
                "consequence": "Incêndios e explosões",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 5,
                "probability": 3,
                "riskScore": 15,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha"
                ],
                "imageUrl": "20230503_111119.jpg"
              },
              {
                "id": "xlsx-r008",
                "title": "Teto com salitre (queda de reboco)",
                "category": "Acidentes",
                "level": "moderado",
                "status": "pendente",
                "description": "Risco acidentes importado da planilha para este ambiente.",
                "hazard": "Teto com salitre (queda de reboco)",
                "riskEvent": "Teto com salitre (queda de reboco)",
                "consequence": "Desabamento de revestimento do teto, lesões na cabeça, danos em equipamentos",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 2,
                "probability": 3,
                "riskScore": 6,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha"
                ],
                "imageUrl": "20230503_111119.jpg"
              }
            ]
          },
          {
            "id": "bloco-cw2-laboratorio-de-quimica-geral-i-central-de-lab-cw2",
            "code": "Laboratório de Química Geral I - Central de lab CW2",
            "name": "Laboratório de Química Geral I - Central de lab CW2",
            "type": "laboratorio",
            "coordinates": [
              -7.212981279895367,
              -35.90618711814652
            ],
            "description": "Localizado no segundo pavimento do bloco CW2, do Centro de Ciência e Tecnologia, campus Campina Grande, o laboratório é construído em estrutura de concreto armado, com área aproximada 4,8x7,9m² e altura de 3m, possui ventilação natural por janelas e artificial por ar condicionado, iluminação natural e artificial, paredes em cerâmica e parte emassadas, piso em granilito, teto em laje e instalações elétricas embutidas. Apresentam boas condições de piso, parede, teto e das instalações elétricas. \nAmbiente composto por Bancada em mármore, cadeiras/bancos, Balança, Capela de Exaustão de gases, Vidrarias.",
            "activities": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
            "exposureGroup": "Alunos e servidores",
            "risks": [
              {
                "id": "xlsx-r009",
                "title": "Substâncias compostas e produtos químicos em geral",
                "category": "Químicos",
                "level": "baixo",
                "status": "pendente",
                "description": "Risco químicos importado da planilha para este ambiente.",
                "hazard": "Substâncias compostas e produtos químicos em geral",
                "riskEvent": "Substâncias compostas e produtos químicos em geral",
                "consequence": "Não informado na planilha.",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 0,
                "probability": 0,
                "riskScore": 0,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha",
                  "Sem classificação completa"
                ],
                "imageUrl": null
              },
              {
                "id": "xlsx-r010",
                "title": "Exigência de postura inadequada",
                "category": "Ergonômicos",
                "level": "baixo",
                "status": "pendente",
                "description": "Risco ergonômicos importado da planilha para este ambiente.",
                "hazard": "Exigência de postura inadequada",
                "riskEvent": "Exigência de postura inadequada",
                "consequence": "Não informado na planilha.",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 0,
                "probability": 0,
                "riskScore": 0,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha",
                  "Sem classificação completa"
                ],
                "imageUrl": null
              },
              {
                "id": "xlsx-r011",
                "title": "Manipulação de produtos químicos",
                "category": "Acidentes",
                "level": "baixo",
                "status": "pendente",
                "description": "Risco acidentes importado da planilha para este ambiente.",
                "hazard": "Manipulação de produtos químicos",
                "riskEvent": "Manipulação de produtos químicos",
                "consequence": "Não informado na planilha.",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 0,
                "probability": 0,
                "riskScore": 0,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha",
                  "Sem classificação completa"
                ],
                "imageUrl": null
              },
              {
                "id": "xlsx-r012",
                "title": "Manuseio de vidrarias",
                "category": "Acidentes",
                "level": "baixo",
                "status": "pendente",
                "description": "Risco acidentes importado da planilha para este ambiente.",
                "hazard": "Manuseio de vidrarias",
                "riskEvent": "Manuseio de vidrarias",
                "consequence": "Não informado na planilha.",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 0,
                "probability": 0,
                "riskScore": 0,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha",
                  "Sem classificação completa"
                ],
                "imageUrl": null
              },
              {
                "id": "xlsx-r013",
                "title": "Contato com superfícies aquecidas",
                "category": "Acidentes",
                "level": "baixo",
                "status": "pendente",
                "description": "Risco acidentes importado da planilha para este ambiente.",
                "hazard": "Contato com superfícies aquecidas",
                "riskEvent": "Contato com superfícies aquecidas",
                "consequence": "Não informado na planilha.",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 0,
                "probability": 0,
                "riskScore": 0,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha",
                  "Sem classificação completa"
                ],
                "imageUrl": null
              },
              {
                "id": "xlsx-r014",
                "title": "Sobrecarga elétrica",
                "category": "Acidentes",
                "level": "baixo",
                "status": "pendente",
                "description": "Risco acidentes importado da planilha para este ambiente.",
                "hazard": "Sobrecarga elétrica",
                "riskEvent": "Sobrecarga elétrica",
                "consequence": "Não informado na planilha.",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 0,
                "probability": 0,
                "riskScore": 0,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha",
                  "Sem classificação completa"
                ],
                "imageUrl": null
              },
              {
                "id": "xlsx-r015",
                "title": "Chuveiro de emergência com instalação inadequada",
                "category": "Acidentes",
                "level": "baixo",
                "status": "pendente",
                "description": "Risco acidentes importado da planilha para este ambiente.",
                "hazard": "Chuveiro de emergência com instalação inadequada",
                "riskEvent": "Chuveiro de emergência com instalação inadequada",
                "consequence": "Não informado na planilha.",
                "exposedPublic": "Alunos e servidores",
                "circulation": "Atividades de ensino e pesquisa acadêmicas com preparo de soluções químicas diversas.",
                "severity": 0,
                "probability": 0,
                "riskScore": 0,
                "registeredAt": "2026-09-28",
                "updatedAt": "2026-09-28",
                "flags": [
                  "Importado da planilha",
                  "Sem classificação completa"
                ],
                "imageUrl": null
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "bloco-cm",
    "name": "Bloco CM",
    "shortName": "CM",
    "fullName": "Bloco CM",
    "campus": "Campina Grande",
    "center": "CCT",
    "unit": "UAEQ, UAEC e UAEA",
    "description": "Edificação construída em concreto armado, possuindo três andares. Possui dois acessos: um pelo térreo, no nível de terreno mais abaixo, dando acesso a recepção da secretaria da UAEQ e UAEC e o outro pela rua principal dos blocos “C”, que dá acesso ao corredor dos ambientes dos professores.\nHá um extintores nos andares, porém sem a sinalização de piso e de parede. Além disso, não foram identificadas sinalização e iluminação de emergência. As escadas não possuem corrimão e nem fitas antiderrapante no piso.\nOs corredores estavam livres, sem obstáculos que impedissem ou dificultasse a passagem dos usuários.\nNo bloco estão situados os ambientes administrativos da Unidade Acadêmica de Engenharia Química (UAEQ), da Unidade Acadêmica de Engenharia Civil (UAEC), e da Unidade Acadêmica de Engenharia Agrícola (UAEA).",
    "coordinates": [
      -7.2137,
      -35.90732
    ],
    "x": 0,
    "y": 0,
    "width": 12,
    "height": 9,
    "floors": [
      {
        "id": "bloco-cm-0",
        "name": "Térreo",
        "rooms": [
          {
            "id": "bloco-cm-secretaria-de-cursos-uaeq-e-uaec",
            "code": "Secretaria de cursos - UAEQ e UAEC",
            "name": "Secretaria de cursos - UAEQ e UAEC",
            "type": "secretaria",
            "coordinates": null,
            "description": null,
            "activities": null,
            "exposureGroup": null,
            "risks": []
          },
          {
            "id": "bloco-cm-coordenacao-de-cursos-da-uaeq-e-uaec-bloco-cm",
            "code": "Coordenação de cursos da UAEQ e UAEC - Bloco CM",
            "name": "Coordenação de cursos da UAEQ e UAEC - Bloco CM",
            "type": "secretaria",
            "coordinates": null,
            "description": null,
            "activities": null,
            "exposureGroup": null,
            "risks": []
          },
          {
            "id": "bloco-cm-almoxarifado-do-bloco-cm",
            "code": "Almoxarifado do Bloco CM",
            "name": "Almoxarifado do Bloco CM",
            "type": "deposito",
            "coordinates": null,
            "description": null,
            "activities": null,
            "exposureGroup": null,
            "risks": []
          }
        ]
      },
      {
        "id": "bloco-cm-1",
        "name": "1º Pavimento",
        "rooms": [
          {
            "id": "bloco-cm-secretaria-de-cursos-da-uaea-bloco-cm",
            "code": "Secretaria de cursos da UAEA - Bloco CM",
            "name": "Secretaria de cursos da UAEA - Bloco CM",
            "type": "secretaria",
            "coordinates": null,
            "description": null,
            "activities": null,
            "exposureGroup": null,
            "risks": []
          },
          {
            "id": "bloco-cm-coordenacao-de-curso-da-uaea-bloco-cm",
            "code": "Coordenação de curso da UAEA - Bloco CM",
            "name": "Coordenação de curso da UAEA - Bloco CM",
            "type": "secretaria",
            "coordinates": null,
            "description": null,
            "activities": null,
            "exposureGroup": null,
            "risks": []
          },
          {
            "id": "bloco-cm-sala-de-professores-do-bloco-cm",
            "code": "Sala de professores do Bloco CM",
            "name": "Sala de professores do Bloco CM",
            "type": "sala",
            "coordinates": null,
            "description": null,
            "activities": null,
            "exposureGroup": null,
            "risks": []
          },
          {
            "id": "bloco-cm-sala-de-reuniao-do-bloco-cm",
            "code": "Sala de reunião do Bloco CM",
            "name": "Sala de reunião do Bloco CM",
            "type": "sala",
            "coordinates": null,
            "description": null,
            "activities": null,
            "exposureGroup": null,
            "risks": []
          },
          {
            "id": "bloco-cm-laboratorio-de-pesquisas-computacionais-do-bloco-cm",
            "code": "Laboratório de Pesquisas Computacionais do Bloco CM",
            "name": "Laboratório de Pesquisas Computacionais do Bloco CM",
            "type": "laboratorio",
            "coordinates": null,
            "description": null,
            "activities": null,
            "exposureGroup": null,
            "risks": []
          }
        ]
      },
      {
        "id": "bloco-cm-2",
        "name": "2º Pavimento",
        "rooms": [
          {
            "id": "bloco-cm-sala-de-professores-do-bloco-cm",
            "code": "Sala de professores do Bloco CM",
            "name": "Sala de professores do Bloco CM",
            "type": "sala",
            "coordinates": null,
            "description": null,
            "activities": null,
            "exposureGroup": null,
            "risks": []
          }
        ]
      }
    ]
  }
];

export const ALL_RISKS: Risk[] = CAMPUS_DATA.flatMap(b =>
  b.floors.flatMap(f => f.rooms.flatMap(r => r.risks))
);
