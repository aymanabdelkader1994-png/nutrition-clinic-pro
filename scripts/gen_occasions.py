# -*- coding: utf-8 -*-
import json
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.environ.get("NCP_CATALOG_OUT_DIR") or os.path.join(BASE_DIR, "src", "clinical", "food", "data")
os.makedirs(OUT_DIR, exist_ok=True)
OUT_PATH = os.path.join(OUT_DIR, "occasions.ts")

with open(os.path.join(BASE_DIR, "scripts/original_30_grouped.json"), "r", encoding="utf-8") as f:
    orig = json.load(f)["occasions"]

# 36 Occasions & Holiday Items from Acrobat Image 4 (أطعمة المناسبات والحلويات والمشروبات الرمضانية وعيد الفطر)
# All calories and portion contexts match Image 4 exactly.
# For occasions foods with only calories known from the clinic guide:
# Carbohydrate and fat proportions are based on standard recipe composition or marked with missingNutrientKeys.

RAW_OCCASIONS = [
    # A. Ramadan Traditional Drinks (مشروبات رمضانية)
    ("بلح باللبن", "Ramadan Dates with Milk Drink", "كوب متوسط", "1 medium glass", 250, 200, 38.0, 6.0, 3.0, "beverages", "RP-OCC-001"),
    ("قمر الدين", "Qamar Al-Din Apricot Nectar", "كوب متوسط", "1 medium glass", 250, 180, 43.0, 1.0, 0.5, "beverages", "RP-OCC-002"),
    ("عرقسوس مصري", "Traditional Licorice Infusion (Erq Sous)", "كوب متوسط", "1 medium glass", 250, 100, 25.0, 0.5, 0.0, "beverages", "RP-OCC-003"),
    ("كركديه بالسكر", "Sweetened Hibiscus Drink (Karkadeh)", "كوب متوسط", "1 medium glass", 250, 150, 38.0, 0.2, 0.0, "beverages", "RP-OCC-004"),
    ("تمر هندي طبيعي بدون سكر", "Unsweetened Tamarind Drink", "كوب متوسط", "1 medium glass", 250, 45, 11.0, 0.5, 0.2, "beverages", "RP-OCC-005"),
    ("تمر هندي بالسكر", "Sweetened Tamarind Drink", "كوب متوسط", "1 medium glass", 250, 150, 38.0, 0.5, 0.2, "beverages", "RP-OCC-006"),
    ("دوم طبيعي بدون سكر", "Unsweetened Doum Palm Drink", "كوب متوسط", "1 medium glass", 250, 70, 17.0, 0.8, 0.3, "beverages", "RP-OCC-007"),
    ("دوم باللبن", "Doum Palm Drink with Milk", "كوب متوسط", "1 medium glass", 250, 110, 19.0, 4.0, 2.5, "beverages", "RP-OCC-008"),
    ("كوب خروب طبيعي", "Traditional Carob Drink (Kharroub)", "كوب متوسط", "1 medium glass", 250, 150, 38.0, 0.5, 0.2, "beverages", "RP-OCC-009"),
    ("سوبيا مصرية", "Egyptian Sobia Coconut Milk Drink", "كوب متوسط", "1 medium glass", 250, 180, 36.0, 2.5, 3.5, "beverages", "RP-OCC-010"),
    ("طبق خشاف رمضاني (7 قطع فواكه مجففة)", "Ramadan Khoshaf Dried Fruit Compote (7 pieces)", "طبق صغير", "1 small bowl (7 pieces)", 180, 135, 34.0, 1.2, 0.4, "sweets", "RP-OCC-011"),

    # B. Oriental Pastries & Sweets (حلويات شرقية - حجم كف اليد)
    ("كنافة محشية بالقشطة/المكسرات", "Stuffed Kunafa with Cream / Nuts (Palm Size)", "قطعة حجم كف اليد", "1 piece (palm size)", 140, 630, 72.0, 7.0, 35.0, "sweets", "RP-OCC-012"),
    ("بسبوسة بالسمن والقطر", "Traditional Semolina Basbousa (Palm Size)", "قطعة حجم كف اليد", "1 piece (palm size)", 125, 480, 68.0, 5.0, 21.0, "sweets", "RP-OCC-013"),
    ("بقلاوة شرقية محشية", "Stuffed Baklava (3 pieces)", "3 قطع متوسطة", "3 pieces", 75, 360, 42.0, 5.0, 19.0, "sweets", "RP-OCC-014"),
    ("قطايف مقلية بالمسكرات", "Fried Qatayef with Nuts and Syrup (2 pieces)", "قطعتان", "2 pieces", 90, 400, 52.0, 6.0, 19.0, "sweets", "RP-OCC-015"),
    ("بلح الشام المقلي بالقطر", "Balah El Sham with Sugar Syrup (2 pieces)", "قطعتان", "2 pieces", 90, 380, 54.0, 4.0, 17.0, "sweets", "RP-OCC-016"),
    ("زلابية / لقمة القاضي", "Zalabia / Luqaimat Dumplings (5 pieces)", "5 حبات", "5 pieces", 85, 300, 46.0, 3.5, 11.5, "sweets", "RP-OCC-017"),
    ("قراقيش سادة فلاحي", "Plain Egyptian Qaraqeesh", "حبة واحدة", "1 piece", 25, 90, 12.0, 2.0, 4.0, "baked", "RP-OCC-018"),
    ("منين بالعجوة والتمر", "Meneen Date Paste Stuffed Roll", "حبة واحدة", "1 piece", 30, 110, 17.0, 2.0, 3.8, "baked", "RP-OCC-019"),

    # C. Savories & Eid Baked Specialties (مأكولات العيد والمخبوزات)
    ("سمبوسك مقلية بالجبن/اللحم", "Fried Sambousek Pastry", "حبة واحدة", "1 piece", 35, 105, 11.0, 3.5, 5.5, "savory", "RP-OCC-020"),
    ("جلاش أو رقاق باللحم المفروم", "Phyllo / Roqaq Pie with Minced Meat (1/2 Palm)", "نصف حجم كف اليد", "1/2 palm size piece", 80, 300, 24.0, 11.0, 18.0, "savory", "RP-OCC-021"),
    ("قطايف باللحم المفروم", "Savory Qatayef with Minced Beef", "حبة واحدة", "1 piece", 40, 115, 12.0, 5.5, 5.0, "savory", "RP-OCC-022"),
    ("قطايف بالجبنة المقلية", "Savory Qatayef with White Cheese", "حبة واحدة", "1 piece", 40, 105, 12.0, 4.5, 4.5, "savory", "RP-OCC-023"),
    ("سبرنج رولز بالخضار", "Vegetable Spring Roll", "حبة واحدة", "1 roll", 40, 65, 9.0, 1.5, 2.8, "savory", "RP-OCC-024"),
    ("سبرنج رولز باللحم", "Meat Spring Roll", "حبة واحدة", "1 roll", 40, 70, 8.5, 3.5, 2.6, "savory", "RP-OCC-025"),
    ("كحك العيد سادة بالسمن البلدي", "Traditional Plain Eid Kahk", "حبة واحدة", "1 piece", 35, 170, 18.0, 2.5, 10.0, "sweets", "RP-OCC-026"),
    ("كحك العيد بالعجوة", "Eid Kahk with Date Filling (Agwa)", "حبة واحدة", "1 piece", 42, 200, 25.0, 2.5, 10.0, "sweets", "RP-OCC-027"),
    ("كحك العيد بالمكسرات وعين الجمل", "Eid Kahk with Walnut / Nut Filling", "حبة واحدة", "1 piece", 42, 220, 21.0, 3.5, 13.5, "sweets", "RP-OCC-028"),
    ("بسكويت العيد بالنشادر والزبدة", "Eid Ammonia Butter Biscuit", "حبة واحدة", "1 piece", 20, 90, 13.0, 1.5, 3.8, "sweets", "RP-OCC-029"),
    ("بيتي فور مشكل بالسمن والشوكولاتة", "Petit Four Butter Cookie with Jam / Chocolate", "حبة واحدة", "1 piece", 20, 90, 11.0, 1.5, 4.5, "sweets", "RP-OCC-030"),
    ("غريبة دايبة بالسمن البلدي", "Ghorayeba Melt-in-Mouth Butter Cookie", "حبة واحدة", "1 piece", 30, 160, 17.0, 2.0, 9.5, "sweets", "RP-OCC-031"),

    # D. Traditional Egyptian Seeds (اللب والتسالي - ثمن كيلو = 125 جم)
    ("لب أسمر مصري (بذر بطيخ أسود)", "Egyptian Black Watermelon Seeds (El-Leb El-Asmar, 1/8 kg)", "ثمن كيلو (125 جم)", "1/8 kg (125g)", 125, 604, 18.0, 35.0, 48.0, "seeds", "RP-OCC-032"),
    ("لب سوري (بذور دوار الشمس بقشرها)", "Syrian Sunflower Seeds (El-Leb El-Souri, 1/8 kg)", "ثمن كيلو (125 جم)", "1/8 kg (125g)", 125, 584, 25.0, 26.0, 45.0, "seeds", "RP-OCC-033"),
    ("لب أبيض مصري (بذور القرع/اليقطين)", "Egyptian White Pumpkin Seeds (El-Leb El-Abyad, 1/8 kg)", "ثمن كيلو (125 جم)", "1/8 kg (125g)", 125, 446, 17.0, 29.0, 33.0, "seeds", "RP-OCC-034"),
    ("لب خشب مصري", "Egyptian Wood / Squash Seeds (El-Leb El-Khashab, 1/8 kg)", "ثمن كيلو (125 جم)", "1/8 kg (125g)", 125, 450, 20.0, 28.0, 32.0, "seeds", "RP-OCC-035"),
    ("لب بطيخ أصفر/أحمر مصري", "Egyptian Salted Watermelon Seeds (Leb El-Bateekh, 1/8 kg)", "ثمن كيلو (125 جم)", "1/8 kg (125g)", 125, 680, 19.0, 36.0, 53.0, "seeds", "RP-OCC-036"),
]

def make_occasion_item(raw):
    name_ar, name_en, hh_ar, hh_en, w, kcal, cho, pro, fat, sub_grp, code = raw
    W = float(w)
    kcal100 = round((kcal / W) * 100, 1)
    c100 = round((cho / W) * 100, 1)
    p100 = round((pro / W) * 100, 1)
    f100 = round((fat / W) * 100, 1)

    item_id = f"food_occasion_{code.lower().replace('-', '_')}"
    return {
        "id": item_id,
        "code": code,
        "sourceId": "clinic_reviewed",
        "nameEn": name_en,
        "nameAr": name_ar,
        "foodGroupId": "occasions",
        "primaryExchangeCategoryId": "combination_food",
        "preparationState": "ready-to-eat",
        "verificationStatus": "recipe_based",
        "compositionBasis": "recipe_based",
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
            "portionNameEn": f"1 Serving ({hh_en}, ~{w}g, {kcal} kcal)",
            "portionNameAr": f"حصة واحدة ({hh_ar}، ~{w} جم، {kcal} سعرة)",
            "householdMeasureEn": hh_en,
            "householdMeasureAr": hh_ar,
            "gramWeight": W,
            "exchangeCategory": "combination_food",
            "exchangeEquivalentFactor": 0,
            "isUnclassifiedExchange": True,
            "exchangeEvidenceStatus": "unclassified_composite",
            "unclassifiedExchangeNoticeEn": "Composite occasion/holiday dish: unclassified multi-component exchanges requiring dietitian review; scaled using published reference calories and estimated recipe macronutrients.",
            "unclassifiedExchangeNoticeAr": "صنف مناسبات وأعياد مركب: بدائل متعددة غير مصنفة تتطلب مراجعة أخصائي التغذية؛ يحسب بناءً على السعرات المرجعية المنشورة وتقديرات المغذيات الكبرى للوصفة.",
            "isDefaultServing": True
        }],
        "tags": ["occasions", "holiday", "ramadan", "eid", sub_grp],
        "notesAr": f"دليل بدائل وأطعمة المناسبات والأعياد (المصور). السعرات المرجعية للحصة: {kcal} سعرة حرارية ({hh_ar}، {w} جم). صنف مركب يتطلب مراجعة سريرية.",
        "notesEn": f"Egyptian Holiday & Occasions Food Guide. Reference serving: {kcal} kcal ({hh_en}, {w}g). Composite item requiring clinical review."
    }

new_occasions = [make_occasion_item(r) for r in RAW_OCCASIONS]
all_occasions = orig + new_occasions

header = '''/**
 * Nutrition Clinic Pro - Food Catalog: Occasions & Free Foods Module
 * Source: Egyptian NNI 2006, USDA FoodData Central & Egyptian Exchange Guide (Acrobat Image 4)
 */

import { FoodItemRecord } from '../types';

export const OCCASION_FOOD_ITEMS: FoodItemRecord[] = '''

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(header + json.dumps(all_occasions, ensure_ascii=False, indent=2) + ";\n")

print(f"Generated {len(all_occasions)} occasion items in {OUT_PATH} (Original: {len(orig)}, New: {len(new_occasions)})")
