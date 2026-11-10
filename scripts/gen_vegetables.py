# -*- coding: utf-8 -*-
import json
import os

OUT_PATH = "/app/applet/src/clinical/food/data/vegetables.ts"

with open("scripts/original_30_grouped.json", "r", encoding="utf-8") as f:
    orig = json.load(f)["vegetables"]

# 88 new non-starchy vegetables from PDF p. 5 & 6
RAW_VEGETABLES = [
    # Page 5
    ("ملوخية خضراء طازجة نيئة", "Fresh Molokhia Greens (Jute Mallow)", 86, "كوب أوراق مفرومة", "1 cup chopped leaves", "raw", "RP-VG-001", 5),
    ("باذنجان أسود نيء", "Raw Eggplant", 82, "كوب مكعبات", "1 cup cubes", "raw", "RP-VG-002", 5),
    ("بصل أصفر نيء", "Raw Yellow Onion", 160, "كوب شرائح", "1 cup sliced", "raw", "RP-VG-003", 5),
    ("بروكلي طازج نيء", "Raw Broccoli Florets", 91, "كوب زهرات", "1 cup florets", "raw", "RP-VG-004", 5),
    ("بروكلي مسلوق بالماء", "Boiled Broccoli", 78, "نصف كوب", "1/2 cup", "boiled", "RP-VG-005", 5),
    ("بروكلي مطهو على البخار", "Steamed Broccoli", 78, "نصف كوب", "1/2 cup", "cooked", "RP-VG-006", 5),
    ("سبانخ بلدي طازجة نيئة", "Fresh Raw Spinach", 30, "كوب أوراق", "1 cup leaves", "raw", "RP-VG-007", 5),
    ("سبانخ مسلوقة مصفاة", "Boiled Spinach (Drained)", 90, "نصف كوب", "1/2 cup", "boiled", "RP-VG-008", 5),
    ("جزر أصفر طازج نيء", "Raw Fresh Carrots", 52, "نصف كوب شرائح", "1/2 cup sliced", "raw", "RP-VG-009", 5),
    ("جزر مسلوق بالماء", "Boiled Carrots", 78, "نصف كوب", "1/2 cup", "boiled", "RP-VG-010", 5),
    ("فلفل رومي أخضر نيء", "Raw Green Bell Pepper", 150, "كوب شرائح", "1 cup sliced", "raw", "RP-VG-011", 5),
    ("فلفل رومي مشوي بالفرن", "Roasted Bell Pepper", 77, "نصف كوب", "1/2 cup", "roasted", "RP-VG-012", 5),
    ("كوسة خضراء طازجة نيئة", "Raw Zucchini / Courgette", 115, "كوب شرائح", "1 cup sliced", "raw", "RP-VG-013", 5),
    ("كوسة مشوية بالفرن دون زيت", "Grilled Zucchini (Fat-Free)", 105, "نصف كوب", "1/2 cup", "grilled", "RP-VG-014", 5),
    ("كوسة مسلوقة بالماء", "Boiled Zucchini", 90, "نصف كوب", "1/2 cup", "boiled", "RP-VG-015", 5),
    ("قرنبيط طازج نيء", "Raw Cauliflower Florets", 105, "كوب زهرات", "1 cup florets", "raw", "RP-VG-016", 5),
    ("قرنبيط مسلوق بالماء", "Boiled Cauliflower", 62, "نصف كوب", "1/2 cup", "boiled", "RP-VG-017", 5),
    ("قرنبيط مشوي بالفرن", "Roasted Cauliflower", 78, "نصف كوب", "1/2 cup", "roasted", "RP-VG-018", 5),
    ("مشروم طازج نيء (عيش الغراب)", "Raw White Button Mushrooms", 70, "كوب شرائح", "1 cup sliced", "raw", "RP-VG-019", 5),
    ("مشروم مشوي دون زيت", "Grilled Mushrooms (Fat-Free)", 61, "نصف كوب", "1/2 cup", "grilled", "RP-VG-020", 5),
    ("فاصوليا خضراء طازجة نيئة", "Raw Fresh Green Beans", 100, "كوب", "1 cup", "raw", "RP-VG-021", 5),
    ("فاصوليا خضراء مسلوقة", "Boiled Green Beans", 63, "نصف كوب", "1/2 cup", "boiled", "RP-VG-022", 5),
    ("كرنب أبيض طازج نيء (ملفوف)", "Raw White Cabbage", 70, "كوب مفروم", "1 cup shredded", "raw", "RP-VG-023", 5),
    ("كرنب مسلوق بالماء", "Boiled Cabbage", 75, "نصف كوب", "1/2 cup", "boiled", "RP-VG-024", 5),
    ("خس بلدي طازج نيء", "Raw Egyptian Romaine Lettuce", 47, "كوب أوراق مفرومة", "1 cup shredded", "raw", "RP-VG-025", 5),
    ("باذنجان مشوي بالفرن (بابا غنوج سادة)", "Roasted Eggplant Pulp (Plain)", 88, "نصف كوب لب", "1/2 cup pulp", "roasted", "RP-VG-026", 5),
    ("طماطم مشوية بالفرن", "Roasted Tomatoes", 93, "نصف كوب", "1/2 cup", "roasted", "RP-VG-027", 5),
    ("بصل مسلوق بالماء", "Boiled Onions", 105, "نصف كوب", "1/2 cup", "boiled", "RP-VG-028", 5),
    ("كرفس طازج نيء", "Raw Celery Stalks", 100, "كوب مفروم", "1 cup chopped", "raw", "RP-VG-029", 5),
    ("خيار مخلل قليل الملح", "Pickled Cucumbers (Low-Sodium)", 215, "حبتان متوسطتان", "2 medium pickles", "canned", "RP-VG-030", 5),
    ("بنجر أحمر طازج نيء (شمندر)", "Raw Red Beetroot", 135, "كوب مبشور", "1 cup grated", "raw", "RP-VG-031", 5),
    ("بنجر أحمر مسلوق", "Boiled Beetroot", 85, "نصف كوب شرائح", "1/2 cup sliced", "boiled", "RP-VG-032", 5),
    ("هليون أخضر مسلوق (أسبارجوس)", "Boiled Green Asparagus", 90, "نصف كوب (6 أعواد)", "6 spears", "boiled", "RP-VG-033", 5),
    ("كرنب الكيل طازج نيء", "Raw Curly Kale", 21, "كوب أوراق", "1 cup leaves", "raw", "RP-VG-034", 5),
    ("كرنب الكيل مسلوق", "Boiled Kale", 59, "نصف كوب", "1/2 cup", "boiled", "RP-VG-035", 5),
    ("جرجير بلدي مصري طازج", "Fresh Egyptian Arugula (Gargeer)", 20, "كوب أوراق ممتلئ", "1 cup packed", "raw", "RP-VG-036", 5),
    ("بامية طازجة نيئة", "Raw Fresh Okra (Bamia)", 100, "كوب قرون", "1 cup pods", "raw", "RP-VG-037", 5),
    ("بامية مسلوقة بالماء دون سمن", "Boiled Okra (Bamia)", 80, "نصف كوب", "1/2 cup", "boiled", "RP-VG-038", 5),
    ("لفت أبيض طازج نيء", "Raw White Turnip", 130, "كوب مكعبات", "1 cup cubes", "raw", "RP-VG-039", 5),
    ("فجل أحمر/أبيض طازج نيء", "Raw Fresh Radish", 115, "كوب شرائح", "1 cup sliced", "raw", "RP-VG-040", 5),
    ("جزر مشوي بالفرن دون زيت", "Roasted Carrots", 41, "نصف كوب", "1/2 cup", "roasted", "RP-VG-041", 5),
    ("بوك تشوي طازج نيء (ملفوف صيني)", "Raw Bok Choy (Pak Choi)", 70, "كوب مفروم", "1 cup shredded", "raw", "RP-VG-042", 5),
    ("بوك تشوي مطهو على البخار", "Steamed Bok Choy", 85, "نصف كوب", "1/2 cup", "cooked", "RP-VG-043", 5),
    ("كرات بلدي مصري نيء", "Raw Egyptian Leek (Kurrat)", 89, "كوب مفروم", "1 cup chopped", "raw", "RP-VG-044", 5),
    ("كرات مطبوخ بالماء", "Cooked Leeks", 52, "نصف كوب", "1/2 cup", "cooked", "RP-VG-045", 5),
    ("شمر طازج نيء (حبات الشمر)", "Raw Florence Fennel Bulb", 87, "كوب شرائح", "1 cup sliced", "raw", "RP-VG-046", 5),
    ("شمر مطبوخ بالبخار", "Cooked Fennel Bulb", 96, "نصف كوب", "1/2 cup", "cooked", "RP-VG-047", 5),
    ("خرشوف بلدي طازج نيء قلوب", "Raw Artichoke Hearts", 48, "قلب حبة متوسطة", "1 medium heart", "raw", "RP-VG-048", 5),
    ("خرشوف مسلوق بالماء", "Boiled Artichoke Hearts", 84, "نصف كوب قلوب", "1/2 cup hearts", "boiled", "RP-VG-049", 5),
    ("هليون طازج نيء", "Raw Green Asparagus", 135, "كوب أعواد", "1 cup spears", "raw", "RP-VG-050", 5),
    ("كرنب بروكسل طازج نيء", "Raw Brussels Sprouts", 88, "كوب حبات", "1 cup sprouts", "raw", "RP-VG-051", 5),
    ("كرنب بروكسل مسلوق", "Boiled Brussels Sprouts", 78, "نصف كوب", "1/2 cup", "boiled", "RP-VG-052", 5),
    ("بسلة ثلجية قرون نيئة (سنو بيز)", "Raw Snow Peas (Mangetout)", 63, "كوب قرون", "1 cup pods", "raw", "RP-VG-053", 5),
    ("بسلة سكرية قرون نيئة (شوجر سناب)", "Raw Sugar Snap Peas", 63, "كوب قرون", "1 cup pods", "raw", "RP-VG-054", 5),
    ("براعم فاصوليا طازجة نيئة (بين سبراوتس)", "Raw Bean Sprouts (Mung Bean)", 105, "كوب براعم", "1 cup sprouts", "raw", "RP-VG-055", 5),
    ("براعم الخيزران معلبة مصفاة (بامبو)", "Canned Bamboo Shoots (Drained)", 66, "نصف كوب", "1/2 cup", "canned", "RP-VG-056", 5),
    ("كستناء الماء معلبة مصفاة", "Canned Water Chestnuts", 70, "نصف كوب شرائح", "1/2 cup sliced", "canned", "RP-VG-057", 5),
    ("جيكاما طازجة نيئة (يام بين)", "Raw Jicama Root", 130, "كوب شرائح", "1 cup sticks", "raw", "RP-VG-058", 5),
    ("راوند طازج نيء سيقان", "Raw Rhubarb Stalks", 120, "كوب شرائح", "1 cup diced", "raw", "RP-VG-059", 5),
    ("سلق بلدي طازج نيء", "Raw Swiss Chard (Selq)", 36, "كوب أوراق", "1 cup leaves", "raw", "RP-VG-060", 5),

    # Page 6
    ("كرنب أوراق أخضر نيء (كولارد)", "Raw Collard Greens", 36, "كوب مفروم", "1 cup chopped", "raw", "RP-VG-061", 6),
    ("أنديف بلجيكي طازج نيء (شيكوريا)", "Raw Belgian Endive / Chicory", 90, "كوب أوراق", "1 cup heads", "raw", "RP-VG-062", 6),
    ("فجل أبيض ياباني طازج نيء (دايكون)", "Raw Daikon Radish", 115, "كوب شرائح", "1 cup sliced", "raw", "RP-VG-063", 6),
    ("بصل أخضر طازج نيء بالعرش", "Raw Green Scallions / Spring Onions", 68, "نصف كوب مفروم", "1/2 cup chopped", "raw", "RP-VG-064", 6),
    ("بصل شالوت صغير نيء", "Raw Shallots", 30, "حبتان صغيرتان", "2 small shallots", "raw", "RP-VG-065", 6),
    ("كرفس الجذر درنة نيئة (سلرياك)", "Raw Celeriac Root", 155, "كوب مكعبات", "1 cup cubes", "raw", "RP-VG-066", 6),
    ("فلفل هالابينو حار نيء", "Raw Jalapeño Pepper", 90, "كوب شرائح", "1 cup sliced", "raw", "RP-VG-067", 6),
    ("فلفل سيرانو حار طازج", "Raw Serrano Pepper", 75, "نصف كوب شرائح", "1/2 cup sliced", "raw", "RP-VG-068", 6),
    ("فلفل هابانيرو شديد الحرارة", "Raw Habanero Pepper", 57, "نصف كوب مفروم", "1/2 cup chopped", "raw", "RP-VG-069", 6),
    ("فلفل بوبلانو مكسيكي نيء", "Raw Poblano Pepper", 98, "حبة متوسطة", "1 medium pepper", "raw", "RP-VG-070", 6),
    ("فلفل عين الطائر التايلاندي حار", "Raw Bird's Eye Chili", 57, "نصف كوب مفروم", "1/2 cup minced", "raw", "RP-VG-071", 6),
    ("فلفل هالابينو مخلل شرائح", "Pickled Jalapeño Slices", 105, "نصف كوب", "1/2 cup", "canned", "RP-VG-072", 6),
    ("أعشاب بحرية نوري مجففة", "Dried Nori Seaweed Sheets", 11, "4 أوراق كبيرة", "4 sheets", "dried", "RP-VG-073", 6),
    ("أعشاب بحرية واكامي مجففة", "Dried Wakame Seaweed", 11, "ملعقتان كبيرتان جافة", "2 tbsp dry", "dried", "RP-VG-074", 6),
    ("أعشاب بحرية كومبو مجففة", "Dried Kombu Kelp", 8, "شريحة جافة", "1 strip dry", "dried", "RP-VG-075", 6),
    ("طماطم معلبة مكعبات دون سكر", "Canned Diced Tomatoes (In Juice)", 120, "نصف كوب", "1/2 cup", "canned", "RP-VG-076", 6),
    ("طماطم مهروسة بيوريه خفيفة", "Canned Tomato Puree (Light)", 120, "نصف كوب", "1/2 cup", "canned", "RP-VG-077", 6),
    ("طماطم كاملة مقشرة معلبة", "Canned Whole Peeled Tomatoes", 120, "نصف كوب", "1/2 cup", "canned", "RP-VG-078", 6),
    ("طماطم مجففة بالشمس دون زيت", "Sun-Dried Tomatoes (Dry Packed)", 9, "قطعتان ونصف", "2.5 pieces", "dried", "RP-VG-079", 6),
    ("ملوخية جافة ناشفة مطحونة", "Dry Powdered Molokhia Leaves", 9, "ملعقتان كبيرتان بودرة", "2 tbsp dry powder", "dried", "RP-VG-080", 6),
    ("ورق عنب طازج/مسلوق", "Boiled Grape Leaves (Waraq Enab)", 43, "8-10 ورقات مسلوقة", "8-10 leaves", "boiled", "RP-VG-081", 6),
    ("رجلة خضراء طازجة نيئة (بربير)", "Fresh Purslane Leaves (Regla)", 43, "كوب أوراق", "1 cup leaves", "raw", "RP-VG-082", 6),
    ("فلفل حار بلدي أخضر", "Fresh Green Hot Chili Pepper", 53, "3 قرون متوسطة", "3 peppers", "raw", "RP-VG-083", 6),
    ("فلفل ألوان أحمر/أصفر نيء", "Raw Sweet Bell Peppers (Red/Yellow)", 150, "كوب شرائح", "1 cup sliced", "raw", "RP-VG-084", 6),
    ("كرنب أحمر طازج نيء", "Raw Red Cabbage", 70, "كوب مبشور", "1 cup shredded", "raw", "RP-VG-085", 6),
    ("لفت مخلل بلدي أحمر", "Traditional Egyptian Pickled Turnip (Left)", 125, "نصف كوب شرائح", "1/2 cup slices", "canned", "RP-VG-086", 6),
    ("مخلل خضار مشكل بلدي (طرشي)", "Egyptian Mixed Pickled Vegetables (Torshi)", 150, "كوب مخلل مشكل", "1 cup drained", "canned", "RP-VG-087", 6),
    ("صلصة طماطم طبيعية سائلة للطبخ", "Natural Tomato Cooking Sauce", 125, "نصف كوب", "1/2 cup", "cooked", "RP-VG-088", 6),
]

def make_veg_item(row):
    ar, en, w, hh_ar, hh_en, prep, code, page = row
    macros = {"caloriesKcal": 28, "carbsG": 5, "proteinG": 2, "fatG": 0}
    W = float(w)
    kcal100 = round((macros["caloriesKcal"] / W) * 100.0, 1)
    c100 = round((macros["carbsG"] / W) * 100.0, 1)
    p100 = round((macros["proteinG"] / W) * 100.0, 1)

    item_id = f"food_veg_rp_{code.lower().replace('-', '_')}"
    return {
        "id": item_id,
        "code": code,
        "sourceId": "regimeplan_2026",
        "nameEn": en,
        "nameAr": ar,
        "foodGroupId": "vegetables",
        "primaryExchangeCategoryId": "vegetable_non_starchy",
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
            "fatG": 0.0,
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
            "portionNameEn": f"1 Vegetable Exchange (~{w}g)",
            "portionNameAr": f"بديل خضروات واحد (~{w} جم)",
            "householdMeasureEn": hh_en,
            "householdMeasureAr": hh_ar,
            "gramWeight": W,
            "exchangeCategory": "vegetable_non_starchy",
            "exchangeEquivalentFactor": 1,
            "isDefaultServing": True
        }],
        "tags": ["vegetables", "vegetable_non_starchy", prep],
        "notesAr": f"قوائم البدائل الغذائية RegimePlan 2026 (ص {page}). وزن الحصة البديلة: {w} جم ({hh_ar}).",
        "notesEn": f"RegimePlan Food Exchange Lists (2026, p. {page}). Standard vegetable exchange portion: {w}g ({hh_en})."
    }

new_vegs = [make_veg_item(r) for r in RAW_VEGETABLES]
all_vegs = orig + new_vegs

header = '''/**
 * Nutrition Clinic Pro - Food Catalog: Non-Starchy Vegetables Module
 * Source: Egyptian NNI 2006, USDA FoodData Central & RegimePlan 2026
 */
import { FoodItemRecord } from '../types';

export const VEGETABLE_FOOD_ITEMS: FoodItemRecord[] = '''

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(header + json.dumps(all_vegs, ensure_ascii=False, indent=2) + ";\n")

print(f"Generated {len(all_vegs)} vegetables in {OUT_PATH} (Original: {len(orig)}, New: {len(new_vegs)})")
