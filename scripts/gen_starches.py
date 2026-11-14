# -*- coding: utf-8 -*-
import json
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.environ.get("NCP_CATALOG_OUT_DIR") or os.path.join(BASE_DIR, "src", "clinical", "food", "data")
os.makedirs(OUT_DIR, exist_ok=True)
OUT_PATH = os.path.join(OUT_DIR, "starches.ts")

with open(os.path.join(BASE_DIR, "scripts/original_30_grouped.json"), "r", encoding="utf-8") as f:
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

STARCH_USDA_SR_PROFILES = {
    "RP-ST-001": {"sourceRecordId": "18041", "nutrients": {"caloriesKcal": 275.0, "carbsG": 55.7, "proteinG": 9.1, "fatG": 1.2, "fiberG": 2.2, "saturatedFatG": 0.166, "monounsaturatedFatG": 0.105, "polyunsaturatedFatG": 0.535, "cholesterolMg": 0.0, "sodiumMg": 536.0, "potassiumMg": 120.0, "calciumMg": 86.0, "ironMg": 2.62, "waterG": 32.1}},
    "RP-ST-003": {"sourceRecordId": "18060", "nutrients": {"caloriesKcal": 259.0, "carbsG": 48.3, "proteinG": 8.5, "fatG": 3.3, "fiberG": 5.8, "saturatedFatG": 0.626, "monounsaturatedFatG": 1.31, "polyunsaturatedFatG": 0.799, "cholesterolMg": 0.0, "sodiumMg": 603.0, "potassiumMg": 166.0, "calciumMg": 73.0, "ironMg": 2.83, "waterG": 37.3}},
    "RP-ST-005": {"sourceRecordId": "18001", "nutrients": {"caloriesKcal": 264.0, "carbsG": 52.4, "proteinG": 10.6, "fatG": 1.32, "fiberG": 1.6, "saturatedFatG": 0.36, "transFatG": 0.021, "monounsaturatedFatG": 0.39, "polyunsaturatedFatG": 0.526, "cholesterolMg": 0.0, "sodiumMg": 422.0, "potassiumMg": 107.0, "calciumMg": 219.0, "ironMg": 3.57, "waterG": 33.8}},
    "RP-ST-006": {"sourceRecordId": "18437", "nutrients": {"caloriesKcal": 235.0, "carbsG": 46.0, "proteinG": 7.7, "fatG": 1.8, "fiberG": 2.7, "saturatedFatG": 0.259, "monounsaturatedFatG": 0.302, "polyunsaturatedFatG": 0.888, "cholesterolMg": 0.0, "sodiumMg": 464.0, "potassiumMg": 131.0, "calciumMg": 52.0, "ironMg": 2.5, "waterG": 42.1}},
    "RP-ST-009": {"sourceRecordId": "18042", "nutrients": {"caloriesKcal": 262.0, "carbsG": 55.9, "proteinG": 9.8, "fatG": 1.71, "fiberG": 6.1, "saturatedFatG": 0.208, "monounsaturatedFatG": 0.349, "polyunsaturatedFatG": 1.06, "cholesterolMg": 0.0, "sodiumMg": 421.0, "potassiumMg": 170.0, "calciumMg": 15.0, "ironMg": 3.06, "waterG": 30.6}},
    "RP-ST-010": {"sourceRecordId": "18075", "nutrients": {"caloriesKcal": 252.0, "carbsG": 42.7, "proteinG": 12.4, "fatG": 3.5, "fiberG": 6.0, "saturatedFatG": 0.722, "transFatG": 0.02, "monounsaturatedFatG": 0.62, "polyunsaturatedFatG": 1.59, "cholesterolMg": 0.0, "sodiumMg": 455.0, "potassiumMg": 254.0, "calciumMg": 161.0, "ironMg": 2.47, "waterG": 39.0}},
    "RP-ST-011": {"sourceRecordId": "18069", "nutrients": {"caloriesKcal": 266.0, "carbsG": 49.4, "proteinG": 8.85, "fatG": 3.33, "fiberG": 2.7, "saturatedFatG": 0.698, "transFatG": 0.027, "monounsaturatedFatG": 0.599, "polyunsaturatedFatG": 1.6, "cholesterolMg": 0.0, "sodiumMg": 490.0, "potassiumMg": 126.0, "calciumMg": 144.0, "ironMg": 3.61, "waterG": 36.4}},
    "RP-ST-016": {"sourceRecordId": "18079", "nutrients": {"caloriesKcal": 395.0, "carbsG": 72.0, "proteinG": 13.4, "fatG": 5.3, "fiberG": 4.5, "saturatedFatG": 1.2, "monounsaturatedFatG": 1.02, "polyunsaturatedFatG": 2.06, "cholesterolMg": 0.0, "sodiumMg": 732.0, "potassiumMg": 196.0, "calciumMg": 183.0, "ironMg": 4.83, "waterG": 6.51}},
    "RP-ST-021": {"sourceRecordId": "20013", "nutrients": {"caloriesKcal": 83.0, "carbsG": 18.6, "proteinG": 3.08, "fatG": 0.24, "fiberG": 4.5, "saturatedFatG": 0.042, "monounsaturatedFatG": 0.031, "polyunsaturatedFatG": 0.098, "cholesterolMg": 0.0, "sodiumMg": 5.0, "potassiumMg": 68.0, "calciumMg": 10.0, "ironMg": 0.96, "waterG": 77.8}},
    "RP-ST-024": {"sourceRecordId": "20037", "nutrients": {"caloriesKcal": 123.0, "carbsG": 25.6, "proteinG": 2.74, "fatG": 0.97, "fiberG": 1.6, "saturatedFatG": 0.26, "transFatG": 0.0, "monounsaturatedFatG": 0.369, "polyunsaturatedFatG": 0.366, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 86.0, "calciumMg": 3.0, "ironMg": 0.56, "waterG": 70.3}},
    "RP-ST-025": {"sourceRecordId": "20036", "nutrients": {"caloriesKcal": 367.0, "carbsG": 76.2, "proteinG": 7.54, "fatG": 3.2, "fiberG": 3.6, "saturatedFatG": 0.591, "transFatG": 0.001, "monounsaturatedFatG": 1.05, "polyunsaturatedFatG": 1.0, "cholesterolMg": 0.0, "sodiumMg": 5.0, "potassiumMg": 250.0, "calciumMg": 9.0, "ironMg": 1.29, "waterG": 11.8}},
    "RP-ST-026": {"sourceRecordId": "20121", "nutrients": {"caloriesKcal": 158.0, "carbsG": 30.9, "proteinG": 5.8, "fatG": 0.93, "fiberG": 1.8, "saturatedFatG": 0.176, "transFatG": 0.0, "monounsaturatedFatG": 0.131, "polyunsaturatedFatG": 0.326, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 44.0, "calciumMg": 7.0, "ironMg": 1.28, "waterG": 62.1}},
    "RP-ST-027": {"sourceRecordId": "20120", "nutrients": {"caloriesKcal": 371.0, "carbsG": 74.7, "proteinG": 13.0, "fatG": 1.51, "fiberG": 3.2, "saturatedFatG": 0.277, "transFatG": 0.0, "monounsaturatedFatG": 0.171, "polyunsaturatedFatG": 0.564, "cholesterolMg": 0.0, "sodiumMg": 6.0, "potassiumMg": 223.0, "calciumMg": 21.0, "ironMg": 3.3, "waterG": 9.9}},
    "RP-ST-028": {"sourceRecordId": "20125", "nutrients": {"caloriesKcal": 149.0, "carbsG": 30.1, "proteinG": 5.99, "fatG": 1.71, "fiberG": 3.9, "saturatedFatG": 0.243, "transFatG": 0.0, "monounsaturatedFatG": 0.176, "polyunsaturatedFatG": 0.574, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 96.0, "calciumMg": 13.0, "ironMg": 1.72, "waterG": 61.8}},
    "RP-ST-029": {"sourceRecordId": "20124", "nutrients": {"caloriesKcal": 352.0, "carbsG": 73.4, "proteinG": 13.9, "fatG": 2.93, "fiberG": 9.2, "saturatedFatG": 0.428, "transFatG": 0.002, "monounsaturatedFatG": 0.361, "polyunsaturatedFatG": 1.14, "cholesterolMg": 0.0, "sodiumMg": 6.0, "potassiumMg": 434.0, "calciumMg": 29.0, "ironMg": 3.62, "waterG": 8.21}},
    "RP-ST-030": {"sourceRecordId": "08120", "nutrients": {"caloriesKcal": 379.0, "carbsG": 67.7, "proteinG": 13.2, "fatG": 6.52, "fiberG": 10.1, "saturatedFatG": 1.11, "monounsaturatedFatG": 1.98, "polyunsaturatedFatG": 2.3, "cholesterolMg": 0.0, "sodiumMg": 6.0, "potassiumMg": 362.0, "calciumMg": 52.0, "ironMg": 4.25, "waterG": 10.8}},
    "RP-ST-031": {"sourceRecordId": "20137", "nutrients": {"caloriesKcal": 120.0, "carbsG": 21.3, "proteinG": 4.4, "fatG": 1.92, "fiberG": 2.8, "saturatedFatG": 0.231, "monounsaturatedFatG": 0.528, "polyunsaturatedFatG": 1.08, "cholesterolMg": 0.0, "sodiumMg": 7.0, "potassiumMg": 172.0, "calciumMg": 17.0, "ironMg": 1.49, "waterG": 71.6}},
    "RP-ST-032": {"sourceRecordId": "20035", "nutrients": {"caloriesKcal": 368.0, "carbsG": 64.2, "proteinG": 14.1, "fatG": 6.07, "fiberG": 7.0, "saturatedFatG": 0.706, "monounsaturatedFatG": 1.61, "polyunsaturatedFatG": 3.29, "cholesterolMg": 0.0, "sodiumMg": 5.0, "potassiumMg": 563.0, "calciumMg": 47.0, "ironMg": 4.57, "waterG": 13.3}},
    "RP-ST-033": {"sourceRecordId": "20029", "nutrients": {"caloriesKcal": 112.0, "carbsG": 23.2, "proteinG": 3.79, "fatG": 0.16, "fiberG": 1.4, "saturatedFatG": 0.029, "monounsaturatedFatG": 0.022, "polyunsaturatedFatG": 0.064, "cholesterolMg": 0.0, "sodiumMg": 5.0, "potassiumMg": 58.0, "calciumMg": 8.0, "ironMg": 0.38, "waterG": 72.6}},
    "RP-ST-034": {"sourceRecordId": "20028", "nutrients": {"caloriesKcal": 376.0, "carbsG": 77.4, "proteinG": 12.8, "fatG": 0.64, "fiberG": 5.0, "saturatedFatG": 0.117, "monounsaturatedFatG": 0.089, "polyunsaturatedFatG": 0.252, "cholesterolMg": 0.0, "sodiumMg": 10.0, "potassiumMg": 166.0, "calciumMg": 24.0, "ironMg": 1.08, "waterG": 8.56}},
    "RP-ST-035": {"sourceRecordId": "20006", "nutrients": {"caloriesKcal": 123.0, "carbsG": 28.2, "proteinG": 2.26, "fatG": 0.44, "fiberG": 3.8, "saturatedFatG": 0.093, "monounsaturatedFatG": 0.057, "polyunsaturatedFatG": 0.214, "cholesterolMg": 0.0, "sodiumMg": 3.0, "potassiumMg": 93.0, "calciumMg": 11.0, "ironMg": 1.33, "waterG": 68.8}},
    "RP-ST-036": {"sourceRecordId": "20012", "nutrients": {"caloriesKcal": 342.0, "carbsG": 75.9, "proteinG": 12.3, "fatG": 1.33, "fiberG": 12.5, "saturatedFatG": 0.232, "monounsaturatedFatG": 0.173, "polyunsaturatedFatG": 0.541, "cholesterolMg": 0.0, "sodiumMg": 17.0, "potassiumMg": 410.0, "calciumMg": 35.0, "ironMg": 2.46, "waterG": 9.0}},
    "RP-ST-039": {"sourceRecordId": "20008", "nutrients": {"caloriesKcal": 343.0, "carbsG": 71.5, "proteinG": 13.2, "fatG": 3.4, "fiberG": 10.0, "saturatedFatG": 0.741, "monounsaturatedFatG": 1.04, "polyunsaturatedFatG": 1.04, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 460.0, "calciumMg": 18.0, "ironMg": 2.2, "waterG": 9.75}},
    "RP-ST-040": {"sourceRecordId": "20010", "nutrients": {"caloriesKcal": 92.0, "carbsG": 19.9, "proteinG": 3.38, "fatG": 0.62, "fiberG": 2.7, "saturatedFatG": 0.134, "monounsaturatedFatG": 0.188, "polyunsaturatedFatG": 0.188, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 88.0, "calciumMg": 7.0, "ironMg": 0.8, "waterG": 75.6}},
    "RP-ST-041": {"sourceRecordId": "20001", "nutrients": {"caloriesKcal": 371.0, "carbsG": 65.2, "proteinG": 13.6, "fatG": 7.02, "fiberG": 6.7, "saturatedFatG": 1.46, "monounsaturatedFatG": 1.68, "polyunsaturatedFatG": 2.78, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 508.0, "calciumMg": 159.0, "ironMg": 7.61, "waterG": 11.3}},
    "RP-ST-042": {"sourceRecordId": "20002", "nutrients": {"caloriesKcal": 102.0, "carbsG": 18.7, "proteinG": 3.8, "fatG": 1.58, "fiberG": 2.1, "sodiumMg": 6.0, "potassiumMg": 135.0, "calciumMg": 47.0, "ironMg": 2.1, "waterG": 75.2}},
    "RP-ST-043": {"sourceRecordId": "20031", "nutrients": {"caloriesKcal": 378.0, "carbsG": 72.8, "proteinG": 11.0, "fatG": 4.22, "fiberG": 8.5, "saturatedFatG": 0.723, "monounsaturatedFatG": 0.773, "polyunsaturatedFatG": 2.13, "cholesterolMg": 0.0, "sodiumMg": 5.0, "potassiumMg": 195.0, "calciumMg": 8.0, "ironMg": 3.01, "waterG": 8.67}},
    "RP-ST-044": {"sourceRecordId": "20032", "nutrients": {"caloriesKcal": 119.0, "carbsG": 23.7, "proteinG": 3.51, "fatG": 1.0, "fiberG": 1.3, "saturatedFatG": 0.172, "monounsaturatedFatG": 0.184, "polyunsaturatedFatG": 0.508, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 62.0, "calciumMg": 3.0, "ironMg": 0.63, "waterG": 71.4}},
    "RP-ST-045": {"sourceRecordId": "20142", "nutrients": {"caloriesKcal": 367.0, "carbsG": 73.1, "proteinG": 13.3, "fatG": 2.38, "fiberG": 8.0, "saturatedFatG": 0.449, "monounsaturatedFatG": 0.589, "polyunsaturatedFatG": 1.07, "sodiumMg": 12.0, "potassiumMg": 427.0, "calciumMg": 180.0, "ironMg": 7.63, "waterG": 8.82}},
    "RP-ST-046": {"sourceRecordId": "20140", "nutrients": {"caloriesKcal": 338.0, "carbsG": 70.2, "proteinG": 14.6, "fatG": 2.43, "fiberG": 10.7, "saturatedFatG": 0.406, "monounsaturatedFatG": 0.445, "polyunsaturatedFatG": 1.26, "cholesterolMg": 0.0, "sodiumMg": 8.0, "potassiumMg": 388.0, "calciumMg": 27.0, "ironMg": 4.44, "waterG": 11.0}},
    "RP-ST-047": {"sourceRecordId": "20067", "nutrients": {"caloriesKcal": 329.0, "carbsG": 72.1, "proteinG": 10.6, "fatG": 3.46, "fiberG": 6.7, "saturatedFatG": 0.61, "transFatG": 0.005, "monounsaturatedFatG": 1.13, "polyunsaturatedFatG": 1.56, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 363.0, "calciumMg": 13.0, "ironMg": 3.36, "waterG": 12.4}},
    "RP-ST-048": {"sourceRecordId": "20089", "nutrients": {"caloriesKcal": 101.0, "carbsG": 21.3, "proteinG": 3.99, "fatG": 0.34, "fiberG": 1.8, "saturatedFatG": 0.049, "monounsaturatedFatG": 0.05, "polyunsaturatedFatG": 0.213, "cholesterolMg": 0.0, "sodiumMg": 3.0, "potassiumMg": 101.0, "calciumMg": 3.0, "ironMg": 0.6, "waterG": 73.9}},
    "RP-ST-052": {"sourceRecordId": "08156", "nutrients": {"caloriesKcal": 402.0, "carbsG": 89.8, "proteinG": 6.3, "fatG": 0.5, "fiberG": 1.7, "saturatedFatG": 0.13, "cholesterolMg": 0.0, "sodiumMg": 3.0, "potassiumMg": 113.0, "calciumMg": 6.0, "ironMg": 31.7, "waterG": 3.0}},
    "RP-ST-055": {"sourceRecordId": "20310", "nutrients": {"caloriesKcal": 138.0, "carbsG": 25.2, "proteinG": 4.54, "fatG": 2.07, "fiberG": 1.2, "saturatedFatG": 0.419, "transFatG": 0.029, "monounsaturatedFatG": 0.581, "polyunsaturatedFatG": 0.552, "cholesterolMg": 29.0, "sodiumMg": 165.0, "potassiumMg": 38.0, "calciumMg": 12.0, "ironMg": 1.47, "waterG": 67.7}},
    "RP-ST-057": {"sourceRecordId": "20115", "nutrients": {"caloriesKcal": 99.0, "carbsG": 21.4, "proteinG": 5.06, "fatG": 0.1, "saturatedFatG": 0.019, "monounsaturatedFatG": 0.026, "polyunsaturatedFatG": 0.031, "cholesterolMg": 0.0, "sodiumMg": 60.0, "potassiumMg": 35.0, "calciumMg": 4.0, "ironMg": 0.48, "waterG": 73.0}},
    "RP-ST-063": {"sourceRecordId": "20005", "nutrients": {"caloriesKcal": 352.0, "carbsG": 77.7, "proteinG": 9.91, "fatG": 1.16, "fiberG": 15.6, "saturatedFatG": 0.244, "monounsaturatedFatG": 0.149, "polyunsaturatedFatG": 0.56, "cholesterolMg": 0.0, "sodiumMg": 9.0, "potassiumMg": 280.0, "calciumMg": 29.0, "ironMg": 2.5, "waterG": 10.1}},
    "RP-ST-065": {"sourceRecordId": "20077", "nutrients": {"caloriesKcal": 216.0, "carbsG": 64.5, "proteinG": 15.6, "fatG": 4.25, "fiberG": 42.8, "saturatedFatG": 0.63, "monounsaturatedFatG": 0.637, "polyunsaturatedFatG": 2.21, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 1180.0, "calciumMg": 73.0, "ironMg": 10.6, "waterG": 9.89}},
    "RP-ST-066": {"sourceRecordId": "20033", "nutrients": {"caloriesKcal": 246.0, "carbsG": 66.2, "proteinG": 17.3, "fatG": 7.03, "fiberG": 15.4, "saturatedFatG": 1.33, "monounsaturatedFatG": 2.38, "polyunsaturatedFatG": 2.77, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 566.0, "calciumMg": 58.0, "ironMg": 5.41, "waterG": 6.55}},
    "RP-ST-068": {"sourceRecordId": "20016", "nutrients": {"caloriesKcal": 361.0, "carbsG": 76.8, "proteinG": 6.93, "fatG": 3.86, "fiberG": 7.3, "saturatedFatG": 0.543, "monounsaturatedFatG": 1.02, "polyunsaturatedFatG": 1.76, "cholesterolMg": 0.0, "sodiumMg": 5.0, "potassiumMg": 315.0, "calciumMg": 7.0, "ironMg": 2.38, "waterG": 10.9}},
    "RP-ST-069": {"sourceRecordId": "20481", "nutrients": {"caloriesKcal": 364.0, "carbsG": 76.3, "proteinG": 10.3, "fatG": 0.98, "fiberG": 2.7, "saturatedFatG": 0.155, "monounsaturatedFatG": 0.087, "polyunsaturatedFatG": 0.413, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 107.0, "calciumMg": 15.0, "ironMg": 1.17, "waterG": 11.9}},
    "RP-ST-070": {"sourceRecordId": "20080", "nutrients": {"caloriesKcal": 340.0, "carbsG": 72.0, "proteinG": 13.2, "fatG": 2.5, "fiberG": 10.7, "saturatedFatG": 0.43, "monounsaturatedFatG": 0.283, "polyunsaturatedFatG": 1.17, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 363.0, "calciumMg": 34.0, "ironMg": 3.6, "waterG": 10.7}},
    "RP-ST-072": {"sourceRecordId": "20068", "nutrients": {"caloriesKcal": 358.0, "carbsG": 88.7, "proteinG": 0.19, "fatG": 0.02, "fiberG": 0.9, "saturatedFatG": 0.005, "monounsaturatedFatG": 0.005, "polyunsaturatedFatG": 0.003, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 11.0, "calciumMg": 20.0, "ironMg": 1.58, "waterG": 11.0}},
    "RP-ST-073": {"sourceRecordId": "20132", "nutrients": {"caloriesKcal": 404.0, "carbsG": 65.7, "proteinG": 14.7, "fatG": 9.12, "fiberG": 6.5, "saturatedFatG": 1.61, "monounsaturatedFatG": 2.87, "polyunsaturatedFatG": 3.33, "cholesterolMg": 0.0, "sodiumMg": 19.0, "potassiumMg": 371.0, "calciumMg": 55.0, "ironMg": 4.0, "waterG": 8.55}},
    "RP-ST-074": {"sourceRecordId": "20061", "nutrients": {"caloriesKcal": 366.0, "carbsG": 80.1, "proteinG": 5.95, "fatG": 1.42, "fiberG": 2.4, "saturatedFatG": 0.386, "monounsaturatedFatG": 0.442, "polyunsaturatedFatG": 0.379, "cholesterolMg": 0.0, "sodiumMg": 0.0, "potassiumMg": 76.0, "calciumMg": 10.0, "ironMg": 0.35, "waterG": 11.9}},
    "RP-ST-075": {"sourceRecordId": "20066", "nutrients": {"caloriesKcal": 360.0, "carbsG": 72.8, "proteinG": 12.7, "fatG": 1.05, "fiberG": 3.9, "saturatedFatG": 0.15, "monounsaturatedFatG": 0.124, "polyunsaturatedFatG": 0.43, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 186.0, "calciumMg": 17.0, "ironMg": 4.36, "waterG": 12.7}},
    "RP-ST-076": {"sourceRecordId": "20083", "nutrients": {"caloriesKcal": 361.0, "carbsG": 72.5, "proteinG": 12.0, "fatG": 1.66, "fiberG": 2.4, "saturatedFatG": 0.244, "monounsaturatedFatG": 0.14, "polyunsaturatedFatG": 0.727, "cholesterolMg": 0.0, "sodiumMg": 2.0, "potassiumMg": 100.0, "calciumMg": 15.0, "ironMg": 4.41, "waterG": 13.4}},
    "RP-ST-077": {"sourceRecordId": "20082", "nutrients": {"caloriesKcal": 354.0, "carbsG": 74.2, "proteinG": 9.89, "fatG": 0.97, "fiberG": 2.7, "saturatedFatG": 0.154, "monounsaturatedFatG": 0.086, "polyunsaturatedFatG": 0.41, "cholesterolMg": 0.0, "sodiumMg": 1190.0, "potassiumMg": 124.0, "calciumMg": 338.0, "ironMg": 4.67, "waterG": 10.6}},
    "RP-ST-079": {"sourceRecordId": "20011", "nutrients": {"caloriesKcal": 335.0, "carbsG": 70.6, "proteinG": 12.6, "fatG": 3.1, "fiberG": 10.0, "saturatedFatG": 0.677, "monounsaturatedFatG": 0.949, "polyunsaturatedFatG": 0.949, "cholesterolMg": 0.0, "sodiumMg": 11.0, "potassiumMg": 577.0, "calciumMg": 41.0, "ironMg": 4.06, "waterG": 11.2}},
    "RP-ST-083": {"sourceRecordId": "11168", "nutrients": {"caloriesKcal": 96.0, "carbsG": 21.0, "proteinG": 3.41, "fatG": 1.5, "fiberG": 2.4, "saturatedFatG": 0.197, "transFatG": 0.0, "monounsaturatedFatG": 0.374, "polyunsaturatedFatG": 0.603, "cholesterolMg": 0.0, "sodiumMg": 1.0, "potassiumMg": 218.0, "calciumMg": 3.0, "ironMg": 0.45, "waterG": 73.4}},
    "RP-ST-084": {"sourceRecordId": "11507", "nutrients": {"caloriesKcal": 86.0, "carbsG": 20.1, "proteinG": 1.57, "fatG": 0.05, "fiberG": 3.0, "saturatedFatG": 0.018, "transFatG": 0.0, "monounsaturatedFatG": 0.001, "polyunsaturatedFatG": 0.014, "cholesterolMg": 0.0, "sodiumMg": 55.0, "potassiumMg": 337.0, "calciumMg": 30.0, "ironMg": 0.61, "waterG": 77.3}},
    "RP-ST-085": {"sourceRecordId": "11510", "nutrients": {"caloriesKcal": 76.0, "carbsG": 17.7, "proteinG": 1.37, "fatG": 0.14, "fiberG": 2.5, "saturatedFatG": 0.031, "transFatG": 0.0, "monounsaturatedFatG": 0.0, "polyunsaturatedFatG": 0.061, "cholesterolMg": 0.0, "sodiumMg": 27.0, "potassiumMg": 230.0, "calciumMg": 27.0, "ironMg": 0.72, "waterG": 80.1}},
    "RP-ST-086": {"sourceRecordId": "11354", "nutrients": {"caloriesKcal": 69.0, "carbsG": 15.7, "proteinG": 1.68, "fatG": 0.1, "fiberG": 2.4, "saturatedFatG": 0.026, "transFatG": 0.0, "monounsaturatedFatG": 0.002, "polyunsaturatedFatG": 0.043, "cholesterolMg": 0.0, "sodiumMg": 16.0, "potassiumMg": 407.0, "calciumMg": 9.0, "ironMg": 0.52, "waterG": 81.6}},
    "RP-ST-087": {"sourceRecordId": "11367", "nutrients": {"caloriesKcal": 86.0, "carbsG": 20.0, "proteinG": 1.71, "fatG": 0.1, "fiberG": 1.8, "saturatedFatG": 0.026, "transFatG": 0.0, "monounsaturatedFatG": 0.002, "polyunsaturatedFatG": 0.043, "cholesterolMg": 0.0, "sodiumMg": 5.0, "potassiumMg": 328.0, "calciumMg": 8.0, "ironMg": 0.31, "waterG": 77.5}},
    "RP-ST-088": {"sourceRecordId": "11674", "nutrients": {"caloriesKcal": 93.0, "carbsG": 21.2, "proteinG": 2.5, "fatG": 0.13, "fiberG": 2.2, "saturatedFatG": 0.034, "transFatG": 0.0, "monounsaturatedFatG": 0.003, "polyunsaturatedFatG": 0.057, "cholesterolMg": 0.0, "sodiumMg": 10.0, "potassiumMg": 535.0, "calciumMg": 15.0, "ironMg": 1.08, "waterG": 74.9}},
    "RP-ST-089": {"sourceRecordId": "11305", "nutrients": {"caloriesKcal": 84.0, "carbsG": 15.6, "proteinG": 5.36, "fatG": 0.22, "fiberG": 5.5, "saturatedFatG": 0.039, "transFatG": 0.0, "monounsaturatedFatG": 0.019, "polyunsaturatedFatG": 0.102, "cholesterolMg": 0.0, "sodiumMg": 3.0, "potassiumMg": 271.0, "calciumMg": 27.0, "ironMg": 1.54, "waterG": 77.9}},
    "RP-ST-092": {"sourceRecordId": "11485", "nutrients": {"caloriesKcal": 45.0, "carbsG": 11.7, "proteinG": 1.0, "fatG": 0.1, "fiberG": 2.0, "saturatedFatG": 0.021, "transFatG": 0.0, "monounsaturatedFatG": 0.007, "polyunsaturatedFatG": 0.042, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 352.0, "calciumMg": 48.0, "ironMg": 0.7, "waterG": 86.4}},
    "RP-ST-093": {"sourceRecordId": "11486", "nutrients": {"caloriesKcal": 40.0, "carbsG": 10.5, "proteinG": 0.9, "fatG": 0.09, "fiberG": 3.2, "saturatedFatG": 0.019, "transFatG": 0.0, "monounsaturatedFatG": 0.007, "polyunsaturatedFatG": 0.038, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 284.0, "calciumMg": 41.0, "ironMg": 0.6, "waterG": 87.8}},
    "RP-ST-094": {"sourceRecordId": "11518", "nutrients": {"caloriesKcal": 112.0, "carbsG": 26.5, "proteinG": 1.5, "fatG": 0.2, "fiberG": 4.1, "saturatedFatG": 0.041, "transFatG": 0.0, "monounsaturatedFatG": 0.016, "polyunsaturatedFatG": 0.083, "cholesterolMg": 0.0, "sodiumMg": 11.0, "potassiumMg": 591.0, "calciumMg": 43.0, "ironMg": 0.55, "waterG": 70.6}},
    "RP-ST-095": {"sourceRecordId": "11519", "nutrients": {"caloriesKcal": 142.0, "carbsG": 34.6, "proteinG": 0.52, "fatG": 0.11, "fiberG": 5.1, "saturatedFatG": 0.023, "transFatG": 0.0, "monounsaturatedFatG": 0.009, "polyunsaturatedFatG": 0.046, "cholesterolMg": 0.0, "sodiumMg": 15.0, "potassiumMg": 484.0, "calciumMg": 18.0, "ironMg": 0.72, "waterG": 63.8}},
    "RP-ST-098": {"sourceRecordId": "11172", "nutrients": {"caloriesKcal": 67.0, "carbsG": 14.3, "proteinG": 2.29, "fatG": 1.22, "fiberG": 2.0, "saturatedFatG": 0.245, "transFatG": 0.0, "monounsaturatedFatG": 0.374, "polyunsaturatedFatG": 0.519, "cholesterolMg": 0.0, "sodiumMg": 205.0, "potassiumMg": 132.0, "calciumMg": 3.0, "ironMg": 0.27, "waterG": 81.4}},
    "RP-ST-099": {"sourceRecordId": "11304", "nutrients": {"caloriesKcal": 81.0, "carbsG": 14.4, "proteinG": 5.42, "fatG": 0.4, "fiberG": 5.7, "saturatedFatG": 0.071, "transFatG": 0.0, "monounsaturatedFatG": 0.035, "polyunsaturatedFatG": 0.187, "cholesterolMg": 0.0, "sodiumMg": 5.0, "potassiumMg": 244.0, "calciumMg": 25.0, "ironMg": 1.47, "waterG": 78.9}},
    "RP-ST-100": {"sourceRecordId": "11323", "nutrients": {"caloriesKcal": 48.0, "carbsG": 10.1, "proteinG": 3.09, "fatG": 0.42, "fiberG": 3.1, "saturatedFatG": 0.077, "transFatG": 0.0, "monounsaturatedFatG": 0.035, "polyunsaturatedFatG": 0.201, "cholesterolMg": 0.0, "sodiumMg": 68.0, "potassiumMg": 158.0, "calciumMg": 23.0, "ironMg": 0.94, "waterG": 85.8}},
    "RP-ST-101": {"sourceRecordId": "11584", "nutrients": {"caloriesKcal": 65.0, "carbsG": 13.1, "proteinG": 2.86, "fatG": 0.15, "fiberG": 4.4, "saturatedFatG": 0.031, "transFatG": 0.0, "monounsaturatedFatG": 0.01, "polyunsaturatedFatG": 0.072, "cholesterolMg": 0.0, "sodiumMg": 35.0, "potassiumMg": 169.0, "calciumMg": 25.0, "ironMg": 0.82, "waterG": 83.2}},
    "RP-ST-102": {"sourceRecordId": "09277", "nutrients": {"caloriesKcal": 122.0, "carbsG": 31.9, "proteinG": 1.3, "fatG": 0.35, "fiberG": 1.7, "saturatedFatG": 0.0, "transFatG": 0.0, "monounsaturatedFatG": 0.0, "polyunsaturatedFatG": 0.0, "cholesterolMg": 0.0, "sodiumMg": 4.0, "potassiumMg": 487.0, "calciumMg": 3.0, "ironMg": 0.55, "waterG": 65.2}},
    "RP-ST-103": {"sourceRecordId": "11546", "nutrients": {"caloriesKcal": 82.0, "carbsG": 18.9, "proteinG": 4.32, "fatG": 0.47, "fiberG": 4.1, "saturatedFatG": 0.1, "transFatG": 0.0, "monounsaturatedFatG": 0.067, "polyunsaturatedFatG": 0.16, "cholesterolMg": 0.0, "sodiumMg": 59.0, "potassiumMg": 1010.0, "calciumMg": 36.0, "ironMg": 2.98, "waterG": 73.5}},
    "RP-ST-105": {"sourceRecordId": "19034", "nutrients": {"caloriesKcal": 387.0, "carbsG": 77.8, "proteinG": 12.9, "fatG": 4.54, "fiberG": 14.5, "saturatedFatG": 0.637, "monounsaturatedFatG": 0.95, "polyunsaturatedFatG": 2.32, "cholesterolMg": 0.0, "sodiumMg": 8.0, "potassiumMg": 329.0, "calciumMg": 7.0, "ironMg": 3.19, "waterG": 3.32}},
    "RP-ST-106": {"sourceRecordId": "18228", "nutrients": {"caloriesKcal": 418.0, "carbsG": 74.0, "proteinG": 9.46, "fatG": 8.64, "fiberG": 2.8, "saturatedFatG": 1.65, "transFatG": 0.167, "monounsaturatedFatG": 1.99, "polyunsaturatedFatG": 4.84, "cholesterolMg": 0.0, "sodiumMg": 941.0, "potassiumMg": 152.0, "calciumMg": 19.0, "ironMg": 5.57, "waterG": 5.05}},
    "RP-ST-116": {"sourceRecordId": "01095", "nutrients": {"caloriesKcal": 321.0, "carbsG": 54.4, "proteinG": 7.91, "fatG": 8.7, "fiberG": 0.0, "saturatedFatG": 5.49, "monounsaturatedFatG": 2.43, "polyunsaturatedFatG": 0.337, "cholesterolMg": 34.0, "sodiumMg": 127.0, "potassiumMg": 371.0, "calciumMg": 284.0, "ironMg": 0.19, "waterG": 27.2}},
    "RP-ST-118": {"sourceRecordId": "06112", "nutrients": {"caloriesKcal": 89.0, "carbsG": 15.6, "proteinG": 5.93, "fatG": 0.02, "fiberG": 0.1, "saturatedFatG": 0.0, "transFatG": 0.0, "monounsaturatedFatG": 0.0, "polyunsaturatedFatG": 0.0, "cholesterolMg": 0.0, "sodiumMg": 3830.0, "potassiumMg": 225.0, "calciumMg": 25.0, "ironMg": 1.7, "waterG": 67.7}},
    "RP-ST-119": {"sourceRecordId": "06150", "nutrients": {"caloriesKcal": 172.0, "carbsG": 40.8, "proteinG": 0.82, "fatG": 0.63, "fiberG": 0.9, "saturatedFatG": 0.045, "transFatG": 0.0, "monounsaturatedFatG": 0.082, "polyunsaturatedFatG": 0.101, "cholesterolMg": 0.0, "sodiumMg": 1030.0, "potassiumMg": 232.0, "calciumMg": 33.0, "ironMg": 0.64, "waterG": 54.7}},
}

STARCH_ANALYTICAL_OVERRIDES = {
    "RP-ST-128": {"caloriesKcal": 389.0, "carbsG": 99.5, "proteinG": 0.0, "fatG": 0.0, "waterG": 0.5, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-121": {"caloriesKcal": 387.0, "carbsG": 100.0, "proteinG": 0.0, "fatG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-127": {"caloriesKcal": 380.0, "carbsG": 98.1, "proteinG": 0.1, "fatG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-122": {"caloriesKcal": 304.0, "carbsG": 82.4, "proteinG": 0.3, "fatG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-123": {"caloriesKcal": 260.0, "carbsG": 67.0, "proteinG": 0.0, "fatG": 0.1, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-124": {"caloriesKcal": 310.0, "carbsG": 76.4, "proteinG": 0.1, "fatG": 0.5, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-125": {"caloriesKcal": 290.0, "carbsG": 74.7, "proteinG": 0.0, "fatG": 0.1, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-126": {"caloriesKcal": 375.0, "carbsG": 93.4, "proteinG": 1.1, "fatG": 0.4, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-120": {"caloriesKcal": 260.0, "carbsG": 65.0, "proteinG": 0.0, "fatG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-071": {"caloriesKcal": 381.0, "carbsG": 91.3, "proteinG": 0.3, "fatG": 0.1, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-080": {"caloriesKcal": 358.0, "carbsG": 88.7, "proteinG": 0.2, "fatG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-081": {"caloriesKcal": 357.0, "carbsG": 83.1, "proteinG": 6.9, "fatG": 0.3, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-082": {"caloriesKcal": 357.0, "carbsG": 88.2, "proteinG": 0.3, "fatG": 0.1, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-020": {"caloriesKcal": 370.0, "carbsG": 76.5, "proteinG": 11.2, "fatG": 1.8, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-049": {"caloriesKcal": 357.0, "carbsG": 84.0, "proteinG": 7.5, "fatG": 0.4, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    "RP-ST-104": {"caloriesKcal": 387.0, "carbsG": 81.5, "proteinG": 8.2, "fatG": 2.8, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed"},
    # Non-starch / high-fat / severe distortion analytical overrides
    "RP-ST-090": {
        "caloriesKcal": 26.0, "carbsG": 6.5, "proteinG": 1.0, "fatG": 0.1,
        "fiberG": 0.5, "waterG": 91.6,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
    "RP-ST-091": {
        "caloriesKcal": 20.0, "carbsG": 4.9, "proteinG": 0.7, "fatG": 0.1,
        "fiberG": 1.1, "waterG": 93.7,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
    "RP-ST-109": {
        "caloriesKcal": 406.0, "carbsG": 45.8, "proteinG": 8.2, "fatG": 21.0,
        "fiberG": 2.6,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
    "RP-ST-110": {
        "caloriesKcal": 390.0, "carbsG": 42.0, "proteinG": 6.5, "fatG": 22.0,
        "sourceId": "clinic_reviewed", "verificationStatus": "recipe_based",
    },
    "RP-ST-114": {
        "caloriesKcal": 312.0, "carbsG": 41.4, "proteinG": 3.4, "fatG": 14.7,
        "fiberG": 3.8,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
    "RP-ST-115": {
        "caloriesKcal": 409.0, "carbsG": 63.0, "proteinG": 4.5, "fatG": 24.0,
        "fiberG": 10.0,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
    "RP-ST-117": {
        "caloriesKcal": 220.0, "carbsG": 44.1, "proteinG": 3.2, "fatG": 3.4,
        "fiberG": 2.7,
        "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed",
    },
}

CORE_KEYS = [
    "caloriesKcal", "carbsG", "proteinG", "fatG",
    "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG",
    "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg",
    "calciumMg", "ironMg", "waterG"
]


def make_starch_item(row):
    ar, en, w, hh_ar, hh_en, prep, code, page = row
    W = float(w)
    usda_prof = STARCH_USDA_SR_PROFILES.get(code)
    override = STARCH_ANALYTICAL_OVERRIDES.get(code)

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
        notes_ar = (
            f"التركيبة التحليلية لكل 100 جم من USDA SR Legacy (NDB {src_rec_id}). "
            f"وزن بديل النشويات من RegimePlan 2026 (ص {page}): {w} جم ({hh_ar})."
        )
        notes_en = (
            f"Analytical 100g composition from USDA SR Legacy (NDB {src_rec_id}). "
            f"RegimePlan Food Exchange Lists (2026, p. {page}) starch exchange portion: {w}g ({hh_en})."
        )
    elif comp_basis == "exchange_only":
        notes_ar = (
            f"سجل بديل غذائي فقط من RegimePlan 2026 (ص {page}). "
            f"وزن الحصة البديلة: {w} جم ({hh_ar}). التركيبة التحليلية لكل 100 جم غير محللة."
        )
        notes_en = (
            f"Exchange-only food item from RegimePlan Food Exchange Lists (2026, p. {page}). "
            f"Standard starch exchange portion: {w}g ({hh_en}). Analytical 100g composition is unassayed."
        )
    else:
        notes_ar = f"تركيبة مراجعة سريرياً لكل 100 جم. وزن الحصة البديلة وفق RegimePlan 2026 (ص {page}): {w} جم ({hh_ar})."
        notes_en = f"Clinically reviewed 100g composition. RegimePlan Food Exchange Lists (2026, p. {page}) starch exchange portion: {w}g ({hh_en})."

    item_id = f"food_starch_rp_{code.lower().replace('-', '_')}"
    record = {
        "id": item_id,
        "code": code,
        "sourceId": src_id,
        "nameEn": en,
        "nameAr": ar,
        "foodGroupId": "starches",
        "primaryExchangeCategoryId": "starch",
        "preparationState": prep,
        "verificationStatus": ver_status,
        "compositionBasis": comp_basis,
        "isCustom": False,
        "nutrients100g": nutrients,
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
        "notesAr": notes_ar,
        "notesEn": notes_en
    }
    if src_rec_id is not None:
        record["sourceRecordId"] = str(src_rec_id)
    return record

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
