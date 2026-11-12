# -*- coding: utf-8 -*-
import json
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_PATH = os.path.join(BASE_DIR, "src/clinical/food/data/legumes.ts")

with open(os.path.join(BASE_DIR, "scripts/original_30_grouped.json"), "r", encoding="utf-8") as f:
    orig = json.load(f)["legumes"]

# 29 new legume items from PDF p. 7 & 8
# RegimePlan 2026 p. 1 legume macros: 118 kcal, 15g carb, 10g pro, 2g fat
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

LEG_MACRO = {"caloriesKcal": 118, "carbsG": 15, "proteinG": 10, "fatG": 2}

def make_leg_item(raw):
    name_ar, name_en, w, hh_ar, hh_en, prep, code, page = raw
    W = float(w)
    kcal100 = round((LEG_MACRO["caloriesKcal"] / W) * 100, 1)
    c100 = round((LEG_MACRO["carbsG"] / W) * 100, 1)
    p100 = round((LEG_MACRO["proteinG"] / W) * 100, 1)
    f100 = round((LEG_MACRO["fatG"] / W) * 100, 1)

    item_id = f"food_legume_{code.lower().replace('-', '_')}"
    return {
        "id": item_id,
        "code": code,
        "sourceId": "regimeplan_2026",
        "nameEn": name_en,
        "nameAr": name_ar,
        "foodGroupId": "legumes",
        "primaryExchangeCategoryId": "plant_protein_legumes",
        "preparationState": prep,
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
        "notesAr": f"قوائم البدائل الغذائية RegimePlan 2026 (ص {page}). وزن الحصة البديلة: {w} جم ({hh_ar}).",
        "notesEn": f"RegimePlan Food Exchange Lists (2026, p. {page}). Standard legume exchange portion: {w}g ({hh_en})."
    }

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
