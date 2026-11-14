# -*- coding: utf-8 -*-
import json
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.environ.get("NCP_CATALOG_OUT_DIR") or os.path.join(BASE_DIR, "src", "clinical", "food", "data")
os.makedirs(OUT_DIR, exist_ok=True)
OUT_PATH = os.path.join(OUT_DIR, "fruits.ts")

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

FRUIT_USDA_SR_PROFILES = {
    "RP-FR-014": {"sourceRecordId": "09421", "nutrients": {"caloriesKcal": 277.0, "carbsG": 75.0, "proteinG": 1.81, "fatG": 0.15, "fiberG": 6.7, "transFatG": 0.0, "sodiumMg": 1.0, "potassiumMg": 696.0, "calciumMg": 64.0, "ironMg": 0.9, "waterG": 21.3}},
    "RP-FR-015": {"sourceRecordId": "09200", "nutrients": {"caloriesKcal": 47.0, "carbsG": 11.8, "proteinG": 0.94, "fatG": 0.12, "fiberG": 2.4, "saturatedFatG": 0.015, "transFatG": 0.0, "monounsaturatedFatG": 0.023, "polyunsaturatedFatG": 0.025, "cholesterolMg": 0.0, "sodiumMg": 0.0, "potassiumMg": 181.0, "calciumMg": 40.0, "ironMg": 0.1, "waterG": 86.8}},
    "RP-FR-016": {"sourceRecordId": "09316", "nutrients": {"caloriesKcal": 32.0, "carbsG": 7.68, "proteinG": 0.67, "fatG": 0.3, "fiberG": 2.0, "saturatedFatG": 0.015, "transFatG": 0.0, "monounsaturatedFatG": 0.043, "polyunsaturatedFatG": 0.155, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 153.0, "calciumMg": 16.0, "ironMg": 0.41, "waterG": 91.0}},
    "RP-FR-017": {"sourceRecordId": "09132", "nutrients": {"caloriesKcal": 69.0, "carbsG": 18.1, "proteinG": 0.72, "fatG": 0.16, "fiberG": 0.9, "saturatedFatG": 0.054, "transFatG": 0.0, "monounsaturatedFatG": 0.007, "polyunsaturatedFatG": 0.048, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 191.0, "calciumMg": 10.0, "ironMg": 0.36, "waterG": 80.5}},
    "RP-FR-018": {"sourceRecordId": "09176", "nutrients": {"caloriesKcal": 60.0, "carbsG": 15.0, "proteinG": 0.82, "fatG": 0.38, "fiberG": 1.6, "saturatedFatG": 0.092, "transFatG": 0.0, "monounsaturatedFatG": 0.14, "polyunsaturatedFatG": 0.071, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 168.0, "calciumMg": 11.0, "ironMg": 0.16, "waterG": 83.5}},
    "RP-FR-019": {"sourceRecordId": "09266", "nutrients": {"caloriesKcal": 50.0, "carbsG": 13.1, "proteinG": 0.54, "fatG": 0.12, "fiberG": 1.4, "saturatedFatG": 0.009, "transFatG": 0.0, "monounsaturatedFatG": 0.013, "polyunsaturatedFatG": 0.04, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 109.0, "calciumMg": 13.0, "ironMg": 0.29, "waterG": 86.0}},
    "RP-FR-020": {"sourceRecordId": "09326", "nutrients": {"caloriesKcal": 30.0, "carbsG": 7.55, "proteinG": 0.61, "fatG": 0.15, "fiberG": 0.4, "saturatedFatG": 0.016, "transFatG": 0.0, "monounsaturatedFatG": 0.037, "polyunsaturatedFatG": 0.05, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 112.0, "calciumMg": 7.0, "ironMg": 0.24, "waterG": 91.4}},
    "RP-FR-021": {"sourceRecordId": "09298", "nutrients": {"caloriesKcal": 299.0, "carbsG": 79.3, "proteinG": 3.3, "fatG": 0.25, "fiberG": 4.5, "saturatedFatG": 0.094, "transFatG": 0.001, "monounsaturatedFatG": 0.024, "polyunsaturatedFatG": 0.053, "cholesterolMg": 0.0, "sodiumMg": 26.0, "potassiumMg": 744.0, "calciumMg": 62.0, "ironMg": 1.79, "waterG": 15.5}},
    "RP-FR-022": {"sourceRecordId": "09252", "nutrients": {"caloriesKcal": 57.0, "carbsG": 15.2, "proteinG": 0.36, "fatG": 0.14, "fiberG": 3.1, "saturatedFatG": 0.022, "transFatG": 0.0, "monounsaturatedFatG": 0.084, "polyunsaturatedFatG": 0.094, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 116.0, "calciumMg": 9.0, "ironMg": 0.18, "waterG": 84.0}},
    "RP-FR-023": {"sourceRecordId": "09236", "nutrients": {"caloriesKcal": 39.0, "carbsG": 9.54, "proteinG": 0.91, "fatG": 0.25, "fiberG": 1.5, "saturatedFatG": 0.019, "transFatG": 0.0, "monounsaturatedFatG": 0.067, "polyunsaturatedFatG": 0.086, "cholesterolMg": 0.0, "sodiumMg": 0.0, "potassiumMg": 190.0, "calciumMg": 6.0, "ironMg": 0.25, "waterG": 88.9}},
    "RP-FR-024": {"sourceRecordId": "09279", "nutrients": {"caloriesKcal": 46.0, "carbsG": 11.4, "proteinG": 0.7, "fatG": 0.28, "fiberG": 1.4, "saturatedFatG": 0.017, "transFatG": 0.0, "monounsaturatedFatG": 0.134, "polyunsaturatedFatG": 0.044, "cholesterolMg": 0.0, "sodiumMg": 0.0, "potassiumMg": 157.0, "calciumMg": 6.0, "ironMg": 0.17, "waterG": 87.2}},
    "RP-FR-025": {"sourceRecordId": "09148", "nutrients": {"caloriesKcal": 61.0, "carbsG": 14.7, "proteinG": 1.14, "fatG": 0.52, "fiberG": 3.0, "saturatedFatG": 0.029, "transFatG": 0.0, "monounsaturatedFatG": 0.047, "polyunsaturatedFatG": 0.287, "cholesterolMg": 0.0, "sodiumMg": 3.0, "potassiumMg": 312.0, "calciumMg": 34.0, "ironMg": 0.31, "waterG": 83.1}},
    "RP-FR-026": {"sourceRecordId": "09050", "nutrients": {"caloriesKcal": 57.0, "carbsG": 14.5, "proteinG": 0.74, "fatG": 0.33, "fiberG": 2.4, "saturatedFatG": 0.028, "transFatG": 0.0, "monounsaturatedFatG": 0.047, "polyunsaturatedFatG": 0.146, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 77.0, "calciumMg": 6.0, "ironMg": 0.28, "waterG": 84.2}},
    "RP-FR-027": {"sourceRecordId": "09302", "nutrients": {"caloriesKcal": 52.0, "carbsG": 11.9, "proteinG": 1.2, "fatG": 0.65, "fiberG": 6.5, "saturatedFatG": 0.019, "transFatG": 0.0, "monounsaturatedFatG": 0.064, "polyunsaturatedFatG": 0.375, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 151.0, "calciumMg": 25.0, "ironMg": 0.69, "waterG": 85.8}},
    "RP-FR-028": {"sourceRecordId": "09286", "nutrients": {"caloriesKcal": 83.0, "carbsG": 18.7, "proteinG": 1.67, "fatG": 1.17, "fiberG": 4.0, "saturatedFatG": 0.12, "transFatG": 0.0, "monounsaturatedFatG": 0.093, "polyunsaturatedFatG": 0.079, "cholesterolMg": 0.0, "sodiumMg": 3.0, "potassiumMg": 236.0, "calciumMg": 10.0, "ironMg": 0.3, "waterG": 77.9}},
    "RP-FR-029": {"sourceRecordId": "09181", "nutrients": {"caloriesKcal": 34.0, "carbsG": 8.16, "proteinG": 0.84, "fatG": 0.19, "fiberG": 0.9, "saturatedFatG": 0.051, "transFatG": 0.0, "monounsaturatedFatG": 0.003, "polyunsaturatedFatG": 0.081, "cholesterolMg": 0.0, "sodiumMg": 16.0, "potassiumMg": 267.0, "calciumMg": 9.0, "ironMg": 0.21, "waterG": 90.2}},
    "RP-FR-030": {"sourceRecordId": "09089", "nutrients": {"caloriesKcal": 74.0, "carbsG": 19.2, "proteinG": 0.75, "fatG": 0.3, "fiberG": 2.9, "saturatedFatG": 0.06, "transFatG": 0.0, "monounsaturatedFatG": 0.066, "polyunsaturatedFatG": 0.144, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 232.0, "calciumMg": 35.0, "ironMg": 0.37, "waterG": 79.1}},
    "RP-FR-032": {"sourceRecordId": "09070", "nutrients": {"caloriesKcal": 63.0, "carbsG": 16.0, "proteinG": 1.06, "fatG": 0.2, "fiberG": 2.1, "saturatedFatG": 0.038, "transFatG": 0.0, "monounsaturatedFatG": 0.047, "polyunsaturatedFatG": 0.052, "cholesterolMg": 0.0, "sodiumMg": 0.0, "potassiumMg": 222.0, "calciumMg": 13.0, "ironMg": 0.36, "waterG": 82.2}},
    "RP-FR-033": {"sourceRecordId": "09112", "nutrients": {"caloriesKcal": 42.0, "carbsG": 10.7, "proteinG": 0.77, "fatG": 0.14, "fiberG": 1.6, "saturatedFatG": 0.021, "transFatG": 0.0, "monounsaturatedFatG": 0.02, "polyunsaturatedFatG": 0.036, "cholesterolMg": 0.0, "sodiumMg": 0.0, "potassiumMg": 135.0, "calciumMg": 22.0, "ironMg": 0.08, "waterG": 88.1}},
    "RP-FR-034": {"sourceRecordId": "09226", "nutrients": {"caloriesKcal": 43.0, "carbsG": 10.8, "proteinG": 0.47, "fatG": 0.26, "fiberG": 1.7, "saturatedFatG": 0.081, "transFatG": 0.0, "monounsaturatedFatG": 0.072, "polyunsaturatedFatG": 0.058, "cholesterolMg": 0.0, "sodiumMg": 8.0, "potassiumMg": 182.0, "calciumMg": 20.0, "ironMg": 0.25, "waterG": 88.1}},
    "RP-FR-035": {"sourceRecordId": "09087", "nutrients": {"caloriesKcal": 282.0, "carbsG": 75.0, "proteinG": 2.45, "fatG": 0.39, "fiberG": 8.0, "saturatedFatG": 0.032, "transFatG": 0.0, "monounsaturatedFatG": 0.036, "polyunsaturatedFatG": 0.019, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 656.0, "calciumMg": 39.0, "ironMg": 1.02, "waterG": 20.5}},
    "RP-FR-036": {"sourceRecordId": "09079", "nutrients": {"caloriesKcal": 308.0, "carbsG": 82.8, "proteinG": 0.17, "fatG": 1.09, "fiberG": 5.3, "saturatedFatG": 0.088, "transFatG": 0.003, "monounsaturatedFatG": 0.298, "polyunsaturatedFatG": 0.182, "cholesterolMg": 0.0, "sodiumMg": 5.0, "potassiumMg": 49.0, "calciumMg": 9.0, "ironMg": 0.39, "waterG": 15.8}},
    "RP-FR-037": {"sourceRecordId": "09042", "nutrients": {"caloriesKcal": 43.0, "carbsG": 9.61, "proteinG": 1.39, "fatG": 0.49, "fiberG": 5.3, "saturatedFatG": 0.014, "transFatG": 0.0, "monounsaturatedFatG": 0.047, "polyunsaturatedFatG": 0.28, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 162.0, "calciumMg": 29.0, "ironMg": 0.62, "waterG": 88.2}},
    "RP-FR-038": {"sourceRecordId": "09164", "nutrients": {"caloriesKcal": 66.0, "carbsG": 16.5, "proteinG": 0.83, "fatG": 0.44, "fiberG": 1.3, "saturatedFatG": 0.099, "transFatG": 0.0, "monounsaturatedFatG": 0.12, "polyunsaturatedFatG": 0.132, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 171.0, "calciumMg": 5.0, "ironMg": 0.31, "waterG": 81.8}},
    "RP-FR-040": {"sourceRecordId": "09231", "nutrients": {"caloriesKcal": 97.0, "carbsG": 23.4, "proteinG": 2.2, "fatG": 0.7, "fiberG": 10.4, "saturatedFatG": 0.059, "transFatG": 0.0, "monounsaturatedFatG": 0.086, "polyunsaturatedFatG": 0.411, "cholesterolMg": 0.0, "sodiumMg": 28.0, "potassiumMg": 348.0, "calciumMg": 12.0, "ironMg": 1.6, "waterG": 72.9}},
    "RP-FR-041": {"sourceRecordId": "09263", "nutrients": {"caloriesKcal": 70.0, "carbsG": 18.6, "proteinG": 0.58, "fatG": 0.19, "fiberG": 3.6, "saturatedFatG": 0.02, "transFatG": 0.0, "monounsaturatedFatG": 0.037, "polyunsaturatedFatG": 0.043, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 161.0, "calciumMg": 8.0, "ironMg": 0.15, "waterG": 80.3}},
    "RP-FR-042": {"sourceRecordId": "09191", "nutrients": {"caloriesKcal": 44.0, "carbsG": 10.6, "proteinG": 1.06, "fatG": 0.32, "fiberG": 1.7, "saturatedFatG": 0.025, "transFatG": 0.0, "monounsaturatedFatG": 0.088, "polyunsaturatedFatG": 0.113, "cholesterolMg": 0.0, "sodiumMg": 0.0, "potassiumMg": 201.0, "calciumMg": 6.0, "ironMg": 0.28, "waterG": 87.6}},
    "RP-FR-043": {"sourceRecordId": "09021", "nutrients": {"caloriesKcal": 48.0, "carbsG": 11.1, "proteinG": 1.4, "fatG": 0.39, "fiberG": 2.0, "saturatedFatG": 0.027, "transFatG": 0.0, "monounsaturatedFatG": 0.17, "polyunsaturatedFatG": 0.077, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 259.0, "calciumMg": 13.0, "ironMg": 0.39, "waterG": 86.4}},
    "RP-FR-045": {"sourceRecordId": "09291", "nutrients": {"caloriesKcal": 240.0, "carbsG": 63.9, "proteinG": 2.18, "fatG": 0.38, "fiberG": 7.1, "saturatedFatG": 0.088, "monounsaturatedFatG": 0.053, "polyunsaturatedFatG": 0.062, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 732.0, "calciumMg": 43.0, "ironMg": 0.93, "waterG": 30.9}},
    "RP-FR-046": {"sourceRecordId": "09144", "nutrients": {"caloriesKcal": 95.0, "carbsG": 23.2, "proteinG": 1.72, "fatG": 0.64, "fiberG": 1.5, "saturatedFatG": 0.195, "transFatG": 0.0, "monounsaturatedFatG": 0.155, "polyunsaturatedFatG": 0.094, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 448.0, "calciumMg": 24.0, "ironMg": 0.23, "waterG": 73.5}},
    "RP-FR-048": {"sourceRecordId": "09060", "nutrients": {"caloriesKcal": 31.0, "carbsG": 6.73, "proteinG": 1.04, "fatG": 0.33, "fiberG": 2.8, "saturatedFatG": 0.019, "transFatG": 0.0, "monounsaturatedFatG": 0.03, "polyunsaturatedFatG": 0.184, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 133.0, "calciumMg": 3.0, "ironMg": 0.08, "waterG": 91.4}},
    "RP-FR-050": {"sourceRecordId": "09218", "nutrients": {"caloriesKcal": 53.0, "carbsG": 13.3, "proteinG": 0.81, "fatG": 0.31, "fiberG": 1.8, "saturatedFatG": 0.039, "transFatG": 0.0, "monounsaturatedFatG": 0.06, "polyunsaturatedFatG": 0.065, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 166.0, "calciumMg": 37.0, "ironMg": 0.15, "waterG": 85.2}},
    "RP-FR-051": {"sourceRecordId": "09287", "nutrients": {"caloriesKcal": 41.0, "carbsG": 9.57, "proteinG": 0.73, "fatG": 0.51, "fiberG": 3.6, "saturatedFatG": 0.067, "transFatG": 0.0, "monounsaturatedFatG": 0.075, "polyunsaturatedFatG": 0.213, "cholesterolMg": 0.0, "sodiumMg": 5.0, "potassiumMg": 220.0, "calciumMg": 56.0, "ironMg": 0.3, "waterG": 87.6}},
    "RP-FR-052": {"sourceRecordId": "09062", "nutrients": {"caloriesKcal": 75.0, "carbsG": 17.7, "proteinG": 1.57, "fatG": 0.68, "fiberG": 3.0, "saturatedFatG": 0.233, "transFatG": 0.0, "monounsaturatedFatG": 0.055, "polyunsaturatedFatG": 0.188, "cholesterolMg": 0.0, "sodiumMg": 7.0, "potassiumMg": 287.0, "calciumMg": 10.0, "ironMg": 0.27, "waterG": 79.4}},
    "RP-FR-053": {"sourceRecordId": "09190", "nutrients": {"caloriesKcal": 43.0, "carbsG": 9.8, "proteinG": 1.44, "fatG": 0.39, "fiberG": 1.7, "saturatedFatG": 0.027, "transFatG": 0.0, "monounsaturatedFatG": 0.041, "polyunsaturatedFatG": 0.207, "cholesterolMg": 0.0, "sodiumMg": 10.0, "potassiumMg": 194.0, "calciumMg": 39.0, "ironMg": 1.85, "waterG": 87.7}},
    "RP-FR-054": {"sourceRecordId": "09174", "nutrients": {"caloriesKcal": 47.0, "carbsG": 12.1, "proteinG": 0.43, "fatG": 0.2, "fiberG": 1.7, "saturatedFatG": 0.04, "transFatG": 0.0, "monounsaturatedFatG": 0.008, "polyunsaturatedFatG": 0.091, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 266.0, "calciumMg": 16.0, "ironMg": 0.28, "waterG": 86.7}},
    "RP-FR-058": {"sourceRecordId": "09206", "nutrients": {"caloriesKcal": 45.0, "carbsG": 10.4, "proteinG": 0.7, "fatG": 0.2, "fiberG": 0.2, "saturatedFatG": 0.024, "transFatG": 0.0, "monounsaturatedFatG": 0.036, "polyunsaturatedFatG": 0.04, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 200.0, "calciumMg": 11.0, "ironMg": 0.2, "waterG": 88.3}},
    "RP-FR-059": {"sourceRecordId": "09400", "nutrients": {"caloriesKcal": 46.0, "carbsG": 11.3, "proteinG": 0.1, "fatG": 0.13, "fiberG": 0.2, "saturatedFatG": 0.022, "transFatG": 0.0, "monounsaturatedFatG": 0.006, "polyunsaturatedFatG": 0.039, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 101.0, "calciumMg": 8.0, "ironMg": 0.12, "waterG": 88.2}},
    "RP-FR-060": {"sourceRecordId": "09442", "nutrients": {"caloriesKcal": 54.0, "carbsG": 13.1, "proteinG": 0.15, "fatG": 0.29, "fiberG": 0.1, "saturatedFatG": 0.077, "transFatG": 0.0, "monounsaturatedFatG": 0.059, "polyunsaturatedFatG": 0.05, "cholesterolMg": 0.0, "sodiumMg": 9.0, "potassiumMg": 214.0, "calciumMg": 11.0, "ironMg": 0.1, "waterG": 86.0}},
    "RP-FR-061": {"sourceRecordId": "14242", "nutrients": {"caloriesKcal": 54.0, "carbsG": 13.5, "proteinG": 0.0, "fatG": 0.1, "fiberG": 0.0, "saturatedFatG": 0.009, "transFatG": 0.0, "monounsaturatedFatG": 0.019, "polyunsaturatedFatG": 0.059, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 14.0, "calciumMg": 3.0, "ironMg": 0.1, "waterG": 86.2}},
}

FRUIT_ANALYTICAL_OVERRIDES = {
    "RP-FR-008": {"caloriesKcal": 541.0, "carbsG": 57.5, "proteinG": 6.0, "fatG": 30.9, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-FR-009": {"caloriesKcal": 286.0, "carbsG": 77.4, "proteinG": 0.0, "fatG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-FR-002": {"caloriesKcal": 598.0, "carbsG": 45.9, "proteinG": 7.8, "fatG": 42.6, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-FR-003": {"caloriesKcal": 535.0, "carbsG": 59.4, "proteinG": 7.7, "fatG": 29.7, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-FR-007": {"caloriesKcal": 457.0, "carbsG": 53.0, "proteinG": 8.5, "fatG": 25.5, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-FR-010": {"caloriesKcal": 290.0, "carbsG": 71.0, "proteinG": 1.2, "fatG": 0.2, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-FR-011": {"caloriesKcal": 275.0, "carbsG": 71.0, "proteinG": 0.0, "fatG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-FR-012": {"caloriesKcal": 516.0, "carbsG": 60.5, "proteinG": 12.0, "fatG": 26.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-FR-013": {"caloriesKcal": 479.0, "carbsG": 65.0, "proteinG": 4.5, "fatG": 27.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    # Dried fruits, jams & molasses analytical remediation
    "RP-FR-001": {
        "caloriesKcal": 282.0, "carbsG": 72.0, "proteinG": 1.5, "fatG": 0.2,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
    "RP-FR-004": {
        "caloriesKcal": 278.0, "carbsG": 68.9, "proteinG": 0.4, "fatG": 0.1,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
    "RP-FR-005": {
        "caloriesKcal": 278.0, "carbsG": 68.9, "proteinG": 0.4, "fatG": 0.1,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
    "RP-FR-006": {
        "caloriesKcal": 278.0, "carbsG": 68.9, "proteinG": 0.4, "fatG": 0.1,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
    "RP-FR-031": {
        "caloriesKcal": 249.0, "carbsG": 63.9, "proteinG": 3.3, "fatG": 0.9,
        "fiberG": 9.8,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
    "RP-FR-044": {
        "caloriesKcal": 241.0, "carbsG": 62.6, "proteinG": 3.4, "fatG": 0.5,
        "fiberG": 7.3,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
    "RP-FR-056": {
        "caloriesKcal": 282.0, "carbsG": 75.0, "proteinG": 2.0, "fatG": 0.4,
        "fiberG": 7.0,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
    "RP-FR-057": {
        "caloriesKcal": 280.0, "carbsG": 68.0, "proteinG": 2.8, "fatG": 0.5,
        "fiberG": 6.5,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
}

CONFECTIONERY_CODES = {"RP-FR-002", "RP-FR-003", "RP-FR-007", "RP-FR-008", "RP-FR-012", "RP-FR-013"}

CORE_KEYS = [
    "caloriesKcal", "carbsG", "proteinG", "fatG",
    "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG",
    "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg",
    "calciumMg", "ironMg", "waterG"
]


def make_fruit_item(row):
    ar, en, w, hh_ar, hh_en, prep, code, page = row
    W = float(w)
    usda_prof = FRUIT_USDA_SR_PROFILES.get(code)
    override = FRUIT_ANALYTICAL_OVERRIDES.get(code)

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

    item_id = "food_fruit_rp_rp_st_019" if code == "RP-FR-019" else f"food_fruit_rp_{code.lower().replace('-', '_')}"

    is_confectionery = code in CONFECTIONERY_CODES
    food_group = "occasions" if is_confectionery else "fruits"
    exchange_cat = "combination_food" if is_confectionery else "fruit"

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
        notes_ar = f"تركيبة مراجعة سريرياً لكل 100 جم. وزن الحصة وفق RegimePlan 2026 (ص {page}): {w} جم ({hh_ar}). صنف مركب يتطلب مراجعة سريرية للبدائل."
        notes_en = f"Clinically reviewed 100g composition. RegimePlan Food Exchange Lists (2026, p. {page}) serving weight: {w}g ({hh_en}). Composite item requiring clinical review."
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
        if src_id == "usda_fdc":
            notes_ar = (
                f"التركيبة التحليلية لكل 100 جم من USDA SR Legacy (NDB {src_rec_id}). "
                f"وزن بديل الفاكهة من RegimePlan 2026 (ص {page}): {w} جم ({hh_ar})."
            )
            notes_en = (
                f"Analytical 100g composition from USDA SR Legacy (NDB {src_rec_id}). "
                f"RegimePlan Food Exchange Lists (2026, p. {page}) fruit exchange portion: {w}g ({hh_en})."
            )
        elif comp_basis == "exchange_only":
            notes_ar = (
                f"سجل بديل غذائي فقط من RegimePlan 2026 (ص {page}). "
                f"وزن الحصة البديلة: {w} جم ({hh_ar}). التركيبة التحليلية لكل 100 جم غير محللة."
            )
            notes_en = (
                f"Exchange-only food item from RegimePlan Food Exchange Lists (2026, p. {page}). "
                f"Standard fruit exchange portion: {w}g ({hh_en}). Analytical 100g composition is unassayed."
            )
        else:
            notes_ar = f"تركيبة مراجعة سريرياً لكل 100 جم. وزن الحصة البديلة وفق RegimePlan 2026 (ص {page}): {w} جم ({hh_ar})."
            notes_en = f"Clinically reviewed 100g composition. RegimePlan Food Exchange Lists (2026, p. {page}) fruit exchange portion: {w}g ({hh_en})."

    record = {
        "id": item_id,
        "code": code,
        "sourceId": src_id,
        "nameEn": en,
        "nameAr": ar,
        "foodGroupId": food_group,
        "primaryExchangeCategoryId": exchange_cat,
        "preparationState": prep,
        "verificationStatus": ver_status,
        "compositionBasis": comp_basis,
        "isCustom": False,
        "nutrients100g": nutrients,
        "portions": [portion_def],
        "tags": tags,
        "notesAr": notes_ar,
        "notesEn": notes_en
    }
    if src_rec_id is not None:
        record["sourceRecordId"] = str(src_rec_id)
    return record

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
