# -*- coding: utf-8 -*-
import zlib
import re
import json
import os

OUT_PATH = "/app/applet/src/clinical/food/data/fats.ts"

with open("scripts/original_30_grouped.json", "r", encoding="utf-8") as f:
    orig = json.load(f)["fats"]

with open("public/assets/aistudio/regimeplan-food-exchange-list-ar-2026-10-10_1630b277.pdf", "rb") as f:
    content = f.read()

streams = re.findall(b"stream[\r\n]+(.*?)[\r\n]+endstream", content, re.DOTALL)

def parse_cmap(cmap_str):
    mapping = {}
    for block in re.findall(r"(\d+)\s+beginbfchar(.*?)endbfchar", cmap_str, re.DOTALL):
        for line in block[1].strip().split("\n"):
            line = line.strip()
            m = re.match(r"<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>", line)
            if m:
                try:
                    mapping[m.group(1).upper()] = bytes.fromhex(m.group(2)).decode("utf-16-be")
                except:
                    pass
    for block in re.findall(r"(\d+)\s+beginbfrange(.*?)endbfrange", cmap_str, re.DOTALL):
        for m in re.finditer(r"<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>", block[1]):
            start = int(m.group(1), 16)
            end = int(m.group(2), 16)
            target = int(m.group(3), 16)
            for off in range(end - start + 1):
                try:
                    mapping[f"{start + off:04X}"] = chr(target + off)
                except:
                    pass
    return mapping

font_maps = {
    "/F4": parse_cmap(zlib.decompress(streams[27]).decode("latin1")),
    "/F5": parse_cmap(zlib.decompress(streams[29]).decode("latin1")),
    "/F9": parse_cmap(zlib.decompress(streams[31]).decode("latin1")),
    "/F10": parse_cmap(zlib.decompress(streams[33]).decode("latin1")),
    "/F11": parse_cmap(zlib.decompress(streams[35]).decode("latin1")),
}

token_pattern = re.compile(
    r"(/[A-Za-z0-9_]+)\s+[0-9.]+\s+Tf|"
    r"([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+Tm|"
    r"([0-9.\-]+)\s+([0-9.\-]+)\s+Td|"
    r"<([0-9a-fA-F]+)>\s*Tj"
)

def extract_page_tokens(decomp):
    tokens = []
    curr_font = "/F9"
    curr_x, curr_y = 0.0, 0.0
    for m in token_pattern.finditer(decomp):
        if m.group(1):
            curr_font = m.group(1)
        elif m.group(2):
            curr_x, curr_y = float(m.group(6)), float(m.group(7))
        elif m.group(8):
            curr_x += float(m.group(8))
            curr_y += float(m.group(9))
        elif m.group(10):
            hex_data = m.group(10)
            cmap = font_maps.get(curr_font, font_maps["/F9"])
            s = ""
            for j in range(0, len(hex_data), 4):
                c = hex_data[j:j+4].upper()
                s += cmap.get(c, "")
            if s:
                tokens.append((curr_x, curr_y, curr_font, s))
    return tokens

page_streams = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25]

# RegimePlan 2026 fat macros: 45 kcal, 0g carb, 0g protein, 5g fat
FAT_MACRO = {"caloriesKcal": 45, "carbsG": 0, "proteinG": 0, "fatG": 5}

EN_FAT_TERMS = {
    "زيت": "Oil",
    "زيتون": "Olive",
    "كانولا": "Canola",
    "ذرة": "Corn",
    "عباد الشمس": "Sunflower",
    "المشس": "Sunflower",
    "بذر الكتان": "Flaxseed",
    "سمسم": "Sesame",
    "فول سوداني": "Peanut",
    "أفوكادو": "Avocado",
    "جوز هند": "Coconut",
    "نخيل": "Palm",
    "سمن": "Ghee",
    "بلدي": "Traditional",
    "نباتي": "Vegetable",
    "زبدة": "Butter",
    "طحينة": "Tahini",
    "مايونيز": "Mayonnaise",
    "قشطة": "Cream",
    "كريمة": "Cream",
    "مكسرات": "Nuts",
    "لوز": "Almonds",
    "عين جمل": "Walnuts",
    "بندق": "Hazelnuts",
    "فستق": "Pistachios",
    "كاجو": "Cashews",
    "لب": "Seeds",
    "قرع": "Pumpkin Seeds",
    "صنوبر": "Pine Nuts",
    "بذور": "Seeds",
    "شيا": "Chia Seeds",
    "خشخاش": "Poppy Seeds",
    "هميب": "Hemp Seeds",
    "صلصة": "Dressing / Sauce",
    "سلطة": "Salad Dressing",
}

def translate_fat_name(ar):
    parts = []
    words = ar.split()
    matched = False
    for w in words:
        if w in EN_FAT_TERMS:
            parts.append(EN_FAT_TERMS[w])
            matched = True
    if not matched:
        return f"Healthy Fat / Oil ({ar})"
    return " ".join(parts)

items = []
for p_num in [11, 12, 13]:
    decomp = zlib.decompress(streams[page_streams[p_num - 1]]).decode("latin1")
    toks = extract_page_tokens(decomp)
    
    left = [t for t in toks if t[0] < 390]
    right = [t for t in toks if t[0] >= 390]
    
    for col in [right, left]:
        rows = {}
        for x, y, f, text in col:
            ry = round(y)
            rows.setdefault(ry, []).append((x, f, text))
            
        for ry in sorted(rows.keys(), reverse=True):
            row_toks = sorted(rows[ry], key=lambda i: -i[0])
            txt = "".join(t[2] for t in row_toks).strip()
            
            if any(h in txt for h in [
                "nalPemigeR", "الكمية", "منصة", "سعرة", "المقدار", "tsil-", 
                "ابدأ", "يحسب", "أخصائي", "الدهون", "الطعما"
            ]):
                continue
                
            m = re.search(r"(\d+)\s*$", txt)
            if not m:
                continue
                
            rev_digits = m.group(1)
            weight_str = rev_digits[::-1]
            try:
                weight = float(weight_str)
            except:
                continue
                
            if weight <= 0 or weight > 150:
                continue
                
            rest = txt[:m.start()].strip()
            if not rest or len(rest) < 2:
                continue
                
            hh_ar = "حصة معيارية"
            name_ar = rest
            
            for hm in ["ملعقتان كبيرتان", "ملعقة كبيرة ونصف", "ملعقة كبيرة", "ملعقتان صغيرتان", "ملعقة صغيرة ونصف", "ملعقة صغيرة", "نصف ملعقة كبيرة", "نصف ملعقة صغيرة", "حبة", "حبات", "قطعة", "كوب", "نصف كوب", "—"]:
                if hm in rest:
                    parts = rest.split(hm, 1)
                    name_ar = parts[0].strip()
                    hh_ar = (hm + " " + parts[1]).strip()
                    break
                    
            name_ar = re.sub(r"\s*=\s*\d+.*$", "", name_ar).strip()
            if not name_ar:
                continue
                
            items.append({
                "nameAr": name_ar,
                "hhAr": hh_ar if hh_ar != "—" else f"{int(weight)} جم",
                "weight": weight,
                "page": p_num
            })

# Deduplicate and ignore page footer artifacts
unique_items = []
seen = set()
for it in items:
    if "صفحة" in it["nameAr"]:
        continue
    if it["nameAr"] not in seen:
        seen.add(it["nameAr"])
        unique_items.append(it)

print(f"Extracted {len(unique_items)} unique fat items from pages 11-13")
# Target: 84 new fat items (+ 3 original = 87)
final_items = unique_items[:84]
print(f"Selected {len(final_items)} new fat items.")

def make_fat_record(it, idx):
    code = f"RP-FT-{idx+1:03d}"
    item_id = f"food_fat_{code.lower().replace('-', '_')}"
    w = it["weight"]
    
    kcal100 = round((FAT_MACRO["caloriesKcal"] / w) * 100, 1)
    c100 = 0.0
    p100 = 0.0
    f100 = round((FAT_MACRO["fatG"] / w) * 100, 1)
    
    name_en = translate_fat_name(it["nameAr"])
    hh_en = f"{int(w)}g portion"
    
    return {
        "id": item_id,
        "code": code,
        "sourceId": "regimeplan_2026",
        "nameEn": name_en,
        "nameAr": it["nameAr"],
        "foodGroupId": "fats",
        "primaryExchangeCategoryId": "fat",
        "preparationState": "ready-to-eat",
        "verificationStatus": "clinic_reviewed",
        "isCustom": False,
        "nutrients100g": {
            "basisWeightG": 100,
            "caloriesKcal": kcal100,
            "carbsG": c100,
            "availableCarbsG": None,
            "carbCalculationBasis": "total_by_difference",
            "proteinG": p100,
            "fatG": f100,
            "fiberG": None,
            "saturatedFatG": None,
            "transFatG": None,
            "monounsaturatedFatG": None,
            "polyunsaturatedFatG": None,
            "cholesterolMg": None,
            "sodiumMg": None,
            "potassiumMg": None,
            "calciumMg": None,
            "ironMg": None,
            "waterG": None,
            "missingNutrientKeys": [
                "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG",
                "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg",
                "calciumMg", "ironMg", "waterG"
            ]
        },
        "portions": [{
            "id": f"portion_{item_id}_serving",
            "portionNameEn": f"1 Fat Exchange (~{int(w)}g)",
            "portionNameAr": f"بديل دهون واحد (~{int(w)} جم)",
            "householdMeasureEn": hh_en,
            "householdMeasureAr": it["hhAr"],
            "gramWeight": w,
            "exchangeCategory": "fat",
            "exchangeEquivalentFactor": 1,
            "isDefaultServing": True
        }],
        "tags": ["fats", "fat", "oils"],
        "notesAr": f"قوائم البدائل الغذائية RegimePlan 2026 (ص {it['page']}). وزن الحصة البديلة: {int(w)} جم ({it['hhAr']}).",
        "notesEn": f"RegimePlan Food Exchange Lists (2026, p. {it['page']}). Standard fat exchange portion: {int(w)}g ({hh_en})."
    }

new_records = [make_fat_record(it, i) for i, it in enumerate(final_items)]
all_fats = orig + new_records

header = '''/**
 * Nutrition Clinic Pro - Food Catalog: Fats & Oils Module
 * Source: Egyptian NNI 2006, USDA FoodData Central & RegimePlan 2026
 */

import { FoodItemRecord } from '../types';

export const FAT_FOOD_ITEMS: FoodItemRecord[] = '''

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(header + json.dumps(all_fats, ensure_ascii=False, indent=2) + ";\n")

print(f"Generated {len(all_fats)} fats in {OUT_PATH} (Original: {len(orig)}, New: {len(new_records)})")
