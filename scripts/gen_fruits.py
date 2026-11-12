# -*- coding: utf-8 -*-
import json
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_PATH = os.path.join(BASE_DIR, "src/clinical/food/data/fruits.ts")

with open(os.path.join(BASE_DIR, "scripts/original_30_grouped.json"), "r", encoding="utf-8") as f:
    orig = json.load(f)["fruits"]

# 62 new fruits & juices from PDF p. 4 & 5
RAW_FRUITS = [
    # Page 4 - Sweets / Syrups continuation (fruit based & confections)
    ("دبس تمر طبيعي", "Natural Date Molasses / Silan", 21, "ملعقة كبيرة", "1 tbsp", "cooked", "RP-FR-001", 4),
    ("شوكولاتة داكنة 70%", "Dark Chocolate 70% Cacao", 33, "3 مربعات", "3 squares", "ready-to-eat", "RP-FR-002", 4),
    ("شوكولاتة بالحليب", "Milk Chocolate Bar", 25, "مربعان ونصف", "2.5 squares", "ready-to-eat", "RP-FR-003", 4),
    ("مربى فراولة طبيعية", "Strawberry Jam", 22, "ملعقة كبيرة", "1 tbsp", "cooked", "RP-FR-004", 4),
    ("مربى مشمش طبيعية", "Apricot Jam", 23, "ملعقة كبيرة", "1 tbsp", "cooked", "RP-FR-005", 4),
    ("مربى برتقال طبيعية", "Orange Marmalade", 23, "ملعقة كبيرة", "1 tbsp", "cooked", "RP-FR-006", 4),
    ("مرزبان لوز حلو", "Almond Marzipan Paste", 21, "ملعقة كبيرة ونصف", "1.5 tbsp", "ready-to-eat", "RP-FR-007", 4),
    ("شوكولاتة بالبندق للدهن", "Hazelnut Cocoa Spread", 25, "ملعقة كبيرة", "1 tbsp", "ready-to-eat", "RP-FR-008", 4),
    ("شراب ذرة حلو", "Corn Syrup", 20, "ملعقة كبيرة", "1 tbsp", "raw", "RP-FR-009", 4),
    ("دبس خروب طبيعي", "Carob Molasses", 21, "ملعقة كبيرة", "1 tbsp", "cooked", "RP-FR-010", 4),
    ("شربات سكر تقليدي", "Sugar Syrup (Qatr / Shira)", 22, "ملعقة كبيرة", "1 tbsp", "cooked", "RP-FR-011", 4),
    ("حلاوة طحينية سمسم", "Sesame Halva (Halawa Tahiniya)", 27, "ملعقة كبيرة ونصف", "1.5 tbsp", "ready-to-eat", "RP-FR-012", 4),
    ("حبيبات شوكولاتة نصف حلوة", "Semi-Sweet Chocolate Chips", 23, "ملعقتان كبيرتان", "2 tbsp", "ready-to-eat", "RP-FR-013", 4),

    # Page 4 - Whole Fruits (60 kcal, 15g CHO, 0g PRO, 0g FAT)
    ("تمر مجدول فاخر", "Medjool Dates", 20, "حبة كبيرة", "1 large date", "dried", "RP-FR-014", 4),
    ("برتقال طازج نيء", "Fresh Orange", 125, "حبة متوسطة", "1 medium orange", "raw", "RP-FR-015", 4),
    ("فراولة طازجة نيئة", "Fresh Strawberries", 195, "16 حبة متوسطة", "16 medium berries", "raw", "RP-FR-016", 4),
    ("عنب طازج أحمر/أخضر", "Fresh Grapes", 83, "17 حبة", "17 grapes", "raw", "RP-FR-017", 4),
    ("مانجو طازجة نيئة", "Fresh Mango", 100, "نصف حبة متوسطة", "1/2 medium mango", "raw", "RP-FR-018", 4),
    ("أناناس طازج نيء", "Fresh Pineapple", 115, "ثلثا كوب مكعبات", "2/3 cup chunks", "raw", "RP-FR-019", 4),
    ("بطيخ أحمر طازج", "Fresh Watermelon", 200, "ثلاثة أرباع قطعة كبيرة (كوب وربع مكعبات)", "1.25 cup cubes", "raw", "RP-FR-020", 4),
    ("زبيب مجفف", "Dried Raisins", 19, "ملعقتان كبيرتان", "2 tbsp", "dried", "RP-FR-021", 4),
    ("كمثرى طازجة نيئة", "Fresh Pear", 99, "نصف حبة متوسطة", "1/2 medium pear", "raw", "RP-FR-022", 4),
    ("خوخ طازج نيء", "Fresh Peach", 160, "حبة متوسطة", "1 medium peach", "raw", "RP-FR-023", 4),
    ("برقوق طازج نيء", "Fresh Plums", 130, "حبتان متوسطتان", "2 medium plums", "raw", "RP-FR-024", 4),
    ("كيوي طازج نيء", "Fresh Kiwi Fruit", 100, "حبة متوسطة ونصف", "1.5 medium kiwi", "raw", "RP-FR-025", 4),
    ("توت أزرق طازج", "Fresh Blueberries", 105, "ثلثا كوب", "2/3 cup", "raw", "RP-FR-026", 4),
    ("توت العليق الأحمر طازج", "Fresh Raspberries", 125, "كوب", "1 cup", "raw", "RP-FR-027", 4),
    ("رمان طازج نيء حبوب", "Fresh Pomegranate Arils", 80, "ربع حبة متوسطة (نصف كوب حب)", "1/2 cup arils", "raw", "RP-FR-028", 4),
    ("شمام طازج (كنتالوب)", "Fresh Cantaloupe / Sweet Melon", 185, "قطعتان وثلاثة أرباع (كوب مكعبات)", "1 cup cubes", "raw", "RP-FR-029", 4),
    ("تين برشومي طازج نيء", "Fresh Figs (Barshoomi)", 78, "حبة متوسطة ونصف", "1.5 medium figs", "raw", "RP-FR-030", 4),
    ("تين مجفف", "Dried Figs", 23, "3 حبات", "3 dried figs", "dried", "RP-FR-031", 4),
    ("كرز طازج نيء", "Fresh Sweet Cherries", 94, "11 حبة", "11 cherries", "raw", "RP-FR-032", 4),
    ("جريب فروت طازج نيء", "Fresh Grapefruit", 140, "نصف حبة كبيرة", "1/2 large grapefruit", "raw", "RP-FR-033", 4),
    ("بابايا طازجة نيئة", "Fresh Papaya", 140, "كوب مكعبات", "1 cup cubes", "raw", "RP-FR-034", 4),
    ("تمر دقلة نور", "Deglet Noor Dates", 20, "3 حبات", "3 dates", "dried", "RP-FR-035", 4),
    ("توت بري أحمر مجفف (كرانبيري)", "Dried Cranberries", 18, "ملعقتان كبيرتان", "2 tbsp", "dried", "RP-FR-036", 4),
    ("توت أسود طازج (بلاك بيري)", "Fresh Blackberries", 155, "كوب", "1 cup", "raw", "RP-FR-037", 4),
    ("ليتشي طازجة نيئة", "Fresh Lychee", 91, "9 حبات", "9 fruits", "raw", "RP-FR-038", 4),
    ("فاكهة التنين طازجة نيئة (دراجون فروت)", "Fresh Dragon Fruit (Pitaya)", 115, "نصف حبة متوسطة", "1/2 medium fruit", "raw", "RP-FR-039", 4),
    ("باشن فروت طازجة (ماراكويا)", "Fresh Passion Fruit", 64, "4 حبات", "4 fruits", "raw", "RP-FR-040", 4),
    ("كاكا طازجة نيئة (برسيمون)", "Fresh Persimmon (Kaka)", 81, "نصف حبة متوسطة", "1/2 medium fruit", "raw", "RP-FR-041", 4),
    ("نكتارين طازجة نيئة", "Fresh Nectarine", 140, "حبة متوسطة", "1 medium nectarine", "raw", "RP-FR-042", 4),
    ("مشمش طازج نيء", "Fresh Apricots", 135, "4 حبات متوسطة", "4 medium apricots", "raw", "RP-FR-043", 4),
    ("مشمش مجفف (مشمشية)", "Dried Apricots (Mishmishiya)", 24, "3 ملاعق كبيرة (4-5 أنصاف)", "4-5 halves", "dried", "RP-FR-044", 4),
    ("برقوق مجفف (قراصيا)", "Dried Prunes (Qarasya)", 23, "حبتان ونصف", "2.5 prunes", "dried", "RP-FR-045", 4),
    ("جاك فروت طازجة نيئة", "Fresh Jackfruit", 65, "6 ملاعق كبيرة ونصف", "6.5 tbsp", "raw", "RP-FR-046", 4),
    ("مانجو مجففة طبيعية", "Dried Mango Slices", 19, "حبتان ونصف شرائح", "2.5 slices", "dried", "RP-FR-047", 4),
    ("فاكهة النجمة طازجة نيئة (كارامبولا)", "Fresh Starfruit (Carambola)", 225, "حبتان متوسطتان ونصف", "2.5 fruits", "raw", "RP-FR-048", 4),
    ("مانغوستين طازجة نيئة", "Fresh Mangosteen", 86, "حبتان وثلاثة أرباع", "2.75 fruits", "raw", "RP-FR-049", 4),
    ("يوسفي طازج نيء (كلمنتينا)", "Fresh Tangerine / Clementine", 115, "حبة صغيرة ونصف", "1.5 small fruits", "raw", "RP-FR-050", 4),
    ("تين شوكي بلدي طازج مقشر", "Fresh Prickly Pear (Tin Shoki)", 155, "حبة متوسطة ونصف", "1.5 fruits", "raw", "RP-FR-051", 4),
    ("فاكهة القشطة طازجة نيئة", "Fresh Custard Apple (Cherimoya / Qeshta)", 85, "نصف كوب لب", "1/2 cup pulp", "raw", "RP-FR-052", 4),
    ("توت بلدي مصري طازج", "Fresh Egyptian Mulberries (Toot Baladi)", 155, "كوب", "1 cup", "raw", "RP-FR-053", 4),
    ("بشملة طازجة نيئة (أسكدنيا)", "Fresh Loquat (Eskadnya / Bashmala)", 125, "6 حبات كبيرة", "6 large fruits", "raw", "RP-FR-054", 4),
    ("بلح أصفر/أحمر زغلول طازج", "Fresh Zaghloul / Samani Dates (Balah)", 38, "تمرتان ونصف", "2.5 fresh dates", "raw", "RP-FR-055", 4),
    ("عجوة تمر مهروسة", "Date Paste (Ajwa)", 20, "ملعقة كبيرة", "1 tbsp", "ready-to-eat", "RP-FR-056", 4),
    ("قمر الدين جاف (لفائف مشمش)", "Qamar el-Din (Dried Apricot Paste Sheet)", 19, "قطعة مربعة", "Square piece", "dried", "RP-FR-057", 4),

    # Page 4 & 5 - Fruit Juices (60 kcal, 15g CHO)
    ("عصير برتقال طبيعي طازج", "Fresh Orange Juice", 145, "ثلثا كوب", "2/3 cup", "raw", "RP-FR-058", 4),
    ("عصير تفاح طبيعي غير محلى", "Unsweetened Apple Juice", 135, "نصف كوب", "1/2 cup", "raw", "RP-FR-059", 4),
    ("عصير رمان طبيعي طازج", "Fresh Pomegranate Juice", 115, "نصف كوب", "1/2 cup", "raw", "RP-FR-060", 5),
    ("عصير توت بري كوكتيل (كرانبيري)", "Cranberry Juice Cocktail", 110, "نصف كوب", "1/2 cup", "ready-to-eat", "RP-FR-061", 5),
    ("عصير مانجو طبيعي غير محلى", "Natural Mango Juice (No Added Sugar)", 115, "نصف كوب", "1/2 cup", "raw", "RP-FR-062", 5),
]

FRUIT_ANALYTICAL_OVERRIDES = {
    "RP-FR-008": {"caloriesKcal": 541.0, "carbsG": 57.5, "proteinG": 6.0, "fatG": 30.9},
    "RP-FR-009": {"caloriesKcal": 286.0, "carbsG": 77.4, "proteinG": 0.0, "fatG": 0.0},
    "RP-FR-002": {"caloriesKcal": 598.0, "carbsG": 45.9, "proteinG": 7.8, "fatG": 42.6},
    "RP-FR-003": {"caloriesKcal": 535.0, "carbsG": 59.4, "proteinG": 7.7, "fatG": 29.7},
    "RP-FR-007": {"caloriesKcal": 457.0, "carbsG": 53.0, "proteinG": 8.5, "fatG": 25.5},
    "RP-FR-010": {"caloriesKcal": 290.0, "carbsG": 71.0, "proteinG": 1.2, "fatG": 0.2},
    "RP-FR-011": {"caloriesKcal": 275.0, "carbsG": 71.0, "proteinG": 0.0, "fatG": 0.0},
    "RP-FR-012": {"caloriesKcal": 516.0, "carbsG": 60.5, "proteinG": 12.0, "fatG": 26.0},
    "RP-FR-013": {"caloriesKcal": 479.0, "carbsG": 65.0, "proteinG": 4.5, "fatG": 27.0},
}

CONFECTIONERY_CODES = {"RP-FR-002", "RP-FR-003", "RP-FR-007", "RP-FR-008", "RP-FR-012", "RP-FR-013"}

def make_fruit_item(row):
    ar, en, w, hh_ar, hh_en, prep, code, page = row
    override = FRUIT_ANALYTICAL_OVERRIDES.get(code, {})
    if code in FRUIT_ANALYTICAL_OVERRIDES:
        kcal100 = override["caloriesKcal"]
        c100 = override["carbsG"]
        p100 = override["proteinG"]
        f100 = override["fatG"]
    else:
        macros = {"caloriesKcal": 60, "carbsG": 15, "proteinG": 0, "fatG": 0}
        W = float(w)
        kcal100 = round((macros["caloriesKcal"] / W) * 100.0, 1)
        c100 = round((macros["carbsG"] / W) * 100.0, 1)
        p100 = 0.0
        f100 = 0.0

    W = float(w)
    item_id = "food_fruit_rp_rp_st_019" if code == "RP-FR-019" else f"food_fruit_rp_{code.lower().replace('-', '_')}"

    is_confectionery = code in CONFECTIONERY_CODES
    food_group = "occasions" if is_confectionery else "fruits"
    exchange_cat = "combination_food" if is_confectionery else "fruit"
    exchange_factor = 0 if is_confectionery else 1

    water100 = override.get("waterG", None)
    fiber100 = override.get("fiberG", None)
    sodium100 = override.get("sodiumMg", None)

    nutrients = {
        "basisWeightG": 100,
        "caloriesKcal": kcal100,
        "carbsG": c100,
        "availableCarbsG": None,
        "carbCalculationBasis": "total_by_difference",
        "proteinG": p100,
        "fatG": f100,
        "fiberG": fiber100,
        "saturatedFatG": override.get("saturatedFatG", None),
        "transFatG": override.get("transFatG", None),
        "monounsaturatedFatG": override.get("monounsaturatedFatG", None),
        "polyunsaturatedFatG": override.get("polyunsaturatedFatG", None),
        "cholesterolMg": override.get("cholesterolMg", None),
        "sodiumMg": sodium100,
        "potassiumMg": override.get("potassiumMg", None),
        "calciumMg": override.get("calciumMg", None),
        "ironMg": override.get("ironMg", None),
        "waterG": water100,
    }

    core_keys = [
        "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG",
        "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg",
        "calciumMg", "ironMg", "waterG"
    ]
    nutrients["missingNutrientKeys"] = [k for k in core_keys if nutrients[k] is None]

    if is_confectionery:
        portion_def = {
            "id": f"portion_{item_id}_serving",
            "portionNameEn": f"1 Serving (~{w}g, Composite Confectionery)",
            "portionNameAr": f"حصة واحدة (~{w} جم، حلويات مركبة)",
            "householdMeasureEn": hh_en,
            "householdMeasureAr": hh_ar,
            "gramWeight": W,
            "exchangeCategory": "combination_food",
            "exchangeEquivalentFactor": 0,
            "isUnclassifiedExchange": True,
            "exchangeEvidenceStatus": "unclassified_composite",
            "unclassifiedExchangeNoticeEn": "Composite confectionery food: requires clinical review; cannot be represented as a simple single-exchange fruit portion.",
            "unclassifiedExchangeNoticeAr": "صنف حلويات وسكريات مركب: يتطلب مراجعة سريرية؛ لا يمكن حسابه كبديل فاكهة بسيط.",
            "isDefaultServing": True
        }
        tags = ["occasions", "confectionery", "sweets", prep]
        notes_ar = f"قوائم البدائل الغذائية RegimePlan 2026 (ص {page}). وزن الحصة: {w} جم ({hh_ar}). صنف مركب يتطلب مراجعة سريرية للبدائل."
        notes_en = f"RegimePlan Food Exchange Lists (2026, p. {page}). Serving weight: {w}g ({hh_en}). Composite item requiring clinical review."
    else:
        portion_def = {
            "id": f"portion_{item_id}_serving",
            "portionNameEn": f"1 Fruit Exchange (~{w}g)",
            "portionNameAr": f"بديل فاكهة واحد (~{w} جم)",
            "householdMeasureEn": hh_en,
            "householdMeasureAr": hh_ar,
            "gramWeight": W,
            "exchangeCategory": "fruit",
            "exchangeEquivalentFactor": 1,
            "isDefaultServing": True
        }
        tags = ["fruits", "fruit", prep]
        notes_ar = f"قوائم البدائل الغذائية RegimePlan 2026 (ص {page}). وزن الحصة البديلة: {w} جم ({hh_ar})."
        notes_en = f"RegimePlan Food Exchange Lists (2026, p. {page}). Standard fruit exchange portion: {w}g ({hh_en})."

    return {
        "id": item_id,
        "code": code,
        "sourceId": "regimeplan_2026",
        "nameEn": en,
        "nameAr": ar,
        "foodGroupId": food_group,
        "primaryExchangeCategoryId": exchange_cat,
        "preparationState": prep,
        "verificationStatus": "clinic_reviewed",
        "isCustom": False,
        "nutrients100g": nutrients,
        "portions": [portion_def],
        "tags": tags,
        "notesAr": notes_ar,
        "notesEn": notes_en
    }

new_fruits = [make_fruit_item(r) for r in RAW_FRUITS]
all_fruits = orig + new_fruits

header = '''/**
 * Nutrition Clinic Pro - Food Catalog: Fruits & Juices Module
 * Source: Egyptian NNI 2006, USDA FoodData Central & RegimePlan 2026
 */
import { FoodItemRecord } from '../types';

export const FRUIT_FOOD_ITEMS: FoodItemRecord[] = '''

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(header + json.dumps(all_fruits, ensure_ascii=False, indent=2) + ";\n")

print(f"Generated {len(all_fruits)} fruits in {OUT_PATH} (Original: {len(orig)}, New: {len(new_fruits)})")
