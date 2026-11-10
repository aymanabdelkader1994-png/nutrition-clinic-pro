import os
import json

OUT_DIR = os.path.join(os.path.dirname(__file__), '../src/clinical/food/data')
os.makedirs(OUT_DIR, exist_ok=True)

def round1(val):
    return round(val, 1)

def round2(val):
    return round(val, 2)

def make_food_record(
    item_id,
    code,
    name_en,
    name_ar,
    group_id,
    exchange_cat,
    prep_state,
    gram_weight,
    hh_measure_ar,
    hh_measure_en,
    exchange_macros,
    page_num,
    tags=None,
    notes_ar=None,
    notes_en=None,
    custom_nutrients=None,
    source_id="regimeplan_2026",
    verification_status="clinic_reviewed"
):
    W = float(gram_weight)
    if custom_nutrients:
        nutrients = custom_nutrients
    else:
        kcal100 = round1((exchange_macros["caloriesKcal"] / W) * 100.0)
        c100 = round1((exchange_macros["carbsG"] / W) * 100.0)
        p100 = round1((exchange_macros["proteinG"] / W) * 100.0)
        f100 = round1((exchange_macros["fatG"] / W) * 100.0)
        nutrients = {
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
                "fiberG",
                "saturatedFatG",
                "transFatG",
                "monounsaturatedFatG",
                "polyunsaturatedFatG",
                "cholesterolMg",
                "sodiumMg",
                "potassiumMg",
                "calciumMg",
                "ironMg",
                "waterG"
            ]
        }

    portion = {
        "id": f"portion_{item_id.replace('food_', '')}_serving",
        "portionNameEn": f"1 Exchange Serving (~{int(W) if W.is_integer() else W}g)",
        "portionNameAr": f"حصة بديل واحدة (~{int(W) if W.is_integer() else W} جم)",
        "householdMeasureEn": hh_measure_en or f"{int(W) if W.is_integer() else W}g",
        "householdMeasureAr": hh_measure_ar or f"{int(W) if W.is_integer() else W} جم",
        "gramWeight": W,
        "exchangeCategory": exchange_cat,
        "exchangeEquivalentFactor": 1,
        "isDefaultServing": True
    }

    return {
        "id": item_id,
        "code": code,
        "sourceId": source_id,
        "sourceRecordId": None,
        "nameEn": name_en,
        "nameAr": name_ar,
        "foodGroupId": group_id,
        "primaryExchangeCategoryId": exchange_cat,
        "preparationState": prep_state,
        "verificationStatus": verification_status,
        "isCustom": False,
        "nutrients100g": nutrients,
        "portions": [portion],
        "tags": tags or [group_id, exchange_cat],
        "notesAr": notes_ar or f"قوائم البدائل الغذائية RegimePlan 2026 (ص {page_num}). وزن الحصة البديلة: {int(W) if W.is_integer() else W} جم.",
        "notesEn": notes_en or f"RegimePlan Food Exchange Lists (2026, p. {page_num}). Standard exchange serving weight: {int(W) if W.is_integer() else W}g."
    }

print("Base builder helper ready.")
