import json
import math
import re
import sys
import unicodedata
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "src" / "data.ts"


def clean(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return None
    return text.strip('"')


def slug(value):
    text = unicodedata.normalize("NFD", clean(value) or "")
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
    return text or "item"


def normalize(value):
    text = unicodedata.normalize("NFD", clean(value) or "")
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", text.lower()).strip()


def room_match_key(value):
    text = normalize(value)
    text = text.replace("central de lab", "")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def parse_coordinates(value):
    text = clean(value)
    if not text:
        return None
    match = re.search(r"(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)", text)
    if not match:
        return None
    return [float(match.group(1)), float(match.group(2))]


def parse_number_prefix(value, fallback=0):
    text = clean(value)
    if not text:
        return fallback
    match = re.match(r"\s*(\d+)", text)
    return int(match.group(1)) if match else fallback


def risk_level(value, score):
    text = normalize(value)
    if "critic" in text:
        return "critico"
    if "alto" in text:
        return "alto"
    if "moderado" in text:
        return "moderado"
    if "baixo" in text:
        return "baixo"
    if score >= 16:
        return "critico"
    if score >= 10:
        return "alto"
    if score >= 5:
        return "moderado"
    return "baixo"


def room_type(name):
    text = normalize(name)
    if "laboratorio" in text:
        return "laboratorio"
    if "secretaria" in text or "coordenacao" in text:
        return "secretaria"
    if "almoxarifado" in text or "deposito" in text:
        return "deposito"
    if "sala de reuniao" in text:
        return "sala"
    return "sala"


def floor_name(value, index):
    text = clean(value)
    if text and not re.match(r"^\d+(?:\.0)?$", text):
        return text.replace("�", "º")
    if index == 0:
        return "Térreo"
    return f"{index}º Pavimento"


def make_ts(value, indent=0):
    return json.dumps(value, ensure_ascii=False, indent=2)


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python scripts/import-risk-xlsx.py caminho/planilha.xlsx")

    workbook_path = Path(sys.argv[1])
    if not workbook_path.exists():
        raise SystemExit(f"Planilha não encontrada: {workbook_path}")

    locais = pd.read_excel(workbook_path, sheet_name="Locais", header=1)
    riscos = pd.read_excel(workbook_path, sheet_name="Riscos e perigos")

    blocks = {}
    room_lookup = {}
    unmatched_risks = []

    for _, row in locais.iterrows():
        kind = clean(row.iloc[0])
        block_name = clean(row.iloc[4])
        name = clean(row.iloc[5])
        if not kind or not block_name or not name:
            continue

        block_id = slug(block_name)
        block = blocks.setdefault(block_id, {
            "id": block_id,
            "name": block_name,
            "shortName": block_name.replace("Bloco ", "").strip(),
            "fullName": name if normalize(kind).startswith("edificacao") else block_name,
            "campus": clean(row.iloc[1]),
            "center": clean(row.iloc[2]),
            "unit": clean(row.iloc[3]),
            "description": None,
            "coordinates": None,
            "x": 0,
            "y": 0,
            "width": 12,
            "height": 9,
            "floors": [],
        })

        coords = parse_coordinates(row.iloc[6])
        if normalize(kind).startswith("edificacao"):
            block["fullName"] = name
            block["description"] = clean(row.iloc[7])
            block["coordinates"] = coords or block["coordinates"]
            pavements = parse_number_prefix(row.iloc[8], 1)
            block["floors"] = [
                {"id": f"{block_id}-{i}", "name": floor_name(None, i), "rooms": []}
                for i in range(max(pavements, 1))
            ]
            continue

        if not block["coordinates"] and coords:
            block["coordinates"] = coords

        floor_raw = clean(row.iloc[8])
        floor_index = 0
        if floor_raw:
            floor_norm = normalize(floor_raw)
            if "1" in floor_norm and "terreo" not in floor_norm:
                floor_index = 1
            elif "2" in floor_norm:
                floor_index = 2
        elif block_id == "bloco-cw2":
            floor_index = 2

        while len(block["floors"]) <= floor_index:
            block["floors"].append({
                "id": f"{block_id}-{len(block['floors'])}",
                "name": floor_name(None, len(block["floors"])),
                "rooms": [],
            })

        room = {
            "id": f"{block_id}-{slug(name)}",
            "code": name,
            "name": name,
            "type": room_type(name),
            "coordinates": coords,
            "description": clean(row.iloc[7]),
            "activities": clean(row.iloc[9]),
            "exposureGroup": clean(row.iloc[10]),
            "risks": [],
        }
        block["floors"][floor_index]["rooms"].append(room)
        room_lookup[normalize(name)] = room
        room_lookup[room_match_key(name)] = room

    for idx, row in riscos.iterrows():
        name = clean(row.iloc[1])
        if not name:
            continue

        room = room_lookup.get(normalize(name)) or room_lookup.get(room_match_key(name))
        if not room:
            risk_key = room_match_key(name)
            candidates = [
                item for key, item in room_lookup.items()
                if risk_key in key or key in risk_key
            ]
            room = candidates[0] if candidates else None

        if not room:
            unmatched_risks.append(name)
            continue

        probability = parse_number_prefix(row.iloc[7], 0)
        severity = parse_number_prefix(row.iloc[8], 0)
        score_raw = clean(row.iloc[9])
        score = int(float(score_raw)) if score_raw else probability * severity
        category = clean(row.iloc[2]) or "Não classificado"
        hazard = clean(row.iloc[3]) or category
        consequence = clean(row.iloc[5]) or "Não informado na planilha."
        control = clean(row.iloc[6])
        recommendation = clean(row.iloc[12])

        room["risks"].append({
            "id": f"xlsx-r{idx + 1:03d}",
            "title": hazard,
            "category": category,
            "level": risk_level(row.iloc[10], score),
            "status": "pendente",
            "description": recommendation or f"Risco {category.lower()} importado da planilha para este ambiente.",
            "hazard": hazard,
            "riskEvent": hazard,
            "consequence": consequence,
            "exposedPublic": clean(row.iloc[4]) or room.get("exposureGroup") or "Não informado",
            "circulation": room.get("activities") or "Ambiente cadastrado na planilha",
            "severity": severity,
            "probability": probability,
            "riskScore": score,
            "registeredAt": "2026-09-28",
            "updatedAt": "2026-09-28",
            "flags": ["Importado da planilha"] + (["Sem classificação completa"] if not clean(row.iloc[10]) else []),
            "imageUrl": clean(row.iloc[11]),
        })

    campus_data = list(blocks.values())
    for block in campus_data:
        if not block["coordinates"]:
            for floor in block["floors"]:
                for room in floor["rooms"]:
                    if room.get("coordinates"):
                        block["coordinates"] = room["coordinates"]
                        break
                if block["coordinates"]:
                    break

    source = DATA_PATH.read_text(encoding="utf-8")
    prefix = source.split("export const CAMPUS_DATA: Block[] = [", 1)[0]
    generated = make_ts(campus_data)
    next_source = (
        prefix
        + f"export const CAMPUS_DATA: Block[] = {generated};\n\n"
        + "export const ALL_RISKS: Risk[] = CAMPUS_DATA.flatMap(b =>\n"
        + "  b.floors.flatMap(f => f.rooms.flatMap(r => r.risks))\n"
        + ");\n"
    )
    DATA_PATH.write_text(next_source, encoding="utf-8")

    print(json.dumps({
        "blocks": len(campus_data),
        "rooms": sum(len(floor["rooms"]) for block in campus_data for floor in block["floors"]),
        "risks": sum(len(room["risks"]) for block in campus_data for floor in block["floors"] for room in floor["rooms"]),
        "unmatchedRisks": sorted(set(unmatched_risks)),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
