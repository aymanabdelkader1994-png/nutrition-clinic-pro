# -*- coding: utf-8 -*-
"""
Nutrition Clinic Pro - Non-Starchy Vegetables Generator
Replaces severe low-gram-weight and dried-vegetable exchange distortions
with verified analytical composition while keeping exchange portions intact.
"""

import json
import os
import re

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.environ.get("NCP_CATALOG_OUT_DIR") or os.path.join(BASE_DIR, "src", "clinical", "food", "data")
os.makedirs(OUT_DIR, exist_ok=True)
OUT_PATH = os.path.join(OUT_DIR, "vegetables.ts")

with open(os.path.join(BASE_DIR, "scripts/original_30_grouped.json"), "r", encoding="utf-8") as f:
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

VEG_USDA_SR_PROFILES = {
    "RP-VG-002": {"sourceRecordId": "11209", "nutrients": {"caloriesKcal": 25.0, "carbsG": 5.88, "proteinG": 0.98, "fatG": 0.18, "fiberG": 3.0, "saturatedFatG": 0.034, "transFatG": 0.0, "monounsaturatedFatG": 0.016, "polyunsaturatedFatG": 0.076, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 229.0, "calciumMg": 9.0, "ironMg": 0.23, "waterG": 92.3}},
    "RP-VG-003": {"sourceRecordId": "11282", "nutrients": {"caloriesKcal": 40.0, "carbsG": 9.34, "proteinG": 1.1, "fatG": 0.1, "fiberG": 1.7, "saturatedFatG": 0.042, "transFatG": 0.0, "monounsaturatedFatG": 0.013, "polyunsaturatedFatG": 0.017, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 146.0, "calciumMg": 23.0, "ironMg": 0.21, "waterG": 89.1}},
    "RP-VG-004": {"sourceRecordId": "11090", "nutrients": {"caloriesKcal": 34.0, "carbsG": 6.64, "proteinG": 2.82, "fatG": 0.37, "fiberG": 2.6, "saturatedFatG": 0.114, "transFatG": 0.0, "monounsaturatedFatG": 0.031, "polyunsaturatedFatG": 0.112, "cholesterolMg": 0.0, "sodiumMg": 33.0, "potassiumMg": 316.0, "calciumMg": 47.0, "ironMg": 0.73, "waterG": 89.3}},
    "RP-VG-005": {"sourceRecordId": "11091", "nutrients": {"caloriesKcal": 35.0, "carbsG": 7.18, "proteinG": 2.38, "fatG": 0.41, "fiberG": 3.3, "saturatedFatG": 0.079, "transFatG": 0.0, "monounsaturatedFatG": 0.04, "polyunsaturatedFatG": 0.17, "cholesterolMg": 0.0, "sodiumMg": 41.0, "potassiumMg": 293.0, "calciumMg": 40.0, "ironMg": 0.67, "waterG": 89.2}},
    "RP-VG-007": {"sourceRecordId": "11457", "nutrients": {"caloriesKcal": 23.0, "carbsG": 3.63, "proteinG": 2.86, "fatG": 0.39, "fiberG": 2.2, "saturatedFatG": 0.063, "transFatG": 0.0, "monounsaturatedFatG": 0.01, "polyunsaturatedFatG": 0.165, "cholesterolMg": 0.0, "sodiumMg": 79.0, "potassiumMg": 558.0, "calciumMg": 99.0, "ironMg": 2.71, "waterG": 91.4}},
    "RP-VG-008": {"sourceRecordId": "11458", "nutrients": {"caloriesKcal": 23.0, "carbsG": 3.75, "proteinG": 2.97, "fatG": 0.26, "fiberG": 2.4, "saturatedFatG": 0.043, "transFatG": 0.0, "monounsaturatedFatG": 0.006, "polyunsaturatedFatG": 0.109, "cholesterolMg": 0.0, "sodiumMg": 70.0, "potassiumMg": 466.0, "calciumMg": 136.0, "ironMg": 3.57, "waterG": 91.2}},
    "RP-VG-009": {"sourceRecordId": "11124", "nutrients": {"caloriesKcal": 41.0, "carbsG": 9.58, "proteinG": 0.93, "fatG": 0.24, "fiberG": 2.8, "saturatedFatG": 0.032, "transFatG": 0.0, "monounsaturatedFatG": 0.012, "polyunsaturatedFatG": 0.102, "cholesterolMg": 0.0, "sodiumMg": 69.0, "potassiumMg": 320.0, "calciumMg": 33.0, "ironMg": 0.3, "waterG": 88.3}},
    "RP-VG-010": {"sourceRecordId": "11125", "nutrients": {"caloriesKcal": 35.0, "carbsG": 8.22, "proteinG": 0.76, "fatG": 0.18, "fiberG": 3.0, "saturatedFatG": 0.03, "transFatG": 0.0, "monounsaturatedFatG": 0.006, "polyunsaturatedFatG": 0.089, "cholesterolMg": 0.0, "sodiumMg": 58.0, "potassiumMg": 235.0, "calciumMg": 30.0, "ironMg": 0.34, "waterG": 90.2}},
    "RP-VG-011": {"sourceRecordId": "11333", "nutrients": {"caloriesKcal": 20.0, "carbsG": 4.64, "proteinG": 0.86, "fatG": 0.17, "fiberG": 1.7, "saturatedFatG": 0.058, "transFatG": 0.0, "monounsaturatedFatG": 0.008, "polyunsaturatedFatG": 0.062, "cholesterolMg": 0.0, "sodiumMg": 3.0, "potassiumMg": 175.0, "calciumMg": 10.0, "ironMg": 0.34, "waterG": 93.9}},
    "RP-VG-013": {"sourceRecordId": "11477", "nutrients": {"caloriesKcal": 17.0, "carbsG": 3.11, "proteinG": 1.21, "fatG": 0.32, "fiberG": 1.0, "saturatedFatG": 0.084, "transFatG": 0.0, "monounsaturatedFatG": 0.011, "polyunsaturatedFatG": 0.091, "cholesterolMg": 0.0, "sodiumMg": 8.0, "potassiumMg": 261.0, "calciumMg": 16.0, "ironMg": 0.37, "waterG": 94.8}},
    "RP-VG-015": {"sourceRecordId": "11478", "nutrients": {"caloriesKcal": 15.0, "carbsG": 2.69, "proteinG": 1.14, "fatG": 0.36, "fiberG": 1.0, "saturatedFatG": 0.072, "transFatG": 0.0, "monounsaturatedFatG": 0.029, "polyunsaturatedFatG": 0.151, "cholesterolMg": 0.0, "sodiumMg": 3.0, "potassiumMg": 264.0, "calciumMg": 18.0, "ironMg": 0.37, "waterG": 95.2}},
    "RP-VG-016": {"sourceRecordId": "11135", "nutrients": {"caloriesKcal": 25.0, "carbsG": 4.97, "proteinG": 1.92, "fatG": 0.28, "fiberG": 2.0, "saturatedFatG": 0.13, "transFatG": 0.0, "monounsaturatedFatG": 0.034, "polyunsaturatedFatG": 0.031, "cholesterolMg": 0.0, "sodiumMg": 30.0, "potassiumMg": 299.0, "calciumMg": 22.0, "ironMg": 0.42, "waterG": 92.1}},
    "RP-VG-017": {"sourceRecordId": "11136", "nutrients": {"caloriesKcal": 23.0, "carbsG": 4.11, "proteinG": 1.84, "fatG": 0.45, "fiberG": 2.3, "saturatedFatG": 0.07, "transFatG": 0.0, "monounsaturatedFatG": 0.032, "polyunsaturatedFatG": 0.217, "cholesterolMg": 0.0, "sodiumMg": 15.0, "potassiumMg": 142.0, "calciumMg": 16.0, "ironMg": 0.32, "waterG": 93.0}},
    "RP-VG-019": {"sourceRecordId": "11260", "nutrients": {"caloriesKcal": 22.0, "carbsG": 3.26, "proteinG": 3.09, "fatG": 0.34, "fiberG": 1.0, "saturatedFatG": 0.05, "transFatG": 0.0, "monounsaturatedFatG": 0.0, "polyunsaturatedFatG": 0.16, "cholesterolMg": 0.0, "sodiumMg": 5.0, "potassiumMg": 318.0, "calciumMg": 3.0, "ironMg": 0.5, "waterG": 92.4}},
    "RP-VG-021": {"sourceRecordId": "11052", "nutrients": {"caloriesKcal": 31.0, "carbsG": 6.97, "proteinG": 1.83, "fatG": 0.22, "fiberG": 2.7, "saturatedFatG": 0.05, "transFatG": 0.0, "monounsaturatedFatG": 0.01, "polyunsaturatedFatG": 0.113, "cholesterolMg": 0.0, "sodiumMg": 6.0, "potassiumMg": 211.0, "calciumMg": 37.0, "ironMg": 1.03, "waterG": 90.3}},
    "RP-VG-022": {"sourceRecordId": "11053", "nutrients": {"caloriesKcal": 35.0, "carbsG": 7.88, "proteinG": 1.89, "fatG": 0.28, "fiberG": 3.2, "saturatedFatG": 0.064, "transFatG": 0.0, "monounsaturatedFatG": 0.011, "polyunsaturatedFatG": 0.145, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 146.0, "calciumMg": 44.0, "ironMg": 0.65, "waterG": 89.2}},
    "RP-VG-023": {"sourceRecordId": "11109", "nutrients": {"caloriesKcal": 25.0, "carbsG": 5.8, "proteinG": 1.28, "fatG": 0.1, "fiberG": 2.5, "saturatedFatG": 0.034, "transFatG": 0.0, "monounsaturatedFatG": 0.017, "polyunsaturatedFatG": 0.017, "cholesterolMg": 0.0, "sodiumMg": 18.0, "potassiumMg": 170.0, "calciumMg": 40.0, "ironMg": 0.47, "waterG": 92.2}},
    "RP-VG-024": {"sourceRecordId": "11110", "nutrients": {"caloriesKcal": 23.0, "carbsG": 5.51, "proteinG": 1.27, "fatG": 0.06, "fiberG": 1.9, "saturatedFatG": 0.0, "transFatG": 0.0, "monounsaturatedFatG": 0.019, "polyunsaturatedFatG": 0.023, "cholesterolMg": 0.0, "sodiumMg": 8.0, "potassiumMg": 196.0, "calciumMg": 48.0, "ironMg": 0.17, "waterG": 92.6}},
    "RP-VG-029": {"sourceRecordId": "11143", "nutrients": {"caloriesKcal": 14.0, "carbsG": 2.97, "proteinG": 0.69, "fatG": 0.17, "fiberG": 1.6, "saturatedFatG": 0.042, "transFatG": 0.0, "monounsaturatedFatG": 0.032, "polyunsaturatedFatG": 0.079, "cholesterolMg": 0.0, "sodiumMg": 80.0, "potassiumMg": 260.0, "calciumMg": 40.0, "ironMg": 0.2, "waterG": 95.4}},
    "RP-VG-031": {"sourceRecordId": "11080", "nutrients": {"caloriesKcal": 43.0, "carbsG": 9.56, "proteinG": 1.61, "fatG": 0.17, "fiberG": 2.8, "saturatedFatG": 0.027, "transFatG": 0.0, "monounsaturatedFatG": 0.032, "polyunsaturatedFatG": 0.06, "cholesterolMg": 0.0, "sodiumMg": 78.0, "potassiumMg": 325.0, "calciumMg": 16.0, "ironMg": 0.8, "waterG": 87.6}},
    "RP-VG-032": {"sourceRecordId": "11081", "nutrients": {"caloriesKcal": 44.0, "carbsG": 9.96, "proteinG": 1.68, "fatG": 0.18, "fiberG": 2.0, "saturatedFatG": 0.028, "transFatG": 0.0, "monounsaturatedFatG": 0.035, "polyunsaturatedFatG": 0.064, "cholesterolMg": 0.0, "sodiumMg": 77.0, "potassiumMg": 305.0, "calciumMg": 16.0, "ironMg": 0.79, "waterG": 87.1}},
    "RP-VG-033": {"sourceRecordId": "11012", "nutrients": {"caloriesKcal": 22.0, "carbsG": 4.11, "proteinG": 2.4, "fatG": 0.22, "fiberG": 2.0, "saturatedFatG": 0.048, "transFatG": 0.0, "monounsaturatedFatG": 0.0, "polyunsaturatedFatG": 0.105, "cholesterolMg": 0.0, "sodiumMg": 14.0, "potassiumMg": 224.0, "calciumMg": 23.0, "ironMg": 0.91, "waterG": 92.6}},
    "RP-VG-034": {"sourceRecordId": "11233", "nutrients": {"caloriesKcal": 35.0, "carbsG": 4.42, "proteinG": 2.92, "fatG": 1.49, "fiberG": 4.1, "saturatedFatG": 0.178, "transFatG": 0.0, "monounsaturatedFatG": 0.104, "polyunsaturatedFatG": 0.673, "cholesterolMg": 0.0, "sodiumMg": 53.0, "potassiumMg": 348.0, "calciumMg": 254.0, "ironMg": 1.6, "waterG": 89.6}},
    "RP-VG-035": {"sourceRecordId": "11234", "nutrients": {"caloriesKcal": 36.0, "carbsG": 5.3, "proteinG": 2.94, "fatG": 1.21, "fiberG": 4.0, "saturatedFatG": 0.175, "transFatG": 0.0, "monounsaturatedFatG": 0.102, "polyunsaturatedFatG": 0.66, "cholesterolMg": 0.0, "sodiumMg": 16.0, "potassiumMg": 144.0, "calciumMg": 150.0, "ironMg": 0.84, "waterG": 89.8}},
    "RP-VG-036": {"sourceRecordId": "11959", "nutrients": {"caloriesKcal": 25.0, "carbsG": 3.65, "proteinG": 2.58, "fatG": 0.66, "fiberG": 1.6, "saturatedFatG": 0.086, "transFatG": 0.0, "monounsaturatedFatG": 0.049, "polyunsaturatedFatG": 0.319, "cholesterolMg": 0.0, "sodiumMg": 27.0, "potassiumMg": 369.0, "calciumMg": 160.0, "ironMg": 1.46, "waterG": 91.7}},
    "RP-VG-037": {"sourceRecordId": "11278", "nutrients": {"caloriesKcal": 33.0, "carbsG": 7.45, "proteinG": 1.93, "fatG": 0.19, "fiberG": 3.2, "saturatedFatG": 0.026, "transFatG": 0.0, "monounsaturatedFatG": 0.017, "polyunsaturatedFatG": 0.027, "cholesterolMg": 0.0, "sodiumMg": 7.0, "potassiumMg": 299.0, "calciumMg": 82.0, "ironMg": 0.62, "waterG": 89.6}},
    "RP-VG-038": {"sourceRecordId": "11279", "nutrients": {"caloriesKcal": 22.0, "carbsG": 4.51, "proteinG": 1.87, "fatG": 0.21, "fiberG": 2.5, "saturatedFatG": 0.045, "transFatG": 0.0, "monounsaturatedFatG": 0.028, "polyunsaturatedFatG": 0.046, "cholesterolMg": 0.0, "sodiumMg": 6.0, "potassiumMg": 135.0, "calciumMg": 77.0, "ironMg": 0.28, "waterG": 92.6}},
    "RP-VG-039": {"sourceRecordId": "11564", "nutrients": {"caloriesKcal": 28.0, "carbsG": 6.43, "proteinG": 0.9, "fatG": 0.1, "fiberG": 1.8, "saturatedFatG": 0.011, "transFatG": 0.0, "monounsaturatedFatG": 0.006, "polyunsaturatedFatG": 0.053, "cholesterolMg": 0.0, "sodiumMg": 67.0, "potassiumMg": 191.0, "calciumMg": 30.0, "ironMg": 0.3, "waterG": 91.9}},
    "RP-VG-040": {"sourceRecordId": "11429", "nutrients": {"caloriesKcal": 16.0, "carbsG": 3.4, "proteinG": 0.68, "fatG": 0.1, "fiberG": 1.6, "saturatedFatG": 0.032, "transFatG": 0.0, "monounsaturatedFatG": 0.017, "polyunsaturatedFatG": 0.048, "cholesterolMg": 0.0, "sodiumMg": 39.0, "potassiumMg": 233.0, "calciumMg": 25.0, "ironMg": 0.34, "waterG": 95.3}},
    "RP-VG-042": {"sourceRecordId": "11116", "nutrients": {"caloriesKcal": 13.0, "carbsG": 2.18, "proteinG": 1.5, "fatG": 0.2, "fiberG": 1.0, "saturatedFatG": 0.027, "transFatG": 0.0, "monounsaturatedFatG": 0.015, "polyunsaturatedFatG": 0.096, "cholesterolMg": 0.0, "sodiumMg": 65.0, "potassiumMg": 252.0, "calciumMg": 105.0, "ironMg": 0.8, "waterG": 95.3}},
    "RP-VG-044": {"sourceRecordId": "11246", "nutrients": {"caloriesKcal": 61.0, "carbsG": 14.2, "proteinG": 1.5, "fatG": 0.3, "fiberG": 1.8, "saturatedFatG": 0.04, "transFatG": 0.0, "monounsaturatedFatG": 0.004, "polyunsaturatedFatG": 0.166, "cholesterolMg": 0.0, "sodiumMg": 20.0, "potassiumMg": 180.0, "calciumMg": 59.0, "ironMg": 2.1, "waterG": 83.0}},
    "RP-VG-045": {"sourceRecordId": "11247", "nutrients": {"caloriesKcal": 31.0, "carbsG": 7.62, "proteinG": 0.81, "fatG": 0.2, "fiberG": 1.0, "saturatedFatG": 0.027, "transFatG": 0.0, "monounsaturatedFatG": 0.003, "polyunsaturatedFatG": 0.111, "cholesterolMg": 0.0, "sodiumMg": 10.0, "potassiumMg": 87.0, "calciumMg": 30.0, "ironMg": 1.1, "waterG": 90.8}},
    "RP-VG-046": {"sourceRecordId": "11957", "nutrients": {"caloriesKcal": 31.0, "carbsG": 7.3, "proteinG": 1.24, "fatG": 0.2, "fiberG": 3.1, "saturatedFatG": 0.09, "transFatG": 0.0, "monounsaturatedFatG": 0.068, "polyunsaturatedFatG": 0.169, "cholesterolMg": 0.0, "sodiumMg": 52.0, "potassiumMg": 414.0, "calciumMg": 49.0, "ironMg": 0.73, "waterG": 90.2}},
    "RP-VG-048": {"sourceRecordId": "11007", "nutrients": {"caloriesKcal": 47.0, "carbsG": 10.5, "proteinG": 3.27, "fatG": 0.15, "fiberG": 5.4, "saturatedFatG": 0.036, "transFatG": 0.0, "monounsaturatedFatG": 0.005, "polyunsaturatedFatG": 0.064, "cholesterolMg": 0.0, "sodiumMg": 94.0, "potassiumMg": 370.0, "calciumMg": 44.0, "ironMg": 1.28, "waterG": 84.9}},
    "RP-VG-049": {"sourceRecordId": "11008", "nutrients": {"caloriesKcal": 53.0, "carbsG": 12.0, "proteinG": 2.89, "fatG": 0.34, "fiberG": 5.7, "saturatedFatG": 0.079, "transFatG": 0.0, "monounsaturatedFatG": 0.011, "polyunsaturatedFatG": 0.145, "cholesterolMg": 0.0, "sodiumMg": 60.0, "potassiumMg": 286.0, "calciumMg": 21.0, "ironMg": 0.61, "waterG": 84.1}},
    "RP-VG-050": {"sourceRecordId": "11011", "nutrients": {"caloriesKcal": 20.0, "carbsG": 3.88, "proteinG": 2.2, "fatG": 0.12, "fiberG": 2.1, "saturatedFatG": 0.04, "transFatG": 0.0, "monounsaturatedFatG": 0.0, "polyunsaturatedFatG": 0.05, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 202.0, "calciumMg": 24.0, "ironMg": 2.14, "waterG": 93.2}},
    "RP-VG-051": {"sourceRecordId": "11098", "nutrients": {"caloriesKcal": 43.0, "carbsG": 8.95, "proteinG": 3.38, "fatG": 0.3, "fiberG": 3.8, "saturatedFatG": 0.062, "transFatG": 0.0, "monounsaturatedFatG": 0.023, "polyunsaturatedFatG": 0.153, "cholesterolMg": 0.0, "sodiumMg": 25.0, "potassiumMg": 389.0, "calciumMg": 42.0, "ironMg": 1.4, "waterG": 86.0}},
    "RP-VG-052": {"sourceRecordId": "11099", "nutrients": {"caloriesKcal": 36.0, "carbsG": 7.1, "proteinG": 2.55, "fatG": 0.5, "fiberG": 2.6, "saturatedFatG": 0.102, "transFatG": 0.0, "monounsaturatedFatG": 0.038, "polyunsaturatedFatG": 0.255, "cholesterolMg": 0.0, "sodiumMg": 21.0, "potassiumMg": 317.0, "calciumMg": 36.0, "ironMg": 1.2, "waterG": 88.9}},
    "RP-VG-053": {"sourceRecordId": "11300", "nutrients": {"caloriesKcal": 42.0, "carbsG": 7.55, "proteinG": 2.8, "fatG": 0.2, "fiberG": 2.6, "saturatedFatG": 0.039, "transFatG": 0.0, "monounsaturatedFatG": 0.021, "polyunsaturatedFatG": 0.089, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 200.0, "calciumMg": 43.0, "ironMg": 2.08, "waterG": 88.9}},
    "RP-VG-055": {"sourceRecordId": "11043", "nutrients": {"caloriesKcal": 30.0, "carbsG": 5.94, "proteinG": 3.04, "fatG": 0.18, "fiberG": 1.8, "saturatedFatG": 0.046, "transFatG": 0.0, "monounsaturatedFatG": 0.022, "polyunsaturatedFatG": 0.058, "cholesterolMg": 0.0, "sodiumMg": 6.0, "potassiumMg": 149.0, "calciumMg": 13.0, "ironMg": 0.91, "waterG": 90.4}},
    "RP-VG-056": {"sourceRecordId": "11028", "nutrients": {"caloriesKcal": 19.0, "carbsG": 3.22, "proteinG": 1.72, "fatG": 0.4, "fiberG": 1.4, "saturatedFatG": 0.092, "transFatG": 0.0, "monounsaturatedFatG": 0.009, "polyunsaturatedFatG": 0.178, "cholesterolMg": 0.0, "sodiumMg": 7.0, "potassiumMg": 80.0, "calciumMg": 8.0, "ironMg": 0.32, "waterG": 94.3}},
    "RP-VG-057": {"sourceRecordId": "11590", "nutrients": {"caloriesKcal": 50.0, "carbsG": 12.3, "proteinG": 0.88, "fatG": 0.06, "fiberG": 2.5, "saturatedFatG": 0.016, "transFatG": 0.0, "monounsaturatedFatG": 0.001, "polyunsaturatedFatG": 0.026, "cholesterolMg": 0.0, "sodiumMg": 8.0, "potassiumMg": 118.0, "calciumMg": 4.0, "ironMg": 0.87, "waterG": 86.4}},
    "RP-VG-058": {"sourceRecordId": "11603", "nutrients": {"caloriesKcal": 38.0, "carbsG": 8.82, "proteinG": 0.72, "fatG": 0.09, "fiberG": 4.9, "saturatedFatG": 0.021, "transFatG": 0.0, "monounsaturatedFatG": 0.005, "polyunsaturatedFatG": 0.043, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 150.0, "calciumMg": 12.0, "ironMg": 0.6, "waterG": 90.1}},
    "RP-VG-059": {"sourceRecordId": "09307", "nutrients": {"caloriesKcal": 21.0, "carbsG": 4.54, "proteinG": 0.9, "fatG": 0.2, "fiberG": 1.8, "saturatedFatG": 0.053, "transFatG": 0.0, "monounsaturatedFatG": 0.039, "polyunsaturatedFatG": 0.099, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 288.0, "calciumMg": 86.0, "ironMg": 0.22, "waterG": 93.6}},
    "RP-VG-062": {"sourceRecordId": "11213", "nutrients": {"caloriesKcal": 17.0, "carbsG": 3.35, "proteinG": 1.25, "fatG": 0.2, "fiberG": 3.1, "saturatedFatG": 0.048, "transFatG": 0.0, "monounsaturatedFatG": 0.004, "polyunsaturatedFatG": 0.087, "cholesterolMg": 0.0, "sodiumMg": 22.0, "potassiumMg": 314.0, "calciumMg": 52.0, "ironMg": 0.83, "waterG": 93.8}},
    "RP-VG-063": {"sourceRecordId": "11430", "nutrients": {"caloriesKcal": 18.0, "carbsG": 4.1, "proteinG": 0.6, "fatG": 0.1, "fiberG": 1.6, "saturatedFatG": 0.03, "transFatG": 0.0, "monounsaturatedFatG": 0.017, "polyunsaturatedFatG": 0.045, "cholesterolMg": 0.0, "sodiumMg": 21.0, "potassiumMg": 227.0, "calciumMg": 27.0, "ironMg": 0.4, "waterG": 94.6}},
    "RP-VG-064": {"sourceRecordId": "11291", "nutrients": {"caloriesKcal": 32.0, "carbsG": 7.34, "proteinG": 1.83, "fatG": 0.19, "fiberG": 2.6, "saturatedFatG": 0.032, "transFatG": 0.0, "monounsaturatedFatG": 0.027, "polyunsaturatedFatG": 0.074, "cholesterolMg": 0.0, "sodiumMg": 16.0, "potassiumMg": 276.0, "calciumMg": 72.0, "ironMg": 1.48, "waterG": 89.8}},
    "RP-VG-066": {"sourceRecordId": "11141", "nutrients": {"caloriesKcal": 42.0, "carbsG": 9.2, "proteinG": 1.5, "fatG": 0.3, "fiberG": 1.8, "saturatedFatG": 0.079, "transFatG": 0.0, "monounsaturatedFatG": 0.058, "polyunsaturatedFatG": 0.148, "cholesterolMg": 0.0, "sodiumMg": 100.0, "potassiumMg": 300.0, "calciumMg": 43.0, "ironMg": 0.7, "waterG": 88.0}},
    "RP-VG-067": {"sourceRecordId": "11979", "nutrients": {"caloriesKcal": 29.0, "carbsG": 6.5, "proteinG": 0.91, "fatG": 0.37, "fiberG": 2.8, "saturatedFatG": 0.092, "transFatG": 0.0, "monounsaturatedFatG": 0.029, "polyunsaturatedFatG": 0.112, "cholesterolMg": 0.0, "sodiumMg": 3.0, "potassiumMg": 248.0, "calciumMg": 12.0, "ironMg": 0.25, "waterG": 91.7}},
    "RP-VG-068": {"sourceRecordId": "11977", "nutrients": {"caloriesKcal": 32.0, "carbsG": 6.7, "proteinG": 1.74, "fatG": 0.44, "fiberG": 3.7, "saturatedFatG": 0.059, "transFatG": 0.0, "monounsaturatedFatG": 0.023, "polyunsaturatedFatG": 0.222, "cholesterolMg": 0.0, "sodiumMg": 10.0, "potassiumMg": 305.0, "calciumMg": 11.0, "ironMg": 0.86, "waterG": 90.2}},
    "RP-VG-076": {"sourceRecordId": "11531", "nutrients": {"caloriesKcal": 16.0, "carbsG": 3.47, "proteinG": 0.79, "fatG": 0.25, "fiberG": 1.9, "saturatedFatG": 0.034, "transFatG": 0.0, "monounsaturatedFatG": 0.04, "polyunsaturatedFatG": 0.101, "cholesterolMg": 0.0, "sodiumMg": 115.0, "potassiumMg": 191.0, "calciumMg": 33.0, "ironMg": 0.57, "waterG": 94.8}},
    "RP-VG-077": {"sourceRecordId": "11547", "nutrients": {"caloriesKcal": 38.0, "carbsG": 8.98, "proteinG": 1.65, "fatG": 0.21, "fiberG": 1.9, "saturatedFatG": 0.029, "transFatG": 0.0, "monounsaturatedFatG": 0.031, "polyunsaturatedFatG": 0.086, "cholesterolMg": 0.0, "sodiumMg": 28.0, "potassiumMg": 439.0, "calciumMg": 18.0, "ironMg": 1.78, "waterG": 87.9}},
    "RP-VG-079": {"sourceRecordId": "11955", "nutrients": {"caloriesKcal": 258.0, "carbsG": 55.8, "proteinG": 14.1, "fatG": 2.97, "fiberG": 12.3, "saturatedFatG": 0.426, "transFatG": 0.0, "monounsaturatedFatG": 0.487, "polyunsaturatedFatG": 1.12, "cholesterolMg": 0.0, "sodiumMg": 107.0, "potassiumMg": 3430.0, "calciumMg": 110.0, "ironMg": 9.09, "waterG": 14.6}},
    "RP-VG-083": {"sourceRecordId": "11670", "nutrients": {"caloriesKcal": 40.0, "carbsG": 9.46, "proteinG": 2.0, "fatG": 0.2, "fiberG": 1.5, "saturatedFatG": 0.021, "transFatG": 0.0, "monounsaturatedFatG": 0.011, "polyunsaturatedFatG": 0.109, "cholesterolMg": 0.0, "sodiumMg": 7.0, "potassiumMg": 340.0, "calciumMg": 18.0, "ironMg": 1.2, "waterG": 87.7}},
    "RP-VG-084": {"sourceRecordId": "11821", "nutrients": {"caloriesKcal": 26.0, "carbsG": 6.03, "proteinG": 0.99, "fatG": 0.3, "fiberG": 2.1, "saturatedFatG": 0.059, "transFatG": 0.0, "monounsaturatedFatG": 0.007, "polyunsaturatedFatG": 0.156, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 211.0, "calciumMg": 7.0, "ironMg": 0.43, "waterG": 92.2}},
    "RP-VG-085": {"sourceRecordId": "11112", "nutrients": {"caloriesKcal": 31.0, "carbsG": 7.37, "proteinG": 1.43, "fatG": 0.16, "fiberG": 2.1, "saturatedFatG": 0.021, "transFatG": 0.0, "monounsaturatedFatG": 0.012, "polyunsaturatedFatG": 0.08, "cholesterolMg": 0.0, "sodiumMg": 27.0, "potassiumMg": 243.0, "calciumMg": 45.0, "ironMg": 0.8, "waterG": 90.4}},
    "RP-VG-088": {"sourceRecordId": "11549", "nutrients": {"caloriesKcal": 24.0, "carbsG": 5.31, "proteinG": 1.2, "fatG": 0.3, "fiberG": 1.5, "saturatedFatG": 0.041, "transFatG": 0.0, "monounsaturatedFatG": 0.045, "polyunsaturatedFatG": 0.121, "cholesterolMg": 0.0, "sodiumMg": 474.0, "potassiumMg": 297.0, "calciumMg": 14.0, "ironMg": 0.96, "waterG": 91.3}},
}

VEG_ANALYTICAL_OVERRIDES = {
    "RP-VG-001": {"caloriesKcal": 34.0, "carbsG": 5.8, "proteinG": 4.0, "fatG": 0.4, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-VG-025": {"caloriesKcal": 17.0, "carbsG": 3.3, "proteinG": 1.2, "fatG": 0.3, "fiberG": 2.1, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-VG-041": {"caloriesKcal": 52.0, "carbsG": 12.1, "proteinG": 1.2, "fatG": 0.3, "fiberG": 3.5, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-VG-060": {"caloriesKcal": 19.0, "carbsG": 3.7, "proteinG": 1.8, "fatG": 0.2, "fiberG": 1.6, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-VG-061": {"caloriesKcal": 32.0, "carbsG": 5.4, "proteinG": 3.0, "fatG": 0.6, "fiberG": 4.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-VG-065": {"caloriesKcal": 72.0, "carbsG": 16.8, "proteinG": 2.5, "fatG": 0.1, "fiberG": 3.2, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-VG-073": {"caloriesKcal": 306.0, "carbsG": 44.3, "proteinG": 41.4, "fatG": 2.8, "fiberG": 34.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-VG-074": {"caloriesKcal": 154.0, "carbsG": 30.0, "proteinG": 18.0, "fatG": 2.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-VG-075": {"caloriesKcal": 145.0, "carbsG": 32.0, "proteinG": 8.0, "fatG": 1.5, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-VG-080": {"caloriesKcal": 220.0, "carbsG": 34.0, "proteinG": 22.0, "fatG": 2.5, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-VG-081": {"caloriesKcal": 69.0, "carbsG": 11.7, "proteinG": 4.3, "fatG": 2.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-VG-082": {"caloriesKcal": 20.0, "carbsG": 3.4, "proteinG": 2.0, "fatG": 0.4, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
}

CORE_KEYS = [
    "caloriesKcal", "carbsG", "proteinG", "fatG",
    "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG",
    "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg",
    "calciumMg", "ironMg", "waterG"
]


def make_veg_item(row):
    ar, en, w, hh_ar, hh_en, prep, code, page = row
    W = float(w)
    usda_prof = VEG_USDA_SR_PROFILES.get(code)
    override = VEG_ANALYTICAL_OVERRIDES.get(code)

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
            f"وزن بديل الخضروات من RegimePlan 2026 (ص {page}): {w} جم ({hh_ar})."
        )
        notes_en = (
            f"Analytical 100g composition from USDA SR Legacy (NDB {src_rec_id}). "
            f"RegimePlan Food Exchange Lists (2026, p. {page}) vegetable exchange portion: {w}g ({hh_en})."
        )
    elif comp_basis == "exchange_only":
        notes_ar = (
            f"سجل بديل غذائي فقط من RegimePlan 2026 (ص {page}). "
            f"وزن الحصة البديلة: {w} جم ({hh_ar}). التركيبة التحليلية لكل 100 جم غير محللة."
        )
        notes_en = (
            f"Exchange-only food item from RegimePlan Food Exchange Lists (2026, p. {page}). "
            f"Standard vegetable exchange portion: {w}g ({hh_en}). Analytical 100g composition is unassayed."
        )
    else:
        notes_ar = f"تركيبة مراجعة سريرياً لكل 100 جم. وزن الحصة البديلة وفق RegimePlan 2026 (ص {page}): {w} جم ({hh_ar})."
        notes_en = f"Clinically reviewed 100g composition. RegimePlan Food Exchange Lists (2026, p. {page}) vegetable exchange portion: {w}g ({hh_en})."

    item_id = f"food_veg_rp_{code.lower().replace('-', '_')}"
    record = {
        "id": item_id,
        "code": code,
        "sourceId": src_id,
        "nameEn": en,
        "nameAr": ar,
        "foodGroupId": "vegetables",
        "primaryExchangeCategoryId": "vegetable_non_starchy",
        "preparationState": prep,
        "verificationStatus": ver_status,
        "compositionBasis": comp_basis,
        "isCustom": False,
        "nutrients100g": nutrients,
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
        "notesAr": notes_ar,
        "notesEn": notes_en,
    }
    if src_rec_id is not None:
        record["sourceRecordId"] = str(src_rec_id)
    return record


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
