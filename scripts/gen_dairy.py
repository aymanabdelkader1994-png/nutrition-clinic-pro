# -*- coding: utf-8 -*-
"""
Nutrition Clinic Pro - Dairy & Plant Milk Alternatives Generator

Separates analytical 100g composition (USDA SR Legacy / clinical review)
from RegimePlan 2026 dairy exchange portion definitions.
"""

import json
import os
import re

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.environ.get("NCP_CATALOG_OUT_DIR") or os.path.join(BASE_DIR, "src", "clinical", "food", "data")
os.makedirs(OUT_DIR, exist_ok=True)
OUT_PATH = os.path.join(OUT_DIR, "dairy.ts")

with open(os.path.join(BASE_DIR, "scripts/original_30_grouped.json"), "r", encoding="utf-8") as f:
    orig = json.load(f)["dairy"]

RAW_DAIRY = [
    # Whole milk exchange group
    ("لبن كامل الدسم", "Whole Cow Milk", 255, "كوب", "1 cup", "ready-to-eat", "milk_whole", "RP-DA-001", 6),
    ("زبادي سادة كامل الدسم", "Plain Whole Milk Yogurt", 240, "كوب", "1 cup", "ready-to-eat", "milk_whole", "RP-DA-002", 6),
    ("زبادي يوناني سادة", "Plain Greek Yogurt (Whole)", 165, "علبة", "1 container (165g)", "ready-to-eat", "milk_whole", "RP-DA-003", 6),
    ("لبن مبخر كامل الدسم", "Evaporated Whole Milk", 120, "نصف كوب", "1/2 cup", "ready-to-eat", "milk_whole", "RP-DA-004", 6),
    ("كيفير سادة كامل الدسم", "Plain Whole Milk Kefir", 260, "كوب", "1 cup", "ready-to-eat", "milk_whole", "RP-DA-005", 6),
    ("لبن رايب كامل الدسم", "Whole Rayeb Buttermilk", 240, "كوب", "1 cup", "ready-to-eat", "milk_whole", "RP-DA-006", 6),
    ("لبن زبادي طازج", "Fresh Traditional Yogurt", 245, "كوب", "1 cup", "ready-to-eat", "milk_whole", "RP-DA-007", 6),
    ("لبن بودرة كامل الدسم", "Whole Dry Milk Powder", 31, "ربع كوب", "1/4 cup", "raw", "milk_whole", "RP-DA-008", 6),

    # Low-fat milk exchange group
    ("لبن قليل الدسم (1%-2%)", "Low-Fat Milk (1%-2%)", 245, "كوب", "1 cup", "ready-to-eat", "milk_lowfat", "RP-DA-009", 6),
    ("زبادي سادة قليل الدسم", "Low-Fat Plain Yogurt", 160, "ثلثا كوب", "2/3 cup", "ready-to-eat", "milk_lowfat", "RP-DA-010", 6),

    # Skim / Fat-free milk exchange group
    ("لبن فرز (خالي الدسم)", "Skim Milk (Fat-Free)", 240, "كوب", "1 cup", "ready-to-eat", "milk_skim", "RP-DA-011", 6),
    ("لبن مخيض (خالي الدسم)", "Nonfat Cultured Buttermilk", 245, "كوب", "1 cup", "ready-to-eat", "milk_skim", "RP-DA-012", 6),
    ("لبن بودرة خالي الدسم", "Nonfat Dry Milk Powder", 23, "ثلث كوب", "1/3 cup", "raw", "milk_skim", "RP-DA-013", 6),
    ("لبن خالي اللاكتوز منزوع الدسم", "Lactose-Free Skim Milk", 240, "كوب", "1 cup", "ready-to-eat", "milk_skim", "RP-DA-014", 6),
    ("زبادي يوناني خالي الدسم", "Nonfat Greek Yogurt", 160, "علبة", "1 container (160g)", "ready-to-eat", "milk_skim", "RP-DA-015", 6),

    # Plant milks group (mapped to lowfat dairy exchange in RegimePlan table)
    ("لبن لوز بدون سكر", "Unsweetened Almond Milk", 245, "كوب", "1 cup", "ready-to-eat", "milk_lowfat", "RP-DA-016", 6),
    ("لبن شوفان بدون سكر", "Unsweetened Oat Milk", 245, "كوب", "1 cup", "ready-to-eat", "milk_lowfat", "RP-DA-017", 6),
    ("لبن صويا بدون سكر", "Unsweetened Soy Milk", 245, "كوب", "1 cup", "ready-to-eat", "milk_lowfat", "RP-DA-018", 6),
    ("لبن أرز غير محلى", "Unsweetened Rice Milk", 245, "كوب", "1 cup", "ready-to-eat", "milk_lowfat", "RP-DA-019", 6),
    ("لبن كاجو غير محلى", "Unsweetened Cashew Milk", 245, "كوب", "1 cup", "ready-to-eat", "milk_lowfat", "RP-DA-020", 7),
    ("لبن قنب غير محلى", "Hemp Milk", 245, "كوب", "1 cup", "ready-to-eat", "milk_lowfat", "RP-DA-021", 7),
    ("لبن بسلة غير محلى", "Pea Protein Milk", 245, "كوب", "1 cup", "ready-to-eat", "milk_lowfat", "RP-DA-022", 7),
    ("لبن كتان غير محلى", "Flax Milk", 245, "كوب", "1 cup", "ready-to-eat", "milk_lowfat", "RP-DA-023", 7),
    ("لبن مكاداميا غير محلى", "Macadamia Milk", 245, "كوب", "1 cup", "ready-to-eat", "milk_lowfat", "RP-DA-024", 7),
    ("لبن جوز الهند للشرب", "Coconut Milk Beverage (Carton)", 245, "كوب", "1 cup", "ready-to-eat", "milk_lowfat", "RP-DA-025", 7),
    ("لبن لوز محلى خفيفاً", "Lightly Sweetened Almond Milk", 245, "كوب", "1 cup", "ready-to-eat", "milk_lowfat", "RP-DA-026", 7),
    ("لبن شوفان محلى خفيفاً", "Lightly Sweetened Oat Milk", 245, "كوب", "1 cup", "ready-to-eat", "milk_lowfat", "RP-DA-027", 7),
]

DAIRY_ANALYTICAL_OVERRIDES = {
    "RP-DA-001": {"caloriesKcal": 61.0, "carbsG": 4.8, "proteinG": 3.2, "fatG": 3.3, "fiberG": 0.0, "sourceId": "usda_fdc", "sourceRecordId": "01211", "verificationStatus": "verified_standard"},
    "RP-DA-002": {"caloriesKcal": 61.0, "carbsG": 4.7, "proteinG": 3.5, "fatG": 3.3, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-DA-003": {"caloriesKcal": 97.0, "carbsG": 4.0, "proteinG": 9.0, "fatG": 5.0, "fiberG": 0.0, "sourceId": "usda_fdc", "sourceRecordId": "01293", "verificationStatus": "verified_standard"},
    "RP-DA-004": {"caloriesKcal": 134.0, "carbsG": 10.0, "proteinG": 6.8, "fatG": 7.6, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-DA-005": {"caloriesKcal": 60.0, "carbsG": 4.5, "proteinG": 3.3, "fatG": 3.3, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-DA-006": {"caloriesKcal": 58.0, "carbsG": 4.6, "proteinG": 3.3, "fatG": 3.0, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-DA-007": {"caloriesKcal": 61.0, "carbsG": 4.7, "proteinG": 3.5, "fatG": 3.3, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-DA-008": {"caloriesKcal": 496.0, "carbsG": 38.4, "proteinG": 26.3, "fatG": 26.7, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-DA-009": {"caloriesKcal": 47.0, "carbsG": 4.9, "proteinG": 3.3, "fatG": 1.5, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-DA-010": {"caloriesKcal": 63.0, "carbsG": 7.0, "proteinG": 5.3, "fatG": 1.6, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-DA-011": {"caloriesKcal": 34.0, "carbsG": 5.0, "proteinG": 3.4, "fatG": 0.1, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-DA-012": {"caloriesKcal": 40.0, "carbsG": 4.8, "proteinG": 3.3, "fatG": 0.9, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-DA-013": {"caloriesKcal": 362.0, "carbsG": 52.0, "proteinG": 36.2, "fatG": 0.8, "fiberG": 0.0, "sourceId": "usda_fdc", "sourceRecordId": "01091", "verificationStatus": "verified_standard"},
    "RP-DA-014": {"caloriesKcal": 34.0, "carbsG": 5.0, "proteinG": 3.4, "fatG": 0.1, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-DA-015": {"caloriesKcal": 59.0, "carbsG": 3.6, "proteinG": 10.2, "fatG": 0.4, "fiberG": 0.0, "sourceId": "usda_fdc", "sourceRecordId": "01256", "verificationStatus": "verified_standard"},
    "RP-DA-016": {"caloriesKcal": 15, "carbsG": 0.3, "proteinG": 0.6, "fatG": 1.1},
    "RP-DA-017": {"caloriesKcal": 48, "carbsG": 6.7, "proteinG": 0.8, "fatG": 1.5},
    "RP-DA-018": {"caloriesKcal": 33, "carbsG": 1.7, "proteinG": 2.8, "fatG": 1.6},
    "RP-DA-019": {"caloriesKcal": 47, "carbsG": 9.2, "proteinG": 0.3, "fatG": 1},
    "RP-DA-020": {"caloriesKcal": 25, "carbsG": 1.5, "proteinG": 0.7, "fatG": 2},
    "RP-DA-021": {"caloriesKcal": 30, "carbsG": 0.4, "proteinG": 0.8, "fatG": 2.9},
    "RP-DA-022": {"caloriesKcal": 40, "carbsG": 0, "proteinG": 3.3, "fatG": 1.9},
    "RP-DA-023": {"caloriesKcal": 25, "carbsG": 0.4, "proteinG": 0, "fatG": 1},
    "RP-DA-024": {"caloriesKcal": 20, "carbsG": 0.4, "proteinG": 0.4, "fatG": 2},
    "RP-DA-025": {"caloriesKcal": 20, "carbsG": 0.8, "proteinG": 0.2, "fatG": 2},
    "RP-DA-026": {"caloriesKcal": 30, "carbsG": 3.4, "proteinG": 0.5, "fatG": 1.1},
    "RP-DA-027": {"caloriesKcal": 60, "carbsG": 9.2, "proteinG": 1, "fatG": 1.5},
}

CORE_KEYS = [
    "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG",
    "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg",
    "calciumMg", "ironMg", "waterG"
]


def make_dairy_item(raw):
    name_ar, name_en, w, hh_ar, hh_en, prep, sub_cat, code, page = raw
    if code not in DAIRY_ANALYTICAL_OVERRIDES:
        raise ValueError(f"CRITICAL DATA INTEGRITY ERROR: {code} missing from DAIRY_ANALYTICAL_OVERRIDES.")

    override = DAIRY_ANALYTICAL_OVERRIDES[code]
    kcal100 = override["caloriesKcal"]
    c100 = override["carbsG"]
    p100 = override["proteinG"]
    f100 = override["fatG"]

    nutrients = {
        "basisWeightG": 100,
        "caloriesKcal": kcal100,
        "carbsG": c100,
        "availableCarbsG": None,
        "carbCalculationBasis": "total_by_difference",
        "proteinG": p100,
        "fatG": f100,
        "fiberG": override.get("fiberG", None),
        "saturatedFatG": override.get("saturatedFatG", None),
        "transFatG": override.get("transFatG", None),
        "monounsaturatedFatG": override.get("monounsaturatedFatG", None),
        "polyunsaturatedFatG": override.get("polyunsaturatedFatG", None),
        "cholesterolMg": override.get("cholesterolMg", None),
        "sodiumMg": override.get("sodiumMg", None),
        "potassiumMg": override.get("potassiumMg", None),
        "calciumMg": override.get("calciumMg", None),
        "ironMg": override.get("ironMg", None),
        "waterG": override.get("waterG", None),
    }
    nutrients["missingNutrientKeys"] = [k for k in CORE_KEYS if nutrients[k] is None]

    src_id = override.get("sourceId", "regimeplan_2026")
    src_rec_id = override.get("sourceRecordId")
    ver_status = override.get("verificationStatus", "clinic_reviewed")

    if src_id == "usda_fdc":
        if not src_rec_id or not re.match(r"^\d{5,6}$", str(src_rec_id)):
            raise ValueError(f"{code}: Invalid USDA NDB ID {src_rec_id!r}")
        notes_ar = (
            f"التركيبة التحليلية لكل 100 جم من USDA SR Legacy (NDB {src_rec_id}). "
            f"وزن بديل الألبان من RegimePlan 2026 (ص {page}): {w} جم ({hh_ar})."
        )
        notes_en = (
            f"Analytical 100g composition from USDA SR Legacy (NDB {src_rec_id}). "
            f"RegimePlan Food Exchange Lists (2026, p. {page}) exchange portion: {w}g ({hh_en})."
        )
    else:
        notes_ar = f"تركيبة مراجعة سريرياً لكل 100 جم. وزن الحصة البديلة وفق RegimePlan 2026 (ص {page}): {w} جم ({hh_ar})."
        notes_en = f"Clinically reviewed 100g composition. RegimePlan Food Exchange Lists (2026, p. {page}) exchange portion: {w}g ({hh_en})."

    item_id = f"food_dairy_{code.lower().replace('-', '_')}"
    record = {
        "id": item_id,
        "code": code,
        "sourceId": src_id,
        "nameEn": name_en,
        "nameAr": name_ar,
        "foodGroupId": "dairy",
        "primaryExchangeCategoryId": sub_cat,
        "preparationState": prep,
        "verificationStatus": ver_status,
        "isCustom": False,
        "nutrients100g": nutrients,
        "portions": [{
            "id": f"portion_{item_id}_serving",
            "portionNameEn": f"1 Dairy Exchange (~{w}g)",
            "portionNameAr": f"بديل حليب/ألبان واحد (~{w} جم)",
            "householdMeasureEn": hh_en,
            "householdMeasureAr": hh_ar,
            "gramWeight": w,
            "exchangeCategory": sub_cat,
            "exchangeEquivalentFactor": 1,
            "isDefaultServing": True
        }],
        "tags": ["dairy", sub_cat, prep],
        "notesAr": notes_ar,
        "notesEn": notes_en,
    }
    if src_rec_id is not None:
        record["sourceRecordId"] = str(src_rec_id)
    return record


new_dairy = [make_dairy_item(r) for r in RAW_DAIRY]
all_dairy = orig + new_dairy

header = '''/**
 * Nutrition Clinic Pro - Food Catalog: Dairy & Plant Milk Alternatives Module
 * Source: Egyptian NNI 2006, USDA FoodData Central & RegimePlan 2026
 */

import { FoodItemRecord } from '../types';

export const DAIRY_FOOD_ITEMS: FoodItemRecord[] = '''

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(header + json.dumps(all_dairy, ensure_ascii=False, indent=2) + ";\n")

print(f"Generated {len(all_dairy)} dairy items in {OUT_PATH} (Original: {len(orig)}, New: {len(new_dairy)})")
