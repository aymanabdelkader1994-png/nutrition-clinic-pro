# -*- coding: utf-8 -*-
import zlib
import re
import json
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_PATH = os.path.join(BASE_DIR, "src/clinical/food/data/meats.ts")

with open(os.path.join(BASE_DIR, "scripts/original_30_grouped.json"), "r", encoding="utf-8") as f:
    orig = json.load(f)["meats"]

with open(os.path.join(BASE_DIR, "public/assets/aistudio/regimeplan-food-exchange-list-ar-2026-10-10_1630b277.pdf"), "rb") as f:
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

# RegimePlan 2026 meat macros:
# meat_lean: 46 kcal, 0g carb, 7g protein, 2g fat
# meat_medium_fat: 73 kcal, 0g carb, 7g protein, 5g fat
# meat_high_fat: 100 kcal, 0g carb, 7g protein, 8g fat

MACROS = {
    "meat_lean": {"caloriesKcal": 46, "carbsG": 0, "proteinG": 7, "fatG": 2},
    "meat_medium_fat": {"caloriesKcal": 73, "carbsG": 0, "proteinG": 7, "fatG": 5},
    "meat_high_fat": {"caloriesKcal": 100, "carbsG": 0, "proteinG": 7, "fatG": 8},
}

# Translation helper dictionary for meat foods
EN_TERMS = {
    "فراخ": "Chicken",
    "دجاج": "Chicken",
    "لحم": "Meat / Beef",
    "بقري": "Beef",
    "ضأن": "Lamb",
    "بتلو": "Veal",
    "ماعز": "Goat",
    "جاموسي": "Buffalo",
    "سمك": "Fish",
    "سلمون": "Salmon",
    "ساملون": "Salmon",
    "تونة": "Tuna",
    "ماكريل": "Mackerel",
    "سردين": "Sardine",
    "جمبري": "Shrimp / Prawns",
    "مجبري": "Shrimp",
    "كابوريا": "Crab",
    "إستاكوزا": "Lobster",
    "حبار": "Squid / Calamari",
    "أخطبوط": "Octopus",
    "محار": "Oysters / Clams",
    "بلطي": "Tilapia",
    "بوري": "Grey Mullet",
    "دنيس": "Sea Bream",
    "وقار": "Grouper",
    "قاروص": "Sea Bass",
    "مكرونة": "Saurida / Brushtooth Lizardfish",
    "قشر بياض": "Nile Perch",
    "قد": "Cod Fish",
    "رنجة": "Smoked Herring",
    "فسيخ": "Feseekh (Cured Grey Mullet)",
    "أنشوجة": "Anchovies",
    "كافيار": "Caviar",
    "بط": "Duck",
    "وز": "Goose",
    "حمام": "Pigeon / Squab",
    "سمان": "Quail",
    "ديك رومي": "Turkey",
    "أرانب": "Rabbit",
    "نعام": "Ostrich",
    "كبدة": "Liver",
    "قلب": "Heart",
    "كلاوي": "Kidney",
    "مخ": "Brain",
    "كرشة": "Tripe",
    "طحال": "Spleen",
    "كوارع": "Trotters",
    "لسان": "Tongue",
    "سجق": "Sausage",
    "هوت دوج": "Hot Dog",
    "سوسيس": "Frankfurter",
    "برجر": "Burger Patty",
    "لانشون": "Luncheon Meat / Mortadella",
    "بسطرمة": "Pastrami",
    "بيبروني": "Pepperoni",
    "سلامي": "Salami",
    "جبنة": "Cheese",
    "جبن": "Cheese",
    "بيض": "Egg",
    "بياض بيض": "Egg White",
    "صفار بيض": "Egg Yolk",
    "توفو": "Tofu",
    "تمبي": "Tempeh",
    "نيء": "Raw",
    "نيئة": "Raw",
    "مطبوخ": "Cooked",
    "مطبوخة": "Cooked",
    "مشوي": "Grilled",
    "مشوية": "Grilled",
    "مسلوق": "Boiled",
    "مسلوقة": "Boiled",
    "مقلي": "Fried",
    "مقلية": "Fried",
    "في الفرن": "Baked / Roasted",
    "معلب": "Canned",
    "معلبة": "Canned",
    "مدخن": "Smoked",
    "مدخنة": "Smoked",
    "بدون جلد": "Skinless",
    "بالجلد": "With Skin",
    "مفروم": "Minced / Ground",
    "مفرومة": "Minced / Ground",
}

def translate_name(ar):
    parts = []
    # simple token-based replacement
    words = ar.split()
    matched = False
    for w in words:
        if w in EN_TERMS:
            parts.append(EN_TERMS[w])
            matched = True
    if not matched:
        return f"Meat Product ({ar})"
    return " ".join(parts)

# Parse pages 7 (meat section), 8, 9, 10
# Current subcategory tracking
items = []
current_cat = "meat_lean"

for p_num in [7, 8, 9, 10]:
    decomp = zlib.decompress(streams[page_streams[p_num - 1]]).decode("latin1")
    toks = extract_page_tokens(decomp)
    
    # split left and right
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
            
            # Check for category changes
            if "متوسطة الدهون" in txt or "73 سعرة" in txt:
                current_cat = "meat_medium_fat"
            elif "عالية الدهون" in txt or "001 سعرة" in txt or "100 سعرة" in txt:
                current_cat = "meat_high_fat"
            elif "اللحوم وبدائلها" in txt or "46 سعرة" in txt or "قليلة الدهون" in txt:
                current_cat = "meat_lean"
                
            # Ignore headers, branding, descriptions
            if any(h in txt for h in [
                "nalPemigeR", "الكمية", "منصة", "سعرة", "المقدار", "tsil-", 
                "ابدأ", "يحسب", "أخصائي", "اللحوم وبدائلها", "الطعما"
            ]):
                continue
                
            # Look for line with gram weight
            # Format typically: <Name><Household><Digits>
            # The digits at the end are reversed!
            m = re.search(r"(\d+)\s*$", txt)
            if not m:
                continue
                
            rev_digits = m.group(1)
            # Reconstruct gram weight by reversing digits
            weight_str = rev_digits[::-1]
            try:
                weight = float(weight_str)
            except:
                continue
                
            if weight <= 0 or weight > 500:
                continue
                
            # Extract the remaining text before the digits
            rest = txt[:m.start()].strip()
            if not rest or len(rest) < 3:
                continue
                
            # Check household measure vs name
            # If rest has '—' or 'كوب' or 'شريحة' or 'قطعة'
            hh_ar = "حصة معيارية"
            hh_en = "Standard portion"
            name_ar = rest
            
            # Check for common household measures
            for hm in ["شريحة ونصف", "شريحة", "قطعة فيليه", "قطعة", "نصف كوب", "ثلث كوب", "ربع كوب", "كوب", "ملعقتان كبيرتان", "ملعقة كبيرة", "نصف دبوس", "دبوس", "نصف صدر", "صدر متوسط", "صدر", "ورك متوسط", "ورك", "ربع فرخة", "نصف فرخة", "حبة كبيرة", "حبة متوسطة", "حبة ونصف", "حبة", "حبتان", "3 قطع", "5 أصابع", "إصبع", "علبة", "—"]:
                if hm in rest:
                    parts = rest.split(hm, 1)
                    name_ar = parts[0].strip()
                    hh_ar = (hm + " " + parts[1]).strip()
                    break
                    
            name_ar = re.sub(r"\s*=\s*\d+.*$", "", name_ar).strip()
            if not name_ar:
                continue
                
            # Filter out non-meat items (e.g. if legume/dairy slipped in)
            if any(ex in name_ar for ex in ["لبن", "زبادي", "فول", "عدس", "حمص", "فاصوليا", "لوبيا", "إدامامي"]):
                continue
                
            # Determine prep state
            prep = "cooked"
            if "نيء" in name_ar or "نيئة" in name_ar:
                prep = "raw"
            elif "معلب" in name_ar or "معلبة" in name_ar or "مدخن" in name_ar or "مدخنة" in name_ar:
                prep = "ready-to-eat"
            elif "مشوي" in name_ar or "مشوية" in name_ar:
                prep = "grilled"
            elif "مسلوق" in name_ar or "مسلوقة" in name_ar:
                prep = "boiled"
            elif "مقلي" in name_ar or "مقلية" in name_ar:
                prep = "fried"
            elif "في الفرن" in name_ar:
                prep = "baked"
                
            items.append({
                "nameAr": name_ar,
                "hhAr": hh_ar if hh_ar != "—" else f"{int(weight)} جم",
                "weight": weight,
                "cat": current_cat,
                "prep": prep,
                "page": p_num
            })

# Deduplicate items by nameAr while preserving original 1-based PDF extraction index
# (so page footer artifacts at indices 24, 76, 135 keep stable codes for remaining items)
unique_items = []
seen_names = set()
for it in items:
    if it["nameAr"] not in seen_names:
        seen_names.add(it["nameAr"])
        unique_items.append(it)

numbered_items = [
    (i + 1, it)
    for i, it in enumerate(unique_items[:196])
    if "صفحة" not in it["nameAr"]
]

print(f"Extracted {len(numbered_items)} unique non-footer meat items from pages 7-10")
cats = {}
for _, it in numbered_items:
    cats[it["cat"]] = cats.get(it["cat"], 0) + 1
print("Categories:", cats)
print(f"Selected {len(numbered_items)} new meat items to combine with {len(orig)} original.")

def make_meat_record(it, seq_num):
    code = f"RP-MT-{seq_num:03d}"
    item_id = f"food_meat_{code.lower().replace('-', '_')}"
    portion_id = f"portion_{item_id}_serving"

    w = it["weight"]
    cat = it["cat"]
    m = MACROS[cat]
    
    def fmt(n):
        r = round(n, 1)
        return int(r) if r == int(r) else r

    kcal100 = fmt((m["caloriesKcal"] / w) * 100)
    c100 = fmt((m["carbsG"] / w) * 100)
    p100 = fmt((m["proteinG"] / w) * 100)
    f100 = fmt((m["fatG"] / w) * 100)
    w_gram = int(w) if isinstance(w, (int, float)) and w == int(w) else round(w, 1)
    
    name_en = translate_name(it["nameAr"])
    hh_en = f"{int(w)}g portion"
    
    return {
        "id": item_id,
        "code": code,
        "sourceId": "regimeplan_2026",
        "nameEn": name_en,
        "nameAr": it["nameAr"],
        "foodGroupId": "meats",
        "primaryExchangeCategoryId": cat,
        "preparationState": it["prep"],
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
            "id": portion_id,
            "portionNameEn": f"1 Meat Exchange (~{int(w)}g)",
            "portionNameAr": f"بديل لحوم واحد (~{int(w)} جم)",
            "householdMeasureEn": hh_en,
            "householdMeasureAr": it["hhAr"],
            "gramWeight": w_gram,
            "exchangeCategory": cat,
            "exchangeEquivalentFactor": 1,
            "isDefaultServing": True
        }],
        "tags": ["meats", cat, it["prep"]],
        "notesAr": f"قوائم البدائل الغذائية RegimePlan 2026 (ص {it['page']}). وزن الحصة البديلة: {int(w)} جم ({it['hhAr']}).",
        "notesEn": f"RegimePlan Food Exchange Lists (2026, p. {it['page']}). Standard meat exchange portion: {int(w)}g ({hh_en})."
    }

new_records = [make_meat_record(it, seq) for seq, it in numbered_items]
all_meats = orig + new_records

header = '''/**
 * Nutrition Clinic Pro - Food Catalog: Meats, Poultry, Fish, Seafood & Cheeses Module
 * Source: Egyptian NNI 2006, USDA FoodData Central & RegimePlan 2026
 */

import { FoodItemRecord } from '../types';

export const MEAT_FOOD_ITEMS: FoodItemRecord[] = '''

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(header + json.dumps(all_meats, ensure_ascii=False, indent=2) + ";\n")

print(f"Generated {len(all_meats)} meats in {OUT_PATH} (Original: {len(orig)}, New: {len(new_records)})")
