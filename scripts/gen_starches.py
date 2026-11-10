# -*- coding: utf-8 -*-
import json
import os

OUT_PATH = "/app/applet/src/clinical/food/data/starches.ts"

with open("scripts/original_30_grouped.json", "r", encoding="utf-8") as f:
    orig = json.load(f)["starches"]

# 128 new starches from PDF p. 1, 2, 3, 4
RAW_STARCHES = [
    # Page 1 - Breads
    ("عيش شامي", "Shami Pita Bread", 27, "نصف حبة", "1/2 piece", "baked", "RP-ST-001", 1),
    ("تورتيلا دقيق", "Flour Tortilla", 30, "حبة (6 إنش)", "1 piece (6 in)", "baked", "RP-ST-002", 1),
    ("عيش جاودار", "Rye Bread", 31, "شريحة", "1 slice", "baked", "RP-ST-003", 1),
    ("عيش مخمر", "Sourdough Bread", 29, "نصف شريحة", "1/2 slice", "baked", "RP-ST-004", 1),
    ("بيجل عادي", "Plain Bagel", 29, "ربع حبة متوسطة", "1/4 medium bagel", "baked", "RP-ST-005", 1),
    ("مافن إنجليزي", "English Muffin", 34, "نصف حبة", "1/2 muffin", "baked", "RP-ST-006", 1),
    ("عيش فينو", "Fino Roll Bread (Egyptian Baguette)", 27, "نصف رغيف", "1/2 roll", "baked", "RP-ST-007", 1),
    ("عيش سن", "Sunn Bread (Whole Wheat & Bran Egyptian Flatbread)", 28, "ربع رغيف سن", "1/4 sunn loaf", "baked", "RP-ST-008", 1),
    ("عيش شامي أسمر", "Brown Shami Bread", 27, "حبة صغيرة", "1 small pita", "baked", "RP-ST-009", 1),
    ("عيش أسمر توست", "Whole Wheat Toast Bread", 35, "شريحة وربع", "1.25 slice", "baked", "RP-ST-010", 1),
    ("عيش أبيض توست", "White Toast Bread", 30, "شريحة وربع", "1.25 slice", "baked", "RP-ST-011", 1),

    # Page 2 - Breads & Crusts
    ("بقسماط", "Breadsticks / Rusks", 19, "حبتان", "2 pieces", "baked", "RP-ST-012", 2),
    ("كعك بالسمسم", "Sesame Kaak Ring", 27, "ثلث حلقة (27غ)", "1/3 ring (27g)", "baked", "RP-ST-013", 2),
    ("عجينة بيتزا نيئة", "Raw Pizza Dough", 32, "كرة عجين صغيرة", "Small dough ball", "raw", "RP-ST-014", 2),
    ("جلاش", "Phyllo Pastry Dough", 29, "ورقة ونصف", "1.5 sheets", "raw", "RP-ST-015", 2),
    ("بقسماط مطحون", "Dry Breadcrumbs", 21, "3 ملاعق كبيرة", "3 tbsp", "baked", "RP-ST-016", 2),
    ("بانكو", "Panko Japanese Breadcrumbs", 20, "ثلث كوب", "1/3 cup", "baked", "RP-ST-017", 2),
    ("عيش محمر", "Fried Pita Croutons", 20, "ثلثا كوب", "2/3 cup", "fried", "RP-ST-018", 2),
    ("عجينة كنافة", "Raw Kunafa Pastry Threads", 29, "قبضة عجين", "Handful raw dough", "raw", "RP-ST-019", 2),
    ("رقاق ناشف", "Dry Roqaq Flatbread", 18, "نصف شريحة", "1/2 sheet", "baked", "RP-ST-020", 2),

    # Page 2 - Grains & Pastas
    ("برغل مطبوخ", "Cooked Bulgur Wheat", 81, "7 ملاعق كبيرة", "7 tbsp", "cooked", "RP-ST-021", 2),
    ("فريك مطبوخ", "Cooked Freekeh (Green Wheat)", 86, "نصف كوب", "1/2 cup", "cooked", "RP-ST-022", 2),
    ("شعرية ناشفة", "Dry Vermicelli Pasta", 20, "3 ملاعق كبيرة ونصف", "3.5 tbsp", "raw", "RP-ST-023", 2),
    ("أرز بني مطبوخ", "Cooked Brown Rice", 59, "5 ملاعق كبيرة", "5 tbsp", "cooked", "RP-ST-024", 2),
    ("أرز بني نيء", "Raw Brown Rice", 20, "ملعقة كبيرة ونصف", "1.5 tbsp", "raw", "RP-ST-025", 2),
    ("مكرونة بيضاء مطبوخة", "Cooked White Pasta", 49, "ثلث كوب", "1/3 cup", "cooked", "RP-ST-026", 2),
    ("مكرونة بيضاء نيئة", "Raw White Pasta", 20, "3 ملاعق كبيرة", "3 tbsp", "raw", "RP-ST-027", 2),
    ("مكرونة قمح كامل مطبوخة", "Cooked Whole Wheat Pasta", 50, "ثلث كوب", "1/3 cup", "cooked", "RP-ST-028", 2),
    ("مكرونة قمح كامل نيئة", "Raw Whole Wheat Pasta", 20, "3 ملاعق كبيرة ونصف", "3.5 tbsp", "raw", "RP-ST-029", 2),
    ("شوفان نيء", "Raw Rolled Oats", 22, "ربع كوب", "1/4 cup", "raw", "RP-ST-030", 2),
    ("كينوا مطبوخة", "Cooked Quinoa", 70, "6 ملاعق كبيرة", "6 tbsp", "cooked", "RP-ST-031", 2),
    ("كينوا نيئة", "Raw Quinoa", 23, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-032", 2),
    ("كسكس مطبوخ", "Cooked Couscous", 65, "6 ملاعق كبيرة ونصف", "6.5 tbsp", "cooked", "RP-ST-033", 2),
    ("كسكس نيء", "Raw Couscous", 19, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-034", 2),
    ("شعير مطبوخ", "Cooked Whole Barley", 53, "ثلث كوب", "1/3 cup", "cooked", "RP-ST-035", 2),
    ("برغل نيء", "Raw Bulgur Grain", 20, "ملعقتان كبيرتان ونصف", "2.5 tbsp", "raw", "RP-ST-036", 2),
    ("نودلز أرز مطبوخة", "Cooked Rice Noodles", 63, "ثلث كوب", "1/3 cup", "cooked", "RP-ST-037", 2),
    ("بولنتا مطبوخة", "Cooked Cornmeal Polenta", 81, "ثلث كوب", "1/3 cup", "cooked", "RP-ST-038", 2),
    ("حنطة سوداء نيئة", "Raw Buckwheat Groats", 21, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-039", 2),
    ("حنطة سوداء مطبوخة", "Cooked Buckwheat", 75, "نصف كوب", "1/2 cup", "cooked", "RP-ST-040", 2),
    ("أمارانت نيء", "Raw Amaranth Grain", 23, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-041", 2),
    ("أمارانت مطبوخ", "Cooked Amaranth", 80, "ثلث كوب", "1/3 cup", "cooked", "RP-ST-042", 2),
    ("دخن نيء", "Raw Pearl Millet", 21, "ملعقة كبيرة ونصف", "1.5 tbsp", "raw", "RP-ST-043", 2),
    ("دخن مطبوخ", "Cooked Millet", 63, "ثلث كوب", "1/3 cup", "cooked", "RP-ST-044", 2),
    ("تيف نيء", "Raw Teff Grain", 21, "ملعقة كبيرة ونصف", "1.5 tbsp", "raw", "RP-ST-045", 2),
    ("حنطة قديمة نيئة", "Raw Spelt / Farro", 21, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-046", 2),
    ("ذرة رفيعة نيئة", "Raw Sorghum Grain", 21, "ملعقة كبيرة ونصف", "1.5 tbsp", "raw", "RP-ST-047", 2),
    ("أرز بري مطبوخ", "Cooked Wild Rice", 70, "7 ملاعق كبيرة", "7 tbsp", "cooked", "RP-ST-048", 2),
    ("كورن فليكس", "Cornflakes Cereal", 17, "ثلثا كوب", "2/3 cup", "ready-to-eat", "RP-ST-049", 2),
    ("ميوزلي", "Muesli Cereal", 20, "ربع كوب", "1/4 cup", "ready-to-eat", "RP-ST-050", 2),
    ("رقائق النخالة", "Bran Flakes Cereal", 19, "نصف كوب", "1/2 cup", "ready-to-eat", "RP-ST-051", 2),
    ("أرز منفوش", "Puffed Rice Cereal", 17, "كوب", "1 cup", "ready-to-eat", "RP-ST-052", 2),
    ("أورزو مطبوخ (لسان عصفور)", "Cooked Orzo Pasta (Lesan Asfour)", 49, "ثلث كوب", "1/3 cup", "cooked", "RP-ST-053", 2),
    ("شرائح لازانيا نيئة", "Raw Lasagna Sheets", 20, "ورقة ونصف", "1.5 sheets", "raw", "RP-ST-054", 2),
    ("نودلز بالبيض مطبوخة", "Cooked Egg Noodles", 60, "6 ملاعق كبيرة", "6 tbsp", "cooked", "RP-ST-055", 2),
    ("أودون مطبوخ", "Cooked Udon Noodles", 69, "6 ملاعق كبيرة ونصف", "6.5 tbsp", "cooked", "RP-ST-056", 2),
    ("سوبا مطبوخ", "Cooked Soba Buckwheat Noodles", 70, "ثلثا كوب", "2/3 cup", "cooked", "RP-ST-057", 2),
    ("أرز بسمتي مطبوخ", "Cooked Basmati Rice", 59, "6 ملاعق كبيرة", "6 tbsp", "cooked", "RP-ST-058", 2),
    ("أرز ياسمين مطبوخ", "Cooked Jasmine Rice", 53, "ثلث كوب", "1/3 cup", "cooked", "RP-ST-059", 2),
    ("أرز أربوريو نيء", "Raw Arborio Risotto Rice", 19, "ملعقة كبيرة ونصف", "1.5 tbsp", "raw", "RP-ST-060", 2),
    ("أرز لزج مطبوخ", "Cooked Glutinous Sticky Rice", 71, "6 ملاعق كبيرة ونصف", "6.5 tbsp", "cooked", "RP-ST-061", 2),
    ("فريك نيء", "Raw Freekeh Green Wheat", 20, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-062", 2),
    ("شعير نيء", "Raw Pearl Barley", 19, "ملعقة كبيرة ونصف", "1.5 tbsp", "raw", "RP-ST-063", 2),
    ("أرز بسمتي نيء", "Raw Basmati Rice", 19, "ملعقة كبيرة ونصف", "1.5 tbsp", "raw", "RP-ST-064", 2),
    ("ردة ناعمة", "Wheat Bran", 23, "6 ملاعق كبيرة ونصف", "6.5 tbsp", "raw", "RP-ST-065", 2),
    ("نخالة شوفان", "Oat Bran", 24, "5 ملاعق كبيرة", "5 tbsp", "raw", "RP-ST-066", 2),
    ("نيوكي بطاطس", "Potato Gnocchi", 40, "ربع كوب", "1/4 cup", "cooked", "RP-ST-067", 2),
    ("دقيق ذرة أصفر نيء", "Raw Yellow Corn Flour", 20, "ملعقتان كبيرتان ونصف", "2.5 tbsp", "raw", "RP-ST-068", 2),
    ("دقيق أبيض", "All-Purpose White Flour", 20, "ملعقتان كبيرتان ونصف", "2.5 tbsp", "raw", "RP-ST-069", 2),
    ("دقيق أسمر بلدي", "Whole Wheat Flour", 21, "3 ملاعق كبيرة", "3 tbsp", "raw", "RP-ST-070", 2),
    ("نشا ذرة", "Cornstarch", 16, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-071", 2),
    ("لؤلؤ تابيوكا ناشف", "Dry Tapioca Pearls", 17, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-072", 2),
    ("دقيق شوفان", "Oat Flour", 23, "ربع كوب", "1/4 cup", "raw", "RP-ST-073", 2),
    ("دقيق أرز", "White Rice Flour", 19, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-074", 2),
    ("سميد بسبوسة", "Semolina (Durum Wheat Farina)", 21, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-075", 2),
    ("دقيق عيش قوي", "High-Protein Bread Flour", 21, "ملعقتان كبيرتان ونصف", "2.5 tbsp", "raw", "RP-ST-076", 2),

    # Page 3 - Flours & Starches
    ("دقيق ذاتي التخمر", "Self-Rising Flour", 20, "ملعقتان كبيرتان ونصف", "2.5 tbsp", "raw", "RP-ST-077", 3),
    ("ماسا هارينا", "Masa Harina Corn Flour", 20, "ملعقتان كبيرتان ونصف", "2.5 tbsp", "raw", "RP-ST-078", 3),
    ("دقيق حنطة سوداء", "Buckwheat Flour", 21, "3 ملاعق كبيرة", "3 tbsp", "raw", "RP-ST-079", 3),
    ("نشا تابيوكا", "Tapioca Starch", 17, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-080", 3),
    ("نشا بطاطس", "Potato Starch", 17, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-081", 3),
    ("أروروت", "Arrowroot Starch", 17, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-082", 3),

    # Page 3 - Starchy Vegetables
    ("ذرة صفراء مسلوقة", "Boiled Sweet Corn", 71, "ثلاثة أرباع كوز", "3/4 ear", "boiled", "RP-ST-083", 3),
    ("بطاطا حلوة نيئة", "Raw Sweet Potato", 75, "نصف حبة متوسطة", "1/2 medium potato", "raw", "RP-ST-084", 3),
    ("بطاطا حلوة مسلوقة", "Boiled Sweet Potato", 85, "نصف حبة متوسطة", "1/2 medium potato", "boiled", "RP-ST-085", 3),
    ("بطاطس نيئة", "Raw White Potato", 86, "نصف كوب مكعبات", "1/2 cup diced", "raw", "RP-ST-086", 3),
    ("بطاطس مسلوقة", "Boiled Potato", 75, "نصف كوب", "1/2 cup", "boiled", "RP-ST-087", 3),
    ("بطاطس مخبوزة بالقشرة", "Baked Potato with Skin", 71, "حبة صغيرة", "1 small potato", "baked", "RP-ST-088", 3),
    ("بسلة مسلوقة", "Boiled Green Peas", 96, "ثلثا كوب", "2/3 cup", "boiled", "RP-ST-089", 3),
    ("قرع نيء", "Raw Pumpkin", 230, "كوبان مكعبات", "2 cups diced", "raw", "RP-ST-090", 3),
    ("قرع مسلوق", "Boiled Pumpkin", 305, "كوب وربع بيوريه", "1.25 cup mashed", "boiled", "RP-ST-091", 3),
    ("قرع عسلي نيء", "Raw Butternut Squash", 130, "كوب مكعبات", "1 cup cubes", "raw", "RP-ST-092", 3),
    ("قرع عسلي مخبوز", "Baked Butternut Squash", 145, "ثلثا كوب", "2/3 cup", "baked", "RP-ST-093", 3),
    ("قلقاس بلدي نيء", "Raw Taro Root (Qolqas)", 57, "نصف كوب مكعبات", "1/2 cup diced", "raw", "RP-ST-094", 3),
    ("قلقاس مسلوق", "Boiled Taro Root (Qolqas)", 43, "ثلث كوب", "1/3 cup", "boiled", "RP-ST-095", 3),
    ("بطاطس بيوريه مهروسة دون حليب", "Mashed Potatoes (Plain)", 89, "7 ملاعق كبيرة", "7 tbsp", "cooked", "RP-ST-096", 3),
    ("ذرة مشوية على الفحم", "Grilled Corn on the Cob", 68, "ثلاثة أرباع كوز", "3/4 ear", "grilled", "RP-ST-097", 3),
    ("ذرة حبوب معلبة", "Canned Sweet Corn (Drained)", 105, "ثلثا كوب", "2/3 cup", "canned", "RP-ST-098", 3),
    ("بسلة خضراء طازجة", "Fresh Green Peas", 105, "ثلاثة أرباع كوب", "3/4 cup", "raw", "RP-ST-099", 3),
    ("بسلة بالجزر مجمدة ومطبوخة", "Cooked Frozen Peas and Carrots", 135, "كوب", "1 cup", "cooked", "RP-ST-100", 3),
    ("خضار مشكل مجمد ومطبوخ", "Cooked Frozen Mixed Vegetables", 110, "ثلاثة أرباع كوب", "3/4 cup", "cooked", "RP-ST-101", 3),
    ("موز الجنة أخضر نيء", "Raw Green Plantain", 47, "ربع حبة متوسطة", "1/4 medium fruit", "raw", "RP-ST-102", 3),
    ("صلصة طماطم معجون مركز", "Tomato Paste Concentrate", 79, "5 ملاعق كبيرة", "5 tbsp", "cooked", "RP-ST-103", 3),

    # Page 3 - Snacks
    ("كعك أرز مقرمش", "Puffed Rice Cakes", 18, "قطعتان", "2 cakes", "ready-to-eat", "RP-ST-104", 3),
    ("فشار محضر بالهواء الساخن", "Air-Popped Popcorn", 19, "كوبان ونصف", "2.5 cups", "ready-to-eat", "RP-ST-105", 3),

    # Page 3 - Starches with Fat (126 kcal, 15g C, 3g P, 6g F)
    ("بسكويت مملح مقرمش", "Salted Crackers", 24, "5 قطع", "5 crackers", "baked", "RP-ST-106", 3),
    ("جرانولا بالعسل", "Granola Cereal with Honey", 28, "ربع كوب", "1/4 cup", "baked", "RP-ST-107", 3),
    ("نودلز سريعة التحضير ناشفة", "Dry Instant Ramen Noodles", 25, "ربع قالب", "1/4 block", "fried", "RP-ST-108", 3),
    ("كرواسون سادة بالزبدة", "Butter Croissant", 33, "نصف حبة كبيرة", "1/2 large croissant", "baked", "RP-ST-109", 3),
    ("فطير مشلتت فلاحي", "Egyptian Feteer Meshaltet (Flaky Layered Pastry)", 34, "ثلاثة أرباع شريحة", "3/4 slice", "baked", "RP-ST-110", 3),
    ("عجينة فطيرة بالزبدة نيئة", "Raw Shortcrust Pie Pastry", 31, "قطعة عجين", "Dough portion", "raw", "RP-ST-111", 3),
    ("عجينة ميل فاي مورقة", "Raw Puff Pastry Sheet", 35, "ورقة صغيرة", "Small sheet", "raw", "RP-ST-112", 3),
    ("عجينة سكونز", "Scone Pastry", 32, "قطعة", "1 piece", "baked", "RP-ST-113", 3),
    ("بطاطس مقلية بالزيت", "French Fried Potatoes", 36, "نصف حبة صغيرة", "Small serving", "fried", "RP-ST-114", 3),
    ("حب العزيز جاف", "Tiger Nuts (Chufa / Hab el-Aziz)", 25, "3 ملاعق كبيرة ونصف", "3.5 tbsp", "dried", "RP-ST-115", 3),

    # Page 3 & 4 - Sugars, Syrups & Sweets (15g CHO exchange)
    ("لبن مكثف محلى", "Sweetened Condensed Milk", 28, "ملعقة كبيرة ونصف", "1.5 tbsp", "cooked", "RP-ST-116", 3),
    ("صلصة هويسين صينية", "Hoisin Sauce", 34, "ملعقتان كبيرتان", "2 tbsp", "cooked", "RP-ST-117", 3),
    ("صلصة ترياكي", "Teriyaki Sauce", 96, "5 ملاعق كبيرة ونصف", "5.5 tbsp", "cooked", "RP-ST-118", 3),
    ("صلصة باربكيو", "Barbecue Sauce", 37, "ملعقتان كبيرتان", "2 tbsp", "cooked", "RP-ST-119", 3),
    ("دبس رمان طبيعي", "Pomegranate Molasses", 23, "3 ملاعق صغيرة ونصف", "3.5 tsp", "cooked", "RP-ST-120", 3),
    ("سكر أبيض مائد", "Granulated White Sugar", 15, "3 ملاعق صغيرة ونصف", "3.5 tsp", "raw", "RP-ST-121", 3),
    ("عسل نحل طبيعي", "Pure Bee Honey", 18, "ملعقتان صغيرتان ونصف", "2.5 tsp", "raw", "RP-ST-122", 3),
    ("شراب القيقب الطبيعي", "Pure Maple Syrup", 22, "3 ملاعق صغيرة ونصف", "3.5 tsp", "raw", "RP-ST-123", 3),
    ("شراب أغاف العضوي", "Agave Nectar", 20, "ملعقة كبيرة", "1 tbsp", "raw", "RP-ST-124", 3),
    ("عسل أسود مصري (دبس قصب السكر)", "Egyptian Black Honey (Sugarcane Molasses)", 20, "ملعقة كبيرة", "1 tbsp", "cooked", "RP-ST-125", 3),
    ("سكر جوز الهند", "Coconut Palm Sugar", 16, "4 ملاعق صغيرة", "4 tsp", "raw", "RP-ST-126", 3),
    ("سكر بني", "Brown Sugar", 15, "3 ملاعق صغيرة ونصف", "3.5 tsp", "raw", "RP-ST-127", 3),
    ("سكر بودرة ناعم", "Powdered / Confectioners Sugar", 15, "ملعقتان كبيرتان", "2 tbsp", "raw", "RP-ST-128", 3),
]

STARCH_ANALYTICAL_OVERRIDES = {
    "RP-ST-128": {"caloriesKcal": 389.0, "carbsG": 99.5, "proteinG": 0.0, "fatG": 0.0, "waterG": 0.5},
    "RP-ST-121": {"caloriesKcal": 387.0, "carbsG": 100.0, "proteinG": 0.0, "fatG": 0.0},
    "RP-ST-127": {"caloriesKcal": 380.0, "carbsG": 98.1, "proteinG": 0.1, "fatG": 0.0},
    "RP-ST-122": {"caloriesKcal": 304.0, "carbsG": 82.4, "proteinG": 0.3, "fatG": 0.0},
    "RP-ST-123": {"caloriesKcal": 260.0, "carbsG": 67.0, "proteinG": 0.0, "fatG": 0.1},
    "RP-ST-124": {"caloriesKcal": 310.0, "carbsG": 76.4, "proteinG": 0.1, "fatG": 0.5},
    "RP-ST-125": {"caloriesKcal": 290.0, "carbsG": 74.7, "proteinG": 0.0, "fatG": 0.1},
    "RP-ST-126": {"caloriesKcal": 375.0, "carbsG": 93.4, "proteinG": 1.1, "fatG": 0.4},
    "RP-ST-120": {"caloriesKcal": 260.0, "carbsG": 65.0, "proteinG": 0.0, "fatG": 0.0},
    "RP-ST-071": {"caloriesKcal": 381.0, "carbsG": 91.3, "proteinG": 0.3, "fatG": 0.1},
    "RP-ST-072": {"caloriesKcal": 358.0, "carbsG": 88.7, "proteinG": 0.2, "fatG": 0.0},
    "RP-ST-080": {"caloriesKcal": 358.0, "carbsG": 88.7, "proteinG": 0.2, "fatG": 0.0},
    "RP-ST-081": {"caloriesKcal": 357.0, "carbsG": 83.1, "proteinG": 6.9, "fatG": 0.3},
    "RP-ST-082": {"caloriesKcal": 357.0, "carbsG": 88.2, "proteinG": 0.3, "fatG": 0.1},
    "RP-ST-020": {"caloriesKcal": 370.0, "carbsG": 76.5, "proteinG": 11.2, "fatG": 1.8},
    "RP-ST-049": {"caloriesKcal": 357.0, "carbsG": 84.0, "proteinG": 7.5, "fatG": 0.4},
    "RP-ST-052": {"caloriesKcal": 387.0, "carbsG": 89.8, "proteinG": 6.3, "fatG": 0.5},
    "RP-ST-104": {"caloriesKcal": 387.0, "carbsG": 81.5, "proteinG": 8.2, "fatG": 2.8},
}

def make_starch_item(row):
    ar, en, w, hh_ar, hh_en, prep, code, page = row
    if code in STARCH_ANALYTICAL_OVERRIDES:
        override = STARCH_ANALYTICAL_OVERRIDES[code]
        kcal100 = override["caloriesKcal"]
        c100 = override["carbsG"]
        p100 = override["proteinG"]
        f100 = override["fatG"]
    else:
        is_fat = page == 3 and ("فطير" in ar or "كرواسون" in ar or "مقلية" in ar or "جرانولا" in ar or "بسكويت" in ar or "سكونز" in ar or "نودلز سريعة" in ar or "ميل فاي" in ar or "عجينة فطيرة" in ar or "حب العزيز" in ar)
        macros = {
            "caloriesKcal": 126 if is_fat else 81,
            "carbsG": 15,
            "proteinG": 3,
            "fatG": 6 if is_fat else 1
        }
        W = float(w)
        kcal100 = round((macros["caloriesKcal"] / W) * 100.0, 1)
        c100 = round((macros["carbsG"] / W) * 100.0, 1)
        p100 = round((macros["proteinG"] / W) * 100.0, 1)
        f100 = round((macros["fatG"] / W) * 100.0, 1)

    item_id = f"food_starch_rp_{code.lower().replace('-', '_')}"
    return {
        "id": item_id,
        "code": code,
        "sourceId": "regimeplan_2026",
        "nameEn": en,
        "nameAr": ar,
        "foodGroupId": "starches",
        "primaryExchangeCategoryId": "starch",
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
            "portionNameEn": f"1 Starch Exchange (~{w}g)",
            "portionNameAr": f"بديل نشويات واحد (~{w} جم)",
            "householdMeasureEn": hh_en,
            "householdMeasureAr": hh_ar,
            "gramWeight": W,
            "exchangeCategory": "starch",
            "exchangeEquivalentFactor": 1,
            "isDefaultServing": True
        }],
        "tags": ["starches", "grains", "carbohydrates", prep],
        "notesAr": f"قوائم البدائل الغذائية RegimePlan 2026 (ص {page}). وزن الحصة البديلة: {w} جم ({hh_ar}).",
        "notesEn": f"RegimePlan Food Exchange Lists (2026, p. {page}). Standard starch exchange portion: {w}g ({hh_en})."
    }

new_starches = [make_starch_item(r) for r in RAW_STARCHES]
all_starches = orig + new_starches

header = '''/**
 * Nutrition Clinic Pro - Food Catalog: Starches & Grains Module
 * Source: Egyptian NNI 2006, USDA FoodData Central & RegimePlan 2026
 */
import { FoodItemRecord } from '../types';

export const STARCH_FOOD_ITEMS: FoodItemRecord[] = '''

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(header + json.dumps(all_starches, ensure_ascii=False, indent=2) + ";\n")

print(f"Generated {len(all_starches)} starches in {OUT_PATH} (Original: {len(orig)}, New: {len(new_starches)})")
