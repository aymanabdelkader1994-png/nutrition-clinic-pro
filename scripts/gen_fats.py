# -*- coding: utf-8 -*-
"""
Nutrition Clinic Pro - Fats, Oils, Nuts, Seeds & High-Fat Cheese Generator

Clinical Integrity Rules:
1. Analytical nutrient composition (per 100g) is STRICTLY SEPARATED from exchange-list
   classification and exchange portion gram weights (RegimePlan 2026).
2. Exchange-group macros (e.g. 45 kcal / 5g fat / 0g protein / 0g carb) MUST NEVER be
   substituted for real food composition.
3. Unknown/unassayed micronutrients remain strictly null (None) and are dynamically
   tracked in missingNutrientKeys — never imputed as 0.
4. USDA FoodData Central / SR Legacy NDB identifiers are assigned ONLY for verified
   matching records; regional, composite, or estimated foods use clinic_reviewed or
   recipe_based provenance without synthetic sourceRecordId values.
"""

import zlib
import re
import json
import os
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_PATH = os.path.join(BASE_DIR, "src/clinical/food/data/fats.ts")

with open(os.path.join(BASE_DIR, "scripts/original_30_grouped.json"), "r", encoding="utf-8") as f:
    orig = json.load(f)["fats"]

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
                except Exception:
                    pass
    for block in re.findall(r"(\d+)\s+beginbfrange(.*?)endbfrange", cmap_str, re.DOTALL):
        for m in re.finditer(r"<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>", block[1]):
            start = int(m.group(1), 16)
            end = int(m.group(2), 16)
            target = int(m.group(3), 16)
            for off in range(end - start + 1):
                try:
                    mapping[f"{start + off:04X}"] = chr(target + off)
                except Exception:
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

CORE_TRACKED_KEYS = [
    "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG",
    "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg",
    "calciumMg", "ironMg", "waterG",
]

# Complete analytical & evidence-backed composition map per 100g for every RP-FT-* item.
# Zero exchange-macro substitution is permitted.
FAT_COMPOSITION_MAP = {
    "RP-FT-001": {
        "nameEn": "Sunflower Seed Butter",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 617.0, "carbsG": 23.3, "proteinG": 17.3, "fatG": 55.2, "fiberG": 5.7},
        "tags": ["seeds", "sunflower seed butter", "زبدة عباد الشمس", "بذور"],
        "reviewNoteEn": "Clinically reviewed commercial sunflower seed butter estimate per 100g; requires product-label verification when brand varies.",
        "reviewNoteAr": "تقدير سريري لتركيبة زبدة بذور عباد الشمس التجارية لكل 100 جم؛ يُنصح بالتحقق من البطاقة الغذائية للمنتج.",
    },
    "RP-FT-002": {
        "nameEn": "Poppy Seeds, Dried",
        "prep": "dried",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 525.0, "carbsG": 28.1, "proteinG": 17.6, "fatG": 41.6, "fiberG": 19.5},
        "tags": ["seeds", "poppy seeds", "بذور خشخاش"],
    },
    "RP-FT-003": {
        "nameEn": "Hemp Seeds, Hulled",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12012",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 553.0, "carbsG": 8.7, "proteinG": 31.6, "fatG": 48.8, "fiberG": 4.0},
        "tags": ["seeds", "hemp seeds", "بذور قنب", "بذور هيمب"],
    },
    "RP-FT-004": {
        "nameEn": "Pine Nuts, Raw",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12147",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 673.0, "carbsG": 13.1, "proteinG": 13.7, "fatG": 68.4, "fiberG": 3.7},
        "tags": ["nuts", "pine nuts", "صنوبر"],
    },
    "RP-FT-005": {
        "nameEn": "Pumpkin Seeds, Roasted",
        "prep": "roasted",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 574.0, "carbsG": 14.7, "proteinG": 29.8, "fatG": 49.0, "fiberG": 6.5},
        "tags": ["seeds", "pumpkin seeds", "لب قرع محمص", "بذور يقطين"],
    },
    "RP-FT-006": {
        "nameEn": "Pumpkin Seed Kernels, Raw / Dried",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12014",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 559.0, "carbsG": 10.7, "proteinG": 30.2, "fatG": 49.1, "fiberG": 6.0},
        "tags": ["seeds", "pumpkin seeds", "لب قرع نيء", "بذور يقطين"],
    },
    "RP-FT-007": {
        "nameEn": "Sunflower Seed Kernels, Roasted Salted",
        "prep": "roasted",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 582.0, "carbsG": 24.1, "proteinG": 19.3, "fatG": 49.8, "fiberG": 9.0},
        "tags": ["seeds", "sunflower seeds", "لب عباد الشمس مملح", "لب سوري"],
    },
    "RP-FT-008": {
        "nameEn": "Sunflower Seed Kernels, Dry Roasted, Unsalted",
        "prep": "roasted",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12037",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 582.0, "carbsG": 24.1, "proteinG": 19.3, "fatG": 49.8, "fiberG": 11.1, "sodiumMg": 3.0},
        "tags": ["seeds", "sunflower seeds", "لب عباد الشمس محمص", "لب سوري"],
    },
    "RP-FT-009": {
        "nameEn": "Sunflower Seed Kernels, Raw / Dried",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12036",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 584.0, "carbsG": 20.0, "proteinG": 20.8, "fatG": 51.5, "fiberG": 8.6, "sodiumMg": 9.0},
        "tags": ["seeds", "sunflower seeds", "لب عباد الشمس نيء"],
    },
    "RP-FT-010": {
        "nameEn": "Sesame Seeds, Whole, Dried",
        "prep": "dried",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12023",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 573.0, "carbsG": 23.5, "proteinG": 17.7, "fatG": 49.7, "fiberG": 11.8, "sodiumMg": 11.0},
        "tags": ["seeds", "sesame seeds", "سمسم"],
    },
    "RP-FT-011": {
        "nameEn": "Flaxseed, Whole / Raw",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12220",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 534.0, "carbsG": 28.9, "proteinG": 18.3, "fatG": 42.2, "fiberG": 27.3, "sodiumMg": 30.0},
        "tags": ["seeds", "flaxseed", "بذر كتان", "بذور الكتان"],
    },
    "RP-FT-012": {
        "nameEn": "Chia Seeds, Dried",
        "prep": "dried",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12006",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 486.0, "carbsG": 42.1, "proteinG": 16.5, "fatG": 30.7, "fiberG": 34.4, "sodiumMg": 16.0},
        "tags": ["seeds", "chia seeds", "بذور تشيا", "بذور الشيا"],
    },
    "RP-FT-013": {
        "nameEn": "Walnuts, English, Raw",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12155",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 654.0, "carbsG": 13.7, "proteinG": 15.2, "fatG": 65.2, "fiberG": 6.7, "sodiumMg": 2.0},
        "tags": ["nuts", "walnuts", "عين جمل نيء", "جوز"],
    },
    "RP-FT-014": {
        "nameEn": "Tahini (Sesame Paste)",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12166",
        "verificationStatus": "verified_standard",
        "nutrients": {
            "caloriesKcal": 595.0, "carbsG": 21.2, "proteinG": 17.0, "fatG": 53.8,
            "fiberG": 9.3, "saturatedFatG": 7.5, "monounsaturatedFatG": 20.3, "polyunsaturatedFatG": 23.6, "sodiumMg": 115.0,
        },
        "tags": ["tahini", "sesame paste", "طحينة", "سمسم"],
    },
    "RP-FT-015": {
        "nameEn": "Plant-Based Butter Spread",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 717.0, "carbsG": 0.7, "proteinG": 0.2, "fatG": 80.0, "fiberG": 0.0},
        "tags": ["butter", "plant butter", "زبدة نباتية"],
        "reviewNoteEn": "Clinically reviewed vegetable/plant butter estimate per 100g; exact fatty-acid profile depends on formulation.",
        "reviewNoteAr": "تقدير سريري للزبدة النباتية لكل 100 جم؛ يختلف محتوى الأحماض الدهنية حسب التركيبة التجارية.",
    },
    "RP-FT-016": {
        "nameEn": "Vegan Parmesan Alternative",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "recipe_based",
        "nutrients": {"caloriesKcal": 390.0, "carbsG": 35.0, "proteinG": 10.0, "fatG": 24.0},
        "tags": ["vegan cheese", "parmesan", "بارميزان نباتي", "جبنة"],
        "reviewNoteEn": "Estimated vegan parmesan composition (starch/oil/nutritional yeast base); requires label verification for specific brand.",
        "reviewNoteAr": "تقدير لتركيبة بديل البارميزان النباتي؛ يلزم التحقق من الملصق الغذائي للمنتج الفعلي.",
    },
    "RP-FT-017": {
        "nameEn": "Kashkaval Cheese",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 375.0, "carbsG": 1.5, "proteinG": 25.0, "fatG": 30.0, "fiberG": 0.0},
        "tags": ["cheese", "kashkaval", "جبنة قشقوان", "جبن"],
        "reviewNoteEn": "Clinically reviewed Mediterranean semi-hard Kashkaval cheese composition; grouped under fat exchange in RegimePlan source table.",
        "reviewNoteAr": "تركيبة مراجعة سريرياً لجبنة القشقوان؛ مصنفة تحت قائمة بدائل الدهون في مرجع RegimePlan.",
    },
    "RP-FT-018": {
        "nameEn": "Egyptian Rumi Cheese (Aged Hard Cheese)",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 395.0, "carbsG": 1.5, "proteinG": 26.5, "fatG": 31.5, "fiberG": 0.0},
        "tags": ["cheese", "rumi cheese", "جبنة رومي", "جبن"],
        "reviewNoteEn": "Clinically reviewed Egyptian aged Rumi cheese composition; grouped under fat exchange in RegimePlan source table.",
        "reviewNoteAr": "تركيبة مراجعة سريرياً للجبنة الرومي المصرية؛ مصنفة تحت قائمة بدائل الدهون في مرجع RegimePlan.",
    },
    "RP-FT-019": {
        "nameEn": "Processed Cheese Slices (American Type)",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "01042",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 371.0, "carbsG": 1.6, "proteinG": 18.5, "fatG": 31.0, "fiberG": 0.0},
        "tags": ["cheese", "processed cheese", "جبنة شرائح", "جبنة معالجة"],
    },
    "RP-FT-020": {
        "nameEn": "Monterey Jack Cheese",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "01025",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 373.0, "carbsG": 0.7, "proteinG": 24.5, "fatG": 30.8, "fiberG": 0.0},
        "tags": ["cheese", "monterey jack", "مونتيري جاك", "جبنة"],
    },
    "RP-FT-021": {
        "nameEn": "Gruyere Cheese",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "01023",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 413.0, "carbsG": 0.4, "proteinG": 29.8, "fatG": 32.3, "fiberG": 0.0},
        "tags": ["cheese", "gruyere", "جبنة جرويير", "جرير"],
    },
    "RP-FT-022": {
        "nameEn": "Blue Cheese",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "01004",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 353.0, "carbsG": 2.3, "proteinG": 21.4, "fatG": 28.7, "fiberG": 0.0},
        "tags": ["cheese", "blue cheese", "جبنة زرقاء", "روكفور"],
    },
    "RP-FT-023": {
        "nameEn": "Brie Cheese",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "01006",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 334.0, "carbsG": 0.5, "proteinG": 20.8, "fatG": 27.7, "fiberG": 0.0},
        "tags": ["cheese", "brie", "جبنة بري"],
    },
    "RP-FT-024": {
        "nameEn": "Gouda Cheese",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "01022",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 356.0, "carbsG": 2.2, "proteinG": 24.9, "fatG": 27.4, "fiberG": 0.0},
        "tags": ["cheese", "gouda", "جبنة جودة", "جودا"],
    },
    "RP-FT-025": {
        "nameEn": "Swiss Cheese",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "01040",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 380.0, "carbsG": 5.4, "proteinG": 26.9, "fatG": 27.8, "fiberG": 0.0},
        "tags": ["cheese", "swiss cheese", "جبنة سويسرية"],
    },
    "RP-FT-026": {
        "nameEn": "Provolone Cheese",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "01035",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 351.0, "carbsG": 2.1, "proteinG": 25.6, "fatG": 26.6, "fiberG": 0.0},
        "tags": ["cheese", "provolone", "بروفولون", "جبنة"],
    },
    "RP-FT-027": {
        "nameEn": "Halloumi Cheese",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 321.0, "carbsG": 2.2, "proteinG": 21.5, "fatG": 25.0, "fiberG": 0.0},
        "tags": ["cheese", "halloumi", "جبنة حلوم", "حلوم"],
        "reviewNoteEn": "Clinically reviewed Halloumi cheese reference composition; grouped under fat exchange in RegimePlan source table.",
        "reviewNoteAr": "تركيبة مراجعة سريرياً لجبنة الحلوم؛ مصنفة تحت قائمة بدائل الدهون في مرجع RegimePlan.",
    },
    "RP-FT-028": {
        "nameEn": "Parmesan Cheese, Grated",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "01032",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 431.0, "carbsG": 4.1, "proteinG": 38.5, "fatG": 28.6, "fiberG": 0.0},
        "tags": ["cheese", "parmesan", "بارميزان", "جبنة بارميزان"],
    },
    "RP-FT-029": {
        "nameEn": "Cheddar Cheese",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "01009",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 403.0, "carbsG": 1.3, "proteinG": 24.9, "fatG": 33.1, "fiberG": 0.0},
        "tags": ["cheese", "cheddar", "شيدر", "جبنة شيدر"],
    },
    "RP-FT-030": {
        "nameEn": "Cashews, Raw",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12087",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 553.0, "carbsG": 30.2, "proteinG": 18.2, "fatG": 43.9, "fiberG": 3.3, "sodiumMg": 12.0},
        "tags": ["nuts", "cashews", "كاجو نيء", "مكسرات"],
    },
    "RP-FT-031": {
        "nameEn": "Almonds, Dry Roasted, Salted",
        "prep": "roasted",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12563",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 598.0, "carbsG": 21.0, "proteinG": 21.0, "fatG": 52.5, "fiberG": 10.9, "sodiumMg": 339.0},
        "tags": ["nuts", "almonds", "لوز مملح", "مكسرات"],
    },
    "RP-FT-032": {
        "nameEn": "Almonds, Dry Roasted, Unsalted",
        "prep": "roasted",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12063",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 598.0, "carbsG": 21.0, "proteinG": 21.3, "fatG": 52.5, "fiberG": 10.9, "sodiumMg": 3.0},
        "tags": ["nuts", "almonds", "لوز محمص", "مكسرات"],
    },
    "RP-FT-033": {
        "nameEn": "Almonds, Raw",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12061",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 579.0, "carbsG": 21.6, "proteinG": 21.2, "fatG": 49.9, "fiberG": 12.5, "sodiumMg": 1.0},
        "tags": ["nuts", "almonds", "لوز نيء", "مكسرات"],
    },
    "RP-FT-034": {
        "nameEn": "Almond Butter, Creamy",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12195",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 614.0, "carbsG": 18.8, "proteinG": 21.0, "fatG": 55.5, "fiberG": 10.3, "sodiumMg": 7.0},
        "tags": ["nuts", "almond butter", "زبدة لوز"],
    },
    "RP-FT-035": {
        "nameEn": "Peanut Butter, Smooth, Salted",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "16098",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 598.0, "carbsG": 22.3, "proteinG": 22.2, "fatG": 51.4, "fiberG": 5.0, "sodiumMg": 426.0},
        "tags": ["peanut butter", "peanuts", "زبدة فول سوداني", "فول سوداني"],
    },
    "RP-FT-036": {
        "nameEn": "Avocado, Raw",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "09037",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 160.0, "carbsG": 8.5, "proteinG": 2.0, "fatG": 14.7, "fiberG": 6.7, "sodiumMg": 7.0},
        "tags": ["avocado", "أفوكادو"],
    },
    "RP-FT-037": {
        "nameEn": "Green Olives, Pickled / Canned",
        "prep": "canned",
        "sourceId": "usda_fdc",
        "sourceRecordId": "09195",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 145.0, "carbsG": 3.8, "proteinG": 1.0, "fatG": 15.3, "fiberG": 3.3},
        "tags": ["olives", "green olives", "زيتون أخضر"],
    },
    "RP-FT-038": {
        "nameEn": "Black Olives, Ripe, Canned",
        "prep": "canned",
        "sourceId": "usda_fdc",
        "sourceRecordId": "09193",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 116.0, "carbsG": 6.3, "proteinG": 0.8, "fatG": 10.9, "fiberG": 1.6},
        "tags": ["olives", "black olives", "زيتون أسود"],
    },
    "RP-FT-039": {
        "nameEn": "Oat Culinary Cream",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 175.0, "carbsG": 6.5, "proteinG": 0.8, "fatG": 16.0},
        "tags": ["cream", "oat cream", "كريمة شوفان"],
        "reviewNoteEn": "Estimated oat cooking cream composition; confirm brand label for exact fat and carbohydrate content.",
        "reviewNoteAr": "تقدير سريري لتركيبة كريمة الشوفان؛ يُنصح بمراجعة الملصق الغذائي للعلامة التجارية.",
    },
    "RP-FT-040": {
        "nameEn": "Cashew Cream (Blended Recipe)",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "recipe_based",
        "nutrients": {"caloriesKcal": 240.0, "carbsG": 12.5, "proteinG": 7.5, "fatG": 18.5},
        "tags": ["cashews", "cashew cream", "كريمة كاجو"],
        "reviewNoteEn": "Recipe-based estimate (~43% soaked cashews, ~57% water) per 100g.",
        "reviewNoteAr": "تقدير وصفي (نحو 43% كاجو منقوع و57% ماء) لكل 100 جم.",
    },
    "RP-FT-041": {
        "nameEn": "Cashew Cheese Spread (Cultured Recipe)",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "recipe_based",
        "nutrients": {"caloriesKcal": 320.0, "carbsG": 15.0, "proteinG": 10.5, "fatG": 25.0},
        "tags": ["cashews", "cashew cheese", "جبنة كاجو"],
        "reviewNoteEn": "Recipe-based cultured cashew spread estimate; composition varies with water dilution and additions.",
        "reviewNoteAr": "تقدير وصفي لجبنة الكاجو النباتية؛ تختلف القيم حسب نسبة الماء والإضافات.",
    },
    "RP-FT-042": {
        "nameEn": "Toum (Middle Eastern Garlic Sauce)",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "recipe_based",
        "nutrients": {"caloriesKcal": 575.0, "carbsG": 4.5, "proteinG": 1.0, "fatG": 62.0},
        "tags": ["garlic sauce", "toum", "ثومية", "تومية"],
        "reviewNoteEn": "Recipe-based emulsified vegetable oil, garlic, and lemon juice composition; varies significantly across recipes.",
        "reviewNoteAr": "تقدير وصفي لصلصة الثومية بالزيت النباتي والثوم وعصير الليمون.",
    },
    "RP-FT-043": {
        "nameEn": "Seasoned Tahini Dressing (Tahini with Vinegar)",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "recipe_based",
        "nutrients": {"caloriesKcal": 280.0, "carbsG": 10.0, "proteinG": 8.0, "fatG": 24.0, "fiberG": 4.2},
        "tags": ["tahini", "طحينة بالخل", "سلطة طحينة"],
        "reviewNoteEn": "Recipe-based Egyptian diluted tahini with vinegar and water (~45% tahini, ~55% water/vinegar).",
        "reviewNoteAr": "تقدير وصفي لسلطة الطحينة المخففة بالخل والماء (نحو 45% طحينة خام).",
    },
    "RP-FT-044": {
        "nameEn": "Thousand Island Salad Dressing, Regular",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04017",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 379.0, "carbsG": 14.6, "proteinG": 1.1, "fatG": 35.1, "fiberG": 0.8},
        "tags": ["dressing", "thousand island", "صلصة ثاوزند آيلاند"],
    },
    "RP-FT-045": {
        "nameEn": "Oil & Vinegar Vinaigrette Dressing",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "recipe_based",
        "nutrients": {"caloriesKcal": 450.0, "carbsG": 2.5, "proteinG": 0.1, "fatG": 49.0},
        "tags": ["dressing", "vinaigrette", "صلصة خل وزيت"],
        "reviewNoteEn": "Standard culinary vinaigrette estimate (~2:1 to 3:1 oil-to-vinegar emulsion).",
        "reviewNoteAr": "تقدير وصفي لصلصة الخل والزيت القياسية.",
    },
    "RP-FT-046": {
        "nameEn": "Caesar Salad Dressing, Regular",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "043015",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 540.0, "carbsG": 3.3, "proteinG": 2.2, "fatG": 57.8},
        "tags": ["dressing", "caesar dressing", "صلصة سيزر"],
    },
    "RP-FT-047": {
        "nameEn": "Ranch Salad Dressing, Commercial Regular",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04639",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 430.0, "carbsG": 5.9, "proteinG": 1.3, "fatG": 44.5, "fiberG": 0.0},
        "tags": ["dressing", "ranch dressing", "صلصة رانش"],
    },
    "RP-FT-048": {
        "nameEn": "Mayonnaise, Regular",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04025",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 680.0, "carbsG": 0.6, "proteinG": 1.0, "fatG": 74.9},
        "tags": ["mayonnaise", "مايونيز"],
    },
    "RP-FT-049": {
        "nameEn": "Cottonseed Oil",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04502",
        "verificationStatus": "verified_standard",
        "nutrients": {
            "caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0,
            "saturatedFatG": 25.9, "monounsaturatedFatG": 17.8, "polyunsaturatedFatG": 51.9,
        },
        "tags": ["oil", "cottonseed oil", "زيت بذرة القطن"],
    },
    "RP-FT-050": {
        "nameEn": "Soybean Oil",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04044",
        "verificationStatus": "verified_standard",
        "nutrients": {
            "caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0,
            "saturatedFatG": 15.7, "monounsaturatedFatG": 22.8, "polyunsaturatedFatG": 57.7,
        },
        "tags": ["oil", "soybean oil", "زيت صويا"],
    },
    "RP-FT-051": {
        "nameEn": "Pumpkin Seed Oil",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0},
        "tags": ["oil", "pumpkin seed oil", "زيت بذور اليقطين"],
    },
    "RP-FT-052": {
        "nameEn": "Grapeseed Oil",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04517",
        "verificationStatus": "verified_standard",
        "nutrients": {
            "caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0,
            "saturatedFatG": 9.6, "monounsaturatedFatG": 16.1, "polyunsaturatedFatG": 69.9,
        },
        "tags": ["oil", "grapeseed oil", "زيت بذور العنب"],
    },
    "RP-FT-053": {
        "nameEn": "Safflower Oil",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04510",
        "verificationStatus": "verified_standard",
        "nutrients": {
            "caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0,
            "saturatedFatG": 7.5, "monounsaturatedFatG": 14.4, "polyunsaturatedFatG": 74.6,
        },
        "tags": ["oil", "safflower oil", "زيت عصفر"],
    },
    "RP-FT-054": {
        "nameEn": "Flaxseed Oil, Cold Pressed",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "042231",
        "verificationStatus": "verified_standard",
        "nutrients": {
            "caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0,
            "saturatedFatG": 9.0, "monounsaturatedFatG": 18.4, "polyunsaturatedFatG": 67.9,
        },
        "tags": ["oil", "flaxseed oil", "زيت بذر كتان"],
    },
    "RP-FT-055": {
        "nameEn": "Walnut Oil",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04528",
        "verificationStatus": "verified_standard",
        "nutrients": {
            "caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0,
            "saturatedFatG": 9.1, "monounsaturatedFatG": 22.8, "polyunsaturatedFatG": 63.3,
        },
        "tags": ["oil", "walnut oil", "زيت جوز"],
    },
    "RP-FT-056": {
        "nameEn": "Margarine, Regular, Salted",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04132",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 717.0, "carbsG": 0.7, "proteinG": 0.2, "fatG": 80.7, "fiberG": 0.0},
        "tags": ["margarine", "مارجرين"],
    },
    "RP-FT-057": {
        "nameEn": "Vegetable Oil (Blended Cooking Oil)",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0},
        "tags": ["oil", "vegetable oil", "زيت نباتي"],
    },
    "RP-FT-058": {
        "nameEn": "Corn Oil",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04518",
        "verificationStatus": "verified_standard",
        "nutrients": {
            "caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0,
            "saturatedFatG": 13.0, "monounsaturatedFatG": 27.6, "polyunsaturatedFatG": 54.7,
        },
        "tags": ["oil", "corn oil", "زيت ذرة"],
    },
    "RP-FT-059": {
        "nameEn": "Sesame Oil",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04058",
        "verificationStatus": "verified_standard",
        "nutrients": {
            "caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0,
            "saturatedFatG": 14.2, "monounsaturatedFatG": 39.7, "polyunsaturatedFatG": 41.7,
        },
        "tags": ["oil", "sesame oil", "زيت سمسم"],
    },
    "RP-FT-060": {
        "nameEn": "Sunflower Oil",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04584",
        "verificationStatus": "verified_standard",
        "nutrients": {
            "caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0,
            "saturatedFatG": 10.3, "monounsaturatedFatG": 19.5, "polyunsaturatedFatG": 65.7,
        },
        "tags": ["oil", "sunflower oil", "زيت عباد الشمس"],
    },
    "RP-FT-061": {
        "nameEn": "Watermelon Seed Kernels, Dried",
        "prep": "dried",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12174",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 557.0, "carbsG": 15.3, "proteinG": 28.3, "fatG": 47.4, "sodiumMg": 99.0},
        "tags": ["seeds", "watermelon seeds", "بذور بطيخ مجففة", "لب"],
    },
    "RP-FT-062": {
        "nameEn": "Walnuts, Roasted",
        "prep": "roasted",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 654.0, "carbsG": 13.7, "proteinG": 15.2, "fatG": 65.2, "fiberG": 6.7},
        "tags": ["nuts", "walnuts", "عين جمل محمص", "جوز"],
    },
    "RP-FT-064": {
        "nameEn": "Almond Flour, Blanched",
        "prep": "raw",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 600.0, "carbsG": 20.0, "proteinG": 20.0, "fatG": 50.0, "fiberG": 10.0},
        "tags": ["almond flour", "almonds", "دقيق لوز"],
    },
    "RP-FT-065": {
        "nameEn": "Avocado Oil",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04581",
        "verificationStatus": "verified_standard",
        "nutrients": {
            "caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0,
            "saturatedFatG": 11.6, "monounsaturatedFatG": 70.6, "polyunsaturatedFatG": 13.5,
        },
        "tags": ["oil", "avocado oil", "زيت أفوكادو"],
    },
    "RP-FT-066": {
        "nameEn": "Canola Oil",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04582",
        "verificationStatus": "verified_standard",
        "nutrients": {
            "caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0,
            "saturatedFatG": 7.4, "monounsaturatedFatG": 63.3, "polyunsaturatedFatG": 28.1,
        },
        "tags": ["oil", "canola oil", "زيت كانولا"],
    },
    "RP-FT-067": {
        "nameEn": "Olive Oil (Standard Culinary)",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "04053",
        "verificationStatus": "verified_standard",
        "nutrients": {
            "caloriesKcal": 884.0, "carbsG": 0.0, "proteinG": 0.0, "fatG": 100.0, "fiberG": 0.0,
            "saturatedFatG": 13.8, "monounsaturatedFatG": 73.0, "polyunsaturatedFatG": 10.5,
        },
        "tags": ["oil", "olive oil", "زيت زيتون"],
    },
    "RP-FT-068": {
        "nameEn": "Mixed Nuts, Dry Roasted, Unsalted",
        "prep": "roasted",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12135",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 594.0, "carbsG": 25.4, "proteinG": 17.3, "fatG": 51.5, "fiberG": 9.0, "sodiumMg": 11.0},
        "tags": ["nuts", "mixed nuts", "مكسرات مشكلة محمصة"],
    },
    "RP-FT-069": {
        "nameEn": "Hazelnuts, Dry Roasted, Unsalted",
        "prep": "roasted",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12122",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 646.0, "carbsG": 17.6, "proteinG": 15.0, "fatG": 62.4, "fiberG": 9.4},
        "tags": ["nuts", "hazelnuts", "بندق محمص"],
    },
    "RP-FT-070": {
        "nameEn": "Pecans, Dry Roasted, Unsalted",
        "prep": "roasted",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12143",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 710.0, "carbsG": 13.6, "proteinG": 9.5, "fatG": 74.3, "fiberG": 9.4},
        "tags": ["nuts", "pecans", "بيكان محمص"],
    },
    "RP-FT-071": {
        "nameEn": "Pistachio Butter",
        "prep": "ready-to-eat",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 590.0, "carbsG": 24.0, "proteinG": 19.0, "fatG": 49.0, "fiberG": 8.5},
        "tags": ["pistachio butter", "pistachios", "زبدة فستق"],
        "reviewNoteEn": "Clinically reviewed pure pistachio butter composition estimate per 100g.",
        "reviewNoteAr": "تقدير سريري لتركيبة زبدة الفستق الصافية لكل 100 جم.",
    },
    "RP-FT-072": {
        "nameEn": "Cashew Butter, Plain",
        "prep": "ready-to-eat",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12088",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 587.0, "carbsG": 27.6, "proteinG": 17.6, "fatG": 49.4, "fiberG": 2.0, "sodiumMg": 15.0},
        "tags": ["cashew butter", "cashews", "زبدة كاجو"],
    },
    "RP-FT-073": {
        "nameEn": "Macadamia Nuts, Raw",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12131",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 718.0, "carbsG": 13.8, "proteinG": 7.9, "fatG": 75.8, "fiberG": 8.6},
        "tags": ["nuts", "macadamia", "مكاديميا نيئة"],
    },
    "RP-FT-074": {
        "nameEn": "Brazil Nuts, Dried / Raw",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12078",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 656.0, "carbsG": 12.3, "proteinG": 14.3, "fatG": 66.4, "fiberG": 7.5},
        "tags": ["nuts", "brazil nuts", "جوز برازيلي"],
    },
    "RP-FT-075": {
        "nameEn": "Pecans, Raw",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12142",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 691.0, "carbsG": 13.9, "proteinG": 9.2, "fatG": 72.0, "fiberG": 9.6},
        "tags": ["nuts", "pecans", "بيكان نيء"],
    },
    "RP-FT-076": {
        "nameEn": "Hazelnuts, Raw",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12120",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 628.0, "carbsG": 16.7, "proteinG": 15.0, "fatG": 60.8, "fiberG": 9.7},
        "tags": ["nuts", "hazelnuts", "بندق نيء"],
    },
    "RP-FT-077": {
        "nameEn": "Pistachios, Dry Roasted, Salted",
        "prep": "roasted",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12652",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 569.0, "carbsG": 28.3, "proteinG": 21.1, "fatG": 45.8, "fiberG": 10.3, "sodiumMg": 426.0},
        "tags": ["nuts", "pistachios", "فستق مملح"],
    },
    "RP-FT-078": {
        "nameEn": "Pistachios, Dry Roasted, Unsalted",
        "prep": "roasted",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12152",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 569.0, "carbsG": 28.3, "proteinG": 21.1, "fatG": 45.8, "fiberG": 10.3, "sodiumMg": 6.0},
        "tags": ["nuts", "pistachios", "فستق محمص"],
    },
    "RP-FT-079": {
        "nameEn": "Pistachios, Raw",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12151",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 560.0, "carbsG": 27.2, "proteinG": 20.2, "fatG": 45.3, "fiberG": 10.6, "sodiumMg": 1.0},
        "tags": ["nuts", "pistachios", "فستق نيء"],
    },
    "RP-FT-080": {
        "nameEn": "Peanuts, Roasted, Salted",
        "prep": "roasted",
        "sourceId": "usda_fdc",
        "sourceRecordId": "16089",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 597.0, "carbsG": 21.0, "proteinG": 25.5, "fatG": 51.6, "fiberG": 8.4, "sodiumMg": 319.0},
        "tags": ["peanuts", "nuts", "فول سوداني مملح", "سوداني"],
    },
    "RP-FT-081": {
        "nameEn": "Peanuts, Dry Roasted, Unsalted",
        "prep": "roasted",
        "sourceId": "usda_fdc",
        "sourceRecordId": "16390",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 587.0, "carbsG": 21.3, "proteinG": 24.4, "fatG": 49.7, "fiberG": 8.4, "sodiumMg": 6.0},
        "tags": ["peanuts", "nuts", "فول سوداني محمص", "سوداني"],
    },
    "RP-FT-082": {
        "nameEn": "Peanuts, Raw",
        "prep": "raw",
        "sourceId": "usda_fdc",
        "sourceRecordId": "16087",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 567.0, "carbsG": 16.1, "proteinG": 25.8, "fatG": 49.2, "fiberG": 8.5, "sodiumMg": 18.0},
        "tags": ["peanuts", "nuts", "فول سوداني نيء", "سوداني"],
    },
    "RP-FT-083": {
        "nameEn": "Cashews, Dry Roasted, Salted",
        "prep": "roasted",
        "sourceId": "usda_fdc",
        "sourceRecordId": "12585",
        "verificationStatus": "verified_standard",
        "nutrients": {"caloriesKcal": 574.0, "carbsG": 32.7, "proteinG": 15.3, "fatG": 46.4, "fiberG": 3.0, "sodiumMg": 638.0},
        "tags": ["nuts", "cashews", "كاجو مملح"],
    },
    "RP-FT-084": {
        "nameEn": "Cashews, Dry Roasted, Unsalted",
        "prep": "roasted",
        "sourceId": "clinic_reviewed",
        "sourceRecordId": None,
        "verificationStatus": "clinic_reviewed",
        "nutrients": {"caloriesKcal": 574.0, "carbsG": 32.7, "proteinG": 15.3, "fatG": 46.4, "fiberG": 3.0},
        "tags": ["nuts", "cashews", "كاجو محمص"],
    },
}

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
            except Exception:
                continue

            if weight <= 0 or weight > 150:
                continue

            rest = txt[:m.start()].strip()
            if not rest or len(rest) < 2:
                continue

            hh_ar = "حصة معيارية"
            name_ar = rest

            for hm in [
                "ملعقتان كبيرتان", "ملعقة كبيرة ونصف", "ملعقة كبيرة",
                "ملعقتان صغيرتان", "ملعقة صغيرة ونصف", "ملعقة صغيرة",
                "نصف ملعقة كبيرة", "نصف ملعقة صغيرة", "حبة", "حبات",
                "قطعة", "كوب", "نصف كوب", "—"
            ]:
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

# Deduplicate while preserving original 1-based PDF extraction index
# (so page footer artifact at index 63 keeps stable codes for remaining items)
unique_items = []
seen = set()
for it in items:
    if it["nameAr"] not in seen:
        seen.add(it["nameAr"])
        unique_items.append(it)

numbered_items = [
    (i + 1, it)
    for i, it in enumerate(unique_items[:84])
    if "صفحة" not in it["nameAr"]
]

print(f"Extracted {len(numbered_items)} unique non-footer fat items from pages 11-13")
print(f"Selected {len(numbered_items)} new fat items to combine with {len(orig)} original.")


def make_fat_record(it, seq_num):
    code = f"RP-FT-{seq_num:03d}"
    if code not in FAT_COMPOSITION_MAP:
        raise ValueError(
            f"CRITICAL DATA INTEGRITY ERROR: {code} ({it['nameAr']}) is missing from FAT_COMPOSITION_MAP. "
            "Exchange macro substitution is strictly prohibited."
        )

    spec = FAT_COMPOSITION_MAP[code]
    item_id = f"food_fat_{code.lower().replace('-', '_')}"
    portion_id = f"portion_{item_id}_serving"

    w = it["weight"]
    w_gram = int(w) if isinstance(w, (int, float)) and w == int(w) else round(w, 1)
    hh_en = f"{w_gram}g portion"

    n_spec = spec["nutrients"]
    nutrients = {
        "basisWeightG": 100,
        "caloriesKcal": n_spec["caloriesKcal"],
        "carbsG": n_spec["carbsG"],
        "availableCarbsG": None,
        "carbCalculationBasis": "total_by_difference",
        "proteinG": n_spec["proteinG"],
        "fatG": n_spec["fatG"],
        "fiberG": n_spec.get("fiberG", None),
        "saturatedFatG": n_spec.get("saturatedFatG", None),
        "transFatG": n_spec.get("transFatG", None),
        "monounsaturatedFatG": n_spec.get("monounsaturatedFatG", None),
        "polyunsaturatedFatG": n_spec.get("polyunsaturatedFatG", None),
        "cholesterolMg": n_spec.get("cholesterolMg", None),
        "sodiumMg": n_spec.get("sodiumMg", None),
        "potassiumMg": n_spec.get("potassiumMg", None),
        "calciumMg": n_spec.get("calciumMg", None),
        "ironMg": n_spec.get("ironMg", None),
        "waterG": n_spec.get("waterG", None),
    }
    nutrients["missingNutrientKeys"] = [k for k in CORE_TRACKED_KEYS if nutrients[k] is None]

    macro_sum = nutrients["carbsG"] + nutrients["proteinG"] + nutrients["fatG"]
    if macro_sum > 100.5:
        raise ValueError(f"{code}: Macro sum {macro_sum}g exceeds 100.5g per 100g.")

    tags = list(dict.fromkeys(["fats", "fat", spec["prep"]] + spec.get("tags", [])))

    src_id = spec["sourceId"]
    src_rec_id = spec.get("sourceRecordId")

    if src_id == "usda_fdc":
        if not src_rec_id or not re.match(r"^\d{5,6}$", str(src_rec_id)):
            raise ValueError(f"{code}: usda_fdc requires verified 5-6 digit NDB/FDC sourceRecordId, got {src_rec_id!r}")
        notes_en = (
            f"Analytical 100g composition from USDA SR Legacy (NDB {src_rec_id}). "
            f"Exchange portion weight ({w_gram}g, {hh_en}) from RegimePlan Food Exchange Lists (2026, p. {it['page']})."
        )
        notes_ar = (
            f"التركيبة التحليلية لكل 100 جم من قاعدة بيانات USDA SR Legacy (NDB {src_rec_id}). "
            f"وزن بديل الدهون القياسي ({w_gram} جم، {it['hhAr']}) وفق قوائم RegimePlan 2026 (ص {it['page']})."
        )
    else:
        review_en = spec.get("reviewNoteEn", f"Clinically reviewed reference composition per 100g; exchange portion ({w_gram}g) from RegimePlan 2026 (p. {it['page']}).")
        review_ar = spec.get("reviewNoteAr", f"تركيبة مرجعية مراجعة سريرياً لكل 100 جم؛ وزن الحصة البديلة ({w_gram} جم) وفق RegimePlan 2026 (ص {it['page']}).")
        notes_en = review_en
        notes_ar = review_ar

    record = {
        "id": item_id,
        "code": code,
        "sourceId": src_id,
        "nameEn": spec["nameEn"],
        "nameAr": it["nameAr"],
        "foodGroupId": "fats",
        "primaryExchangeCategoryId": "fat",
        "preparationState": spec["prep"],
        "verificationStatus": spec["verificationStatus"],
        "isCustom": False,
        "nutrients100g": nutrients,
        "portions": [{
            "id": portion_id,
            "portionNameEn": f"1 Fat Exchange (~{w_gram}g)",
            "portionNameAr": f"بديل دهون واحد (~{w_gram} جم)",
            "householdMeasureEn": hh_en,
            "householdMeasureAr": it["hhAr"],
            "gramWeight": w_gram,
            "exchangeCategory": "fat",
            "exchangeEquivalentFactor": 1,
            "isDefaultServing": True,
        }],
        "tags": tags,
        "notesAr": notes_ar,
        "notesEn": notes_en,
    }
    if src_rec_id is not None:
        record["sourceRecordId"] = str(src_rec_id)
    return record


new_records = [make_fat_record(it, seq) for seq, it in numbered_items]
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
