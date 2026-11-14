# -*- coding: utf-8 -*-
"""
Nutrition Clinic Pro - Legumes Generator
Applies analytical overrides for confirmed soy, chickpea, lentil, bean, and flour items,
strictly separating 100g composition from exchange portion definitions.
"""

import json
import os
import re

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.environ.get("NCP_CATALOG_OUT_DIR") or os.path.join(BASE_DIR, "src", "clinical", "food", "data")
os.makedirs(OUT_DIR, exist_ok=True)
OUT_PATH = os.path.join(OUT_DIR, "legumes.ts")

with open(os.path.join(BASE_DIR, "scripts/original_30_grouped.json"), "r", encoding="utf-8") as f:
    orig = json.load(f)["legumes"]

# 29 new legume items from PDF p. 7 & 8
# RegimePlan 2026 p. 1 legume exchange reference: 118 kcal, 15g carb, 10g pro, 2g fat
RAW_LEGUMES = [
    ("فول جاف نيء", "Raw Dry Fava Beans", 35, "3 ملاعق كبيرة ونصف", "3.5 tbsp", "raw", "RP-LEG-001", 7),
    ("عدس بني مطبوخ", "Cooked Brown Lentils (RegimePlan)", 99, "نصف كوب", "1/2 cup", "cooked", "RP-LEG-002", 7),
    ("حمص مطبوخ", "Cooked Chickpeas (Garbanzo)", 82, "نصف كوب", "1/2 cup", "cooked", "RP-LEG-003", 7),
    ("فاصوليا سوداء مطبوخة", "Cooked Black Beans", 86, "نصف كوب", "1/2 cup", "cooked", "RP-LEG-004", 7),
    ("فاصوليا حمراء مطبوخة", "Cooked Red Kidney Beans", 89, "نصف كوب", "1/2 cup", "cooked", "RP-LEG-005", 7),
    ("فول صويا مطبوخ", "Cooked Soybeans", 99, "نصف كوب", "1/2 cup", "cooked", "RP-LEG-006", 7),
    ("عدس بني نيء", "Raw Brown Lentils", 32, "ملعقتان كبيرتان ونصف", "2.5 tbsp", "raw", "RP-LEG-007", 7),
    ("حمص حب نيء", "Raw Chickpeas", 35, "ملعقتان كبيرتان ونصف", "2.5 tbsp", "raw", "RP-LEG-008", 7),
    ("فاصوليا ليما مطبوخة", "Cooked Lima Beans", 96, "نصف كوب", "1/2 cup", "cooked", "RP-LEG-009", 7),
    ("فاصوليا بيضاء صغيرة مطبوخة", "Cooked Small Navy Beans", 84, "نصف كوب", "1/2 cup", "cooked", "RP-LEG-010", 7),
    ("إدامامي مسلوق", "Boiled Edamame (Soybean Pods)", 120, "ثلاثة أرباع كوب", "3/4 cup", "cooked", "RP-LEG-011", 7),
    ("ماش مطبوخ", "Cooked Mung Beans", 105, "نصف كوب", "1/2 cup", "cooked", "RP-LEG-012", 7),
    ("عدس أصفر مطبوخ", "Cooked Yellow Lentils", 78, "6 ملاعق كبيرة ونصف", "6.5 tbsp", "cooked", "RP-LEG-013", 7),
    ("فاصوليا بينتو مطبوخة", "Cooked Pinto Beans", 80, "نصف كوب", "1/2 cup", "cooked", "RP-LEG-014", 7),
    ("فاصوليا بيضاء كانيليني مطبوخة", "Cooked Cannellini White Beans", 78, "7 ملاعق كبيرة", "7 tbsp", "cooked", "RP-LEG-015", 7),
    ("لوبيا مطبوخة", "Cooked Black-Eyed Peas (Cowpeas)", 97, "نصف كوب", "1/2 cup", "cooked", "RP-LEG-016", 7),
    ("بسلة مجروشة مطبوخة", "Cooked Split Yellow/Green Peas", 93, "نصف كوب", "1/2 cup", "cooked", "RP-LEG-017", 7),
    ("ترمس مطبوخ حلو", "Cooked Lupini / Termis Beans", 100, "ثلثا كوب", "2/3 cup", "cooked", "RP-LEG-018", 7),
    ("حمص محمص (قضامة)", "Dry Roasted Chickpeas (Qedameh)", 32, "ثلث كوب", "1/3 cup", "ready-to-eat", "RP-LEG-019", 7),
    ("دال توور مطبوخ", "Cooked Toor Dal (Yellow Pigeon Peas)", 98, "نصف كوب", "1/2 cup", "cooked", "RP-LEG-020", 7),
    ("دال أوراد مطبوخ", "Cooked Urad Dal (Black Gram)", 105, "نصف كوب", "1/2 cup", "cooked", "RP-LEG-021", 7),
    ("دال حمص شانا مطبوخ", "Cooked Chana Dal", 78, "7 ملاعق كبيرة", "7 tbsp", "cooked", "RP-LEG-022", 7),
    ("فول مدمس معلب مصفى", "Canned Fava Beans (Drained)", 150, "نصف كوب", "1/2 cup", "ready-to-eat", "RP-LEG-023", 7),
    ("فول أخضر حراتي طازج", "Fresh Green Fava Beans (Harati)", 150, "كوب ونصف", "1.5 cup", "raw", "RP-LEG-024", 7),
    ("عدس أصفر نيء", "Raw Yellow Lentils", 32, "ملعقتان كبيرتان ونصف", "2.5 tbsp", "raw", "RP-LEG-025", 7),
    ("حمص معلب مصفى", "Canned Chickpeas (Drained)", 98, "ثلثا كوب", "2/3 cup", "ready-to-eat", "RP-LEG-026", 7),
    ("دقيق حمص طبيعي", "Chickpea Besan Flour", 34, "6 ملاعق كبيرة", "6 tbsp", "raw", "RP-LEG-027", 7),
    ("فاصوليا سوداء نيئة", "Raw Dry Black Beans", 32, "ملعقتان كبيرتان ونصف", "2.5 tbsp", "raw", "RP-LEG-028", 8),
    ("فاصوليا حمراء نيئة", "Raw Dry Red Kidney Beans", 33, "ملعقتان كبيرتان ونصف", "2.5 tbsp", "raw", "RP-LEG-029", 8),
]

LEG_USDA_SR_PROFILES = {
    "RP-LEG-002": {"sourceRecordId": "16070", "nutrients": {"caloriesKcal": 116.0, "carbsG": 20.1, "proteinG": 9.02, "fatG": 0.38, "fiberG": 7.9, "saturatedFatG": 0.053, "transFatG": 0.0, "monounsaturatedFatG": 0.064, "polyunsaturatedFatG": 0.175, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 369.0, "calciumMg": 19.0, "ironMg": 3.33, "waterG": 69.6}},
    "RP-LEG-003": {"sourceRecordId": "16057", "nutrients": {"caloriesKcal": 164.0, "carbsG": 27.4, "proteinG": 8.86, "fatG": 2.59, "fiberG": 7.6, "saturatedFatG": 0.269, "transFatG": 0.0, "monounsaturatedFatG": 0.583, "polyunsaturatedFatG": 1.16, "cholesterolMg": 0.0, "sodiumMg": 7.0, "potassiumMg": 291.0, "calciumMg": 49.0, "ironMg": 2.89, "waterG": 60.2}},
    "RP-LEG-004": {"sourceRecordId": "16015", "nutrients": {"caloriesKcal": 132.0, "carbsG": 23.7, "proteinG": 8.86, "fatG": 0.54, "fiberG": 8.7, "saturatedFatG": 0.139, "transFatG": 0.0, "monounsaturatedFatG": 0.047, "polyunsaturatedFatG": 0.231, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 355.0, "calciumMg": 27.0, "ironMg": 2.1, "waterG": 65.7}},
    "RP-LEG-006": {"sourceRecordId": "16109", "nutrients": {"caloriesKcal": 172.0, "carbsG": 8.36, "proteinG": 18.2, "fatG": 8.97, "fiberG": 6.0, "saturatedFatG": 1.3, "transFatG": 0.0, "monounsaturatedFatG": 1.98, "polyunsaturatedFatG": 5.06, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 515.0, "calciumMg": 102.0, "ironMg": 5.14, "waterG": 62.6}},
    "RP-LEG-009": {"sourceRecordId": "16072", "nutrients": {"caloriesKcal": 115.0, "carbsG": 20.9, "proteinG": 7.8, "fatG": 0.38, "fiberG": 7.0, "saturatedFatG": 0.089, "transFatG": 0.0, "monounsaturatedFatG": 0.034, "polyunsaturatedFatG": 0.171, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 508.0, "calciumMg": 17.0, "ironMg": 2.39, "waterG": 69.8}},
    "RP-LEG-010": {"sourceRecordId": "16038", "nutrients": {"caloriesKcal": 140.0, "carbsG": 26.0, "proteinG": 8.23, "fatG": 0.62, "fiberG": 10.5, "saturatedFatG": 0.098, "transFatG": 0.0, "monounsaturatedFatG": 0.142, "polyunsaturatedFatG": 0.49, "sodiumMg": 0.0, "potassiumMg": 389.0, "calciumMg": 69.0, "ironMg": 2.36, "waterG": 63.8}},
    "RP-LEG-011": {"sourceRecordId": "11212", "nutrients": {"caloriesKcal": 121.0, "carbsG": 8.91, "proteinG": 11.9, "fatG": 5.2, "fiberG": 5.2, "saturatedFatG": 0.62, "transFatG": 0.009, "monounsaturatedFatG": 1.28, "polyunsaturatedFatG": 2.16, "cholesterolMg": 0.0, "sodiumMg": 6.0, "potassiumMg": 436.0, "calciumMg": 63.0, "ironMg": 2.27, "waterG": 72.8}},
    "RP-LEG-012": {"sourceRecordId": "16081", "nutrients": {"caloriesKcal": 105.0, "carbsG": 19.2, "proteinG": 7.02, "fatG": 0.38, "fiberG": 7.6, "saturatedFatG": 0.116, "transFatG": 0.0, "monounsaturatedFatG": 0.054, "polyunsaturatedFatG": 0.128, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 266.0, "calciumMg": 27.0, "ironMg": 1.4, "waterG": 72.7}},
    "RP-LEG-014": {"sourceRecordId": "16043", "nutrients": {"caloriesKcal": 143.0, "carbsG": 26.2, "proteinG": 9.01, "fatG": 0.65, "fiberG": 9.0, "saturatedFatG": 0.136, "transFatG": 0.0, "monounsaturatedFatG": 0.133, "polyunsaturatedFatG": 0.235, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 436.0, "calciumMg": 46.0, "ironMg": 2.09, "waterG": 63.0}},
    "RP-LEG-015": {"sourceRecordId": "16050", "nutrients": {"caloriesKcal": 139.0, "carbsG": 25.1, "proteinG": 9.73, "fatG": 0.35, "fiberG": 6.3, "saturatedFatG": 0.091, "transFatG": 0.0, "monounsaturatedFatG": 0.031, "polyunsaturatedFatG": 0.152, "cholesterolMg": 0.0, "sodiumMg": 6.0, "potassiumMg": 561.0, "calciumMg": 90.0, "ironMg": 3.7, "waterG": 63.1}},
    "RP-LEG-028": {"sourceRecordId": "16014", "nutrients": {"caloriesKcal": 341.0, "carbsG": 62.4, "proteinG": 21.6, "fatG": 1.42, "fiberG": 15.5, "saturatedFatG": 0.366, "transFatG": 0.0, "monounsaturatedFatG": 0.123, "polyunsaturatedFatG": 0.61, "cholesterolMg": 0.0, "sodiumMg": 5.0, "potassiumMg": 1480.0, "calciumMg": 123.0, "ironMg": 5.02, "waterG": 11.0}},
    "RP-LEG-029": {"sourceRecordId": "16027", "nutrients": {"caloriesKcal": 333.0, "carbsG": 60.0, "proteinG": 23.6, "fatG": 0.83, "fiberG": 24.9, "saturatedFatG": 0.12, "transFatG": 0.0, "monounsaturatedFatG": 0.064, "polyunsaturatedFatG": 0.457, "cholesterolMg": 0.0, "sodiumMg": 24.0, "potassiumMg": 1410.0, "calciumMg": 143.0, "ironMg": 8.2, "waterG": 11.8}},
}

LEG_ANALYTICAL_OVERRIDES = {
    "RP-LEG-001": {"caloriesKcal": 341.0, "carbsG": 58.3, "proteinG": 26.1, "fatG": 1.5, "fiberG": 25.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-LEG-005": {"caloriesKcal": 127.0, "carbsG": 22.8, "proteinG": 8.7, "fatG": 0.5, "fiberG": 6.4, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-LEG-007": {"caloriesKcal": 352.0, "carbsG": 63.4, "proteinG": 24.6, "fatG": 1.1, "fiberG": 10.7, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-LEG-008": {"caloriesKcal": 378.0, "carbsG": 63.0, "proteinG": 20.5, "fatG": 6.0, "fiberG": 12.2, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-LEG-016": {"caloriesKcal": 116.0, "carbsG": 20.8, "proteinG": 7.7, "fatG": 0.5, "fiberG": 6.5, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-LEG-017": {"caloriesKcal": 118.0, "carbsG": 21.1, "proteinG": 8.3, "fatG": 0.4, "fiberG": 8.3, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-LEG-018": {"caloriesKcal": 119.0, "carbsG": 9.9, "proteinG": 15.6, "fatG": 2.9, "fiberG": 2.8, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-LEG-023": {"caloriesKcal": 110.0, "carbsG": 19.7, "proteinG": 7.6, "fatG": 0.4, "fiberG": 5.4, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-LEG-026": {"caloriesKcal": 139.0, "carbsG": 22.6, "proteinG": 7.0, "fatG": 2.6, "fiberG": 6.4, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-LEG-027": {"caloriesKcal": 387.0, "carbsG": 57.8, "proteinG": 22.4, "fatG": 6.7, "fiberG": 10.8, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
}

CORE_KEYS = [
    "caloriesKcal", "carbsG", "proteinG", "fatG",
    "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG",
    "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg",
    "calciumMg", "ironMg", "waterG"
]


def make_leg_item(raw):
    name_ar, name_en, w, hh_ar, hh_en, prep, code, page = raw
    W = float(w)
    usda_prof = LEG_USDA_SR_PROFILES.get(code)
    override = LEG_ANALYTICAL_OVERRIDES.get(code)

    if usda_prof:
        n_src = usda_prof["nutrients"]
        src_id = "usda_fdc"
        src_rec_id = usda_prof["sourceRecordId"]
        ver_status = "verified_standard"
        comp_basis = "analytical_table"
    elif override:
        n_src = override
        src_id = override.get("sourceId", "clinic_reviewed")
        src_rec_id = None
        ver_status = override.get("verificationStatus", "clinic_reviewed")
        comp_basis = "recipe_based" if ver_status == "recipe_based" else "clinic_estimated"
    else:
        n_src = {}
        src_id = "regimeplan_2026"
        src_rec_id = None
        ver_status = "clinic_reviewed"
        comp_basis = "exchange_only"

    nutrients = {
        "basisWeightG": 100,
        "caloriesKcal": n_src.get("caloriesKcal", None),
        "carbsG": n_src.get("carbsG", None),
        "availableCarbsG": None,
        "carbCalculationBasis": "total_by_difference",
        "proteinG": n_src.get("proteinG", None),
        "fatG": n_src.get("fatG", None),
        "fiberG": n_src.get("fiberG", None),
        "saturatedFatG": n_src.get("saturatedFatG", None),
        "transFatG": n_src.get("transFatG", None),
        "monounsaturatedFatG": n_src.get("monounsaturatedFatG", None),
        "polyunsaturatedFatG": n_src.get("polyunsaturatedFatG", None),
        "cholesterolMg": n_src.get("cholesterolMg", None),
        "sodiumMg": n_src.get("sodiumMg", None),
        "potassiumMg": n_src.get("potassiumMg", None),
        "calciumMg": n_src.get("calciumMg", None),
        "ironMg": n_src.get("ironMg", None),
        "waterG": n_src.get("waterG", None),
    }
    nutrients["missingNutrientKeys"] = [k for k in CORE_KEYS if nutrients[k] is None]

    if src_id == "usda_fdc":
        if not src_rec_id or not re.match(r"^\d{5,6}$", str(src_rec_id)):
            raise ValueError(f"{code}: Invalid USDA NDB ID {src_rec_id!r}")
        notes_ar = (
            f"التركيبة التحليلية لكل 100 جم من USDA SR Legacy (NDB {src_rec_id}). "
            f"وزن بديل البقوليات من RegimePlan 2026 (ص {page}): {w} جم ({hh_ar})."
        )
        notes_en = (
            f"Analytical 100g composition from USDA SR Legacy (NDB {src_rec_id}). "
            f"RegimePlan Food Exchange Lists (2026, p. {page}) legume exchange portion: {w}g ({hh_en})."
        )
    elif comp_basis == "exchange_only":
        notes_ar = (
            f"سجل بديل غذائي فقط من RegimePlan 2026 (ص {page}). "
            f"وزن الحصة البديلة: {w} جم ({hh_ar}). التركيبة التحليلية لكل 100 جم غير محللة."
        )
        notes_en = (
            f"Exchange-only food item from RegimePlan Food Exchange Lists (2026, p. {page}). "
            f"Standard legume exchange portion: {w}g ({hh_en}). Analytical 100g composition is unassayed."
        )
    else:
        notes_ar = f"تركيبة مراجعة سريرياً لكل 100 جم. وزن الحصة البديلة وفق RegimePlan 2026 (ص {page}): {w} جم ({hh_ar})."
        notes_en = f"Clinically reviewed 100g composition. RegimePlan Food Exchange Lists (2026, p. {page}) legume exchange portion: {w}g ({hh_en})."

    item_id = f"food_legume_{code.lower().replace('-', '_')}"
    record = {
        "id": item_id,
        "code": code,
        "sourceId": src_id,
        "nameEn": name_en,
        "nameAr": name_ar,
        "foodGroupId": "legumes",
        "primaryExchangeCategoryId": "plant_protein_legumes",
        "preparationState": prep,
        "verificationStatus": ver_status,
        "compositionBasis": comp_basis,
        "isCustom": False,
        "nutrients100g": nutrients,
        "portions": [{
            "id": f"portion_{item_id}_serving",
            "portionNameEn": f"1 Legume Exchange (~{w}g)",
            "portionNameAr": f"بديل بقوليات واحد (~{w} جم)",
            "householdMeasureEn": hh_en,
            "householdMeasureAr": hh_ar,
            "gramWeight": W,
            "exchangeCategory": "plant_protein_legumes",
            "exchangeEquivalentFactor": 1,
            "isDefaultServing": True
        }],
        "tags": ["legumes", "plant_protein_legumes", prep],
        "notesAr": notes_ar,
        "notesEn": notes_en,
    }
    if src_rec_id is not None:
        record["sourceRecordId"] = str(src_rec_id)
    return record


new_legs = [make_leg_item(r) for r in RAW_LEGUMES]
all_legs = orig + new_legs

header = '''/**
 * Nutrition Clinic Pro - Food Catalog: Legumes Module
 * Source: Egyptian NNI 2006, USDA FoodData Central & RegimePlan 2026
 */

import { FoodItemRecord } from '../types';

export const LEGUME_FOOD_ITEMS: FoodItemRecord[] = '''

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(header + json.dumps(all_legs, ensure_ascii=False, indent=2) + ";\n")

print(f"Generated {len(all_legs)} legumes in {OUT_PATH} (Original: {len(orig)}, New: {len(new_legs)})")
