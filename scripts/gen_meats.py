# -*- coding: utf-8 -*-
import zlib
import re
import json
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_PATH = os.path.join(BASE_DIR, "src/clinical/food/data/meats.ts")

with open(os.path.join(BASE_DIR, "scripts/original_30_grouped.json"), "r", encoding="utf-8") as f:
    orig = json.load(f)["meats"]

with open(os.path.join(BASE_DIR, "public/assets/aistudio/regimeplan-food-exchange-list-ar-2026-10-10_1630b277.pdf"), "rb") as f:
    content = f.read()

streams = re.findall(b"stream[\r\n]+(.*?)[\r\n]+endstream", content, re.DOTALL)

def parse_cmap(cmap_str):
    mapping = {}
    for block in re.findall(r"(\d+)\s+beginbfchar(.*?)endbfchar", cmap_str, re.DOTALL):
        for line in block[1].strip().split("\n"):
            line = line.strip()
            m = re.match(r"<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>", line)
            if m:
                try:
                    mapping[m.group(1).upper()] = bytes.fromhex(m.group(2)).decode("utf-16-be")
                except:
                    pass
    for block in re.findall(r"(\d+)\s+beginbfrange(.*?)endbfrange", cmap_str, re.DOTALL):
        for m in re.finditer(r"<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>", block[1]):
            start = int(m.group(1), 16)
            end = int(m.group(2), 16)
            target = int(m.group(3), 16)
            for off in range(end - start + 1):
                try:
                    mapping[f"{start + off:04X}"] = chr(target + off)
                except:
                    pass
    return mapping

font_maps = {
    "/F4": parse_cmap(zlib.decompress(streams[27]).decode("latin1")),
    "/F5": parse_cmap(zlib.decompress(streams[29]).decode("latin1")),
    "/F9": parse_cmap(zlib.decompress(streams[31]).decode("latin1")),
    "/F10": parse_cmap(zlib.decompress(streams[33]).decode("latin1")),
    "/F11": parse_cmap(zlib.decompress(streams[35]).decode("latin1")),
}

token_pattern = re.compile(
    r"(/[A-Za-z0-9_]+)\s+[0-9.]+\s+Tf|"
    r"([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+Tm|"
    r"([0-9.\-]+)\s+([0-9.\-]+)\s+Td|"
    r"<([0-9a-fA-F]+)>\s*Tj"
)

def extract_page_tokens(decomp):
    tokens = []
    curr_font = "/F9"
    curr_x, curr_y = 0.0, 0.0
    for m in token_pattern.finditer(decomp):
        if m.group(1):
            curr_font = m.group(1)
        elif m.group(2):
            curr_x, curr_y = float(m.group(6)), float(m.group(7))
        elif m.group(8):
            curr_x += float(m.group(8))
            curr_y += float(m.group(9))
        elif m.group(10):
            hex_data = m.group(10)
            cmap = font_maps.get(curr_font, font_maps["/F9"])
            s = ""
            for j in range(0, len(hex_data), 4):
                c = hex_data[j:j+4].upper()
                s += cmap.get(c, "")
            if s:
                tokens.append((curr_x, curr_y, curr_font, s))
    return tokens

page_streams = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25]

# RegimePlan 2026 meat macros:
# meat_lean: 46 kcal, 0g carb, 7g protein, 2g fat
# meat_medium_fat: 73 kcal, 0g carb, 7g protein, 5g fat
# meat_high_fat: 100 kcal, 0g carb, 7g protein, 8g fat

MACROS = {
    "meat_lean": {"caloriesKcal": 46, "carbsG": 0, "proteinG": 7, "fatG": 2},
    "meat_medium_fat": {"caloriesKcal": 73, "carbsG": 0, "proteinG": 7, "fatG": 5},
    "meat_high_fat": {"caloriesKcal": 100, "carbsG": 0, "proteinG": 7, "fatG": 8},
}

# Translation helper dictionary for meat foods
EN_TERMS = {
    "فراخ": "Chicken",
    "فرخة": "Chicken",
    "دجاج": "Chicken",
    "كاملة": "Whole",
    "صدر": "Breast",
    "ورك": "Thigh",
    "دبوس": "Drumstick",
    "جناح": "Wing",
    "قوانص": "Gizzards",
    "لحم": "Meat / Beef",
    "لمحة": "Beef",
    "شاورما": "Shawarma",
    "كفتة": "Kofta",
    "ريش": "Ribs",
    "ستيك": "Steak",
    "بقري": "Beef",
    "ضأن": "Lamb",
    "ضاني": "Lamb",
    "بتلو": "Veal",
    "ماعز": "Goat",
    "جاموسي": "Buffalo",
    "مجل": "Camel",
    "مجلي": "Camel",
    "سمك": "Fish",
    "مسك": "Fish",
    "سلمون": "Salmon",
    "ساملون": "Salmon",
    "تونة": "Tuna",
    "ماكريل": "Mackerel",
    "سردين": "Sardine",
    "جمبري": "Shrimp / Prawns",
    "مجبري": "Shrimp",
    "كابوريا": "Crab",
    "إستاكوزا": "Lobster",
    "استاكوزا": "Lobster",
    "سكالوب": "Scallops",
    "حبار": "Squid / Calamari",
    "كالمياري": "Calamari",
    "أخطبوط": "Octopus",
    "محار": "Oysters / Clams",
    "بلطي": "Tilapia",
    "بوري": "Grey Mullet",
    "دنيس": "Sea Bream",
    "وقار": "Grouper",
    "هامور": "Grouper",
    "قاروص": "Sea Bass",
    "مكرونة": "Saurida / Brushtooth Lizardfish",
    "قشر بياض": "Nile Perch",
    "قد": "Cod Fish",
    "القد": "Cod",
    "بولاك": "Pollock",
    "تراوت": "Trout",
    "بربوني": "Red Mullet",
    "كنعد": "Kingfish",
    "موسى": "Sole",
    "قرموط": "Catfish",
    "هاليبوت": "Halibut",
    "أبو": "Swordfish",
    "رنجة": "Smoked Herring",
    "فسيخ": "Feseekh (Cured Grey Mullet)",
    "أنشوجة": "Anchovies",
    "كافيار": "Caviar",
    "بط": "Duck",
    "وز": "Goose",
    "حمام": "Pigeon / Squab",
    "محام": "Pigeon / Squab",
    "سمان": "Quail",
    "مسان": "Quail",
    "ديك رومي": "Turkey",
    "رومي": "Turkey",
    "أرانب": "Rabbit",
    "نعام": "Ostrich",
    "كبدة": "Liver",
    "قلب": "Heart",
    "كلاوي": "Kidney",
    "مخ": "Brain",
    "كرشة": "Tripe",
    "طحال": "Spleen",
    "كوارع": "Trotters",
    "لسان": "Tongue",
    "سجق": "Sausage",
    "هوت دوج": "Hot Dog",
    "سوسيس": "Frankfurter",
    "برجر": "Burger Patty",
    "لانشون": "Luncheon Meat / Mortadella",
    "بسطرمة": "Pastrami",
    "باسترامي": "Pastrami",
    "بيبروني": "Pepperoni",
    "سلامي": "Salami",
    "جبنة": "Cheese",
    "جبن": "Cheese",
    "بيض": "Egg",
    "بياض بيض": "Egg White",
    "صفار بيض": "Egg Yolk",
    "توفو": "Tofu",
    "تمبي": "Tempeh",
    "نيء": "Raw",
    "نيئة": "Raw",
    "مطبوخ": "Cooked",
    "مطبوخة": "Cooked",
    "مشوي": "Grilled",
    "مشوية": "Grilled",
    "مسلوق": "Boiled",
    "مسلوقة": "Boiled",
    "مقلي": "Fried",
    "مقلية": "Fried",
    "في الفرن": "Baked / Roasted",
    "معلب": "Canned",
    "معلبة": "Canned",
    "مدخن": "Smoked",
    "مدخنة": "Smoked",
    "بدون جلد": "Skinless",
    "بالجلد": "With Skin",
    "مفروم": "Minced / Ground",
    "مفرومة": "Minced / Ground",
}

def translate_name(ar):
    if "في الفرن" in ar:
        ar_proc = ar.replace("في الفرن", " baked_placeholder ")
    else:
        ar_proc = ar
    ar_proc = ar_proc.replace("بدون جلد", " skinless_placeholder ")
    words = ar_proc.split()
    parts = []
    matched = False
    for w in words:
        w_clean = re.sub(r"[()\[\]،,]+.*$", "", w)
        for prefix in ("ربع", "نصف", "في", "على"):
            pass
        if w_clean == "baked_placeholder":
            parts.append("Baked")
        elif w_clean == "skinless_placeholder":
            parts.append("Skinless")
        elif w_clean in EN_TERMS:
            parts.append(EN_TERMS[w_clean])
            matched = True
        else:
            # Handle PDF-glued suffixes like مشويمسانة / نيءربع / مشويربع
            for ar_key, en_val in sorted(EN_TERMS.items(), key=lambda kv: -len(kv[0])):
                if len(ar_key) >= 3 and w_clean.startswith(ar_key):
                    parts.append(en_val)
                    matched = True
                    break
    if not matched:
        return f"Meat Product ({ar})"
    # Deduplicate consecutive identical words cleanly
    dedup = []
    for p in parts:
        if not dedup or dedup[-1].lower() != p.lower():
            dedup.append(p)
    return " ".join(dedup)

# Parse pages 7 (meat section), 8, 9, 10
# Current subcategory tracking
items = []
current_cat = "meat_lean"

for p_num in [7, 8, 9, 10]:
    decomp = zlib.decompress(streams[page_streams[p_num - 1]]).decode("latin1")
    toks = extract_page_tokens(decomp)
    
    # split left and right
    left = [t for t in toks if t[0] < 390]
    right = [t for t in toks if t[0] >= 390]
    
    for col in [right, left]:
        rows = {}
        for x, y, f, text in col:
            ry = round(y)
            rows.setdefault(ry, []).append((x, f, text))
            
        for ry in sorted(rows.keys(), reverse=True):
            row_toks = sorted(rows[ry], key=lambda i: -i[0])
            txt = "".join(t[2] for t in row_toks).strip()
            
            # Check for category changes
            if "متوسطة الدهون" in txt or "73 سعرة" in txt:
                current_cat = "meat_medium_fat"
            elif "عالية الدهون" in txt or "001 سعرة" in txt or "100 سعرة" in txt:
                current_cat = "meat_high_fat"
            elif "اللحوم وبدائلها" in txt or "46 سعرة" in txt or "قليلة الدهون" in txt:
                current_cat = "meat_lean"
                
            # Ignore headers, branding, descriptions
            if any(h in txt for h in [
                "nalPemigeR", "الكمية", "منصة", "سعرة", "المقدار", "tsil-", 
                "ابدأ", "يحسب", "أخصائي", "اللحوم وبدائلها", "الطعما"
            ]):
                continue
                
            # Look for line with gram weight
            # Format typically: <Name><Household><Digits>
            # The digits at the end are reversed!
            m = re.search(r"(\d+)\s*$", txt)
            if not m:
                continue
                
            rev_digits = m.group(1)
            # Reconstruct gram weight by reversing digits
            weight_str = rev_digits[::-1]
            try:
                weight = float(weight_str)
            except:
                continue
                
            if weight <= 0 or weight > 500:
                continue
                
            # Extract the remaining text before the digits
            rest = txt[:m.start()].strip()
            if not rest or len(rest) < 3:
                continue
                
            # Check household measure vs name
            # If rest has '—' or 'كوب' or 'شريحة' or 'قطعة'
            hh_ar = "حصة معيارية"
            hh_en = "Standard portion"
            name_ar = rest
            
            # Check for common household measures
            for hm in ["شريحة ونصف", "شريحة", "قطعة فيليه", "قطعة", "نصف كوب", "ثلث كوب", "ربع كوب", "كوب", "ملعقتان كبيرتان", "ملعقة كبيرة", "نصف دبوس", "دبوس", "نصف صدر", "صدر متوسط", "صدر", "ورك متوسط", "ورك", "ربع فرخة", "نصف فرخة", "حبة كبيرة", "حبة متوسطة", "حبة ونصف", "حبة", "حبتان", "3 قطع", "5 أصابع", "إصبع", "علبة", "—"]:
                if hm in rest:
                    parts = rest.split(hm, 1)
                    name_ar = parts[0].strip()
                    hh_ar = (hm + " " + parts[1]).strip()
                    break
                    
            name_ar = re.sub(r"\s*=\s*\d+.*$", "", name_ar).strip()
            if not name_ar:
                continue
                
            # Filter out non-meat items (e.g. if legume/dairy slipped in)
            if any(ex in name_ar for ex in ["لبن", "زبادي", "فول", "عدس", "حمص", "فاصوليا", "لوبيا", "إدامامي"]):
                continue
                
            # Determine prep state
            prep = "cooked"
            if "نيء" in name_ar or "نيئة" in name_ar:
                prep = "raw"
            elif "معلب" in name_ar or "معلبة" in name_ar or "مدخن" in name_ar or "مدخنة" in name_ar:
                prep = "ready-to-eat"
            elif "مشوي" in name_ar or "مشوية" in name_ar:
                prep = "grilled"
            elif "مسلوق" in name_ar or "مسلوقة" in name_ar:
                prep = "boiled"
            elif "مقلي" in name_ar or "مقلية" in name_ar:
                prep = "fried"
            elif "في الفرن" in name_ar:
                prep = "baked"
                
            items.append({
                "nameAr": name_ar,
                "hhAr": hh_ar if hh_ar != "—" else f"{int(weight)} جم",
                "weight": weight,
                "cat": current_cat,
                "prep": prep,
                "page": p_num
            })

# Deduplicate items by nameAr while preserving original 1-based PDF extraction index
# (so page footer artifacts at indices 24, 76, 135 keep stable codes for remaining items)
unique_items = []
seen_names = set()
for it in items:
    if it["nameAr"] not in seen_names:
        seen_names.add(it["nameAr"])
        unique_items.append(it)

numbered_items = [
    (i + 1, it)
    for i, it in enumerate(unique_items[:196])
    if "صفحة" not in it["nameAr"]
]

print(f"Extracted {len(numbered_items)} unique non-footer meat items from pages 7-10")
cats = {}
for _, it in numbered_items:
    cats[it["cat"]] = cats.get(it["cat"], 0) + 1
print("Categories:", cats)
print(f"Selected {len(numbered_items)} new meat items to combine with {len(orig)} original.")

MEAT_ANALYTICAL_OVERRIDES = {
    # Legumes & Plant Proteins listed in meat substitutes
    "RP-MT-001": {"nameEn": "Cooked Mung Beans", "caloriesKcal": 105.0, "carbsG": 19.2, "proteinG": 7.0, "fatG": 0.4, "fiberG": 7.6, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["ماش", "mung beans"]},
    "RP-MT-002": {"nameEn": "Raw Dried Chickpeas", "caloriesKcal": 378.0, "carbsG": 63.0, "proteinG": 20.5, "fatG": 6.0, "fiberG": 12.2, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["حمص", "حمص نيء", "chickpeas"]},
    "RP-MT-003": {"nameEn": "Cooked Chickpeas", "caloriesKcal": 164.0, "carbsG": 27.4, "proteinG": 8.9, "fatG": 2.6, "fiberG": 7.6, "sodiumMg": 7.0, "waterG": 60.2, "sourceId": "usda_fdc", "sourceRecordId": "16057", "verificationStatus": "verified_standard", "tags": ["حمص", "حمص مطبوخ", "chickpeas"]},
    "RP-MT-014": {"nameEn": "Hummus with Tahini", "caloriesKcal": 166.0, "carbsG": 14.3, "proteinG": 7.9, "fatG": 9.6, "fiberG": 6.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["حمص بطحينة", "حمص", "hummus"]},
    "RP-MT-015": {"nameEn": "Egyptian Taameya / Falafel", "caloriesKcal": 333.0, "carbsG": 31.8, "proteinG": 13.3, "fatG": 17.8, "fiberG": 4.9, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["طعمية", "فلافل", "falafel", "taameya"]},
    "RP-MT-016": {"nameEn": "Chickpea Flour (Besan)", "prep": "raw", "caloriesKcal": 387.0, "carbsG": 57.8, "proteinG": 22.4, "fatG": 6.7, "fiberG": 10.8, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["دقيق حمص", "حمص", "chickpea flour"]},
    "RP-MT-017": {"nameEn": "Canned Chickpeas (Drained)", "caloriesKcal": 139.0, "carbsG": 22.6, "proteinG": 7.1, "fatG": 2.0, "fiberG": 6.4, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["حمص معلب", "حمص", "chickpeas"]},
    "RP-MT-018": {"nameEn": "Cooked Chana Dal (Split Chickpeas)", "caloriesKcal": 164.0, "carbsG": 27.4, "proteinG": 8.9, "fatG": 2.6, "fiberG": 7.6, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["دال حمص", "حمص", "chana dal"]},
    "RP-MT-019": {"nameEn": "Cooked Urad Dal (Black Gram)", "caloriesKcal": 105.0, "carbsG": 18.4, "proteinG": 7.5, "fatG": 0.5, "fiberG": 6.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["دال أوراد", "urad dal"]},
    "RP-MT-020": {"nameEn": "Cooked Toor Dal (Split Pigeon Peas)", "caloriesKcal": 121.0, "carbsG": 23.3, "proteinG": 6.8, "fatG": 0.4, "fiberG": 6.7, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["دال توور", "toor dal"]},
    "RP-MT-021": {"nameEn": "Roasted Chickpeas", "prep": "roasted", "caloriesKcal": 369.0, "carbsG": 58.0, "proteinG": 19.3, "fatG": 6.0, "fiberG": 12.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["حمص محمص", "حمص", "roasted chickpeas"]},
    "RP-MT-022": {"nameEn": "Cooked Lupini Beans (Termis)", "caloriesKcal": 119.0, "carbsG": 9.9, "proteinG": 15.6, "fatG": 2.9, "fiberG": 2.8, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["ترمس", "lupini beans"]},
    "RP-MT-023": {"nameEn": "Cooked Split Peas", "caloriesKcal": 118.0, "carbsG": 21.1, "proteinG": 8.3, "fatG": 0.4, "fiberG": 8.3, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["بسلة مجروشة", "split peas"]},
    "RP-MT-117": {"nameEn": "Plant-Based Veggie Burger Patty", "caloriesKcal": 177.0, "carbsG": 14.3, "proteinG": 15.7, "fatG": 6.3, "fiberG": 4.9, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["برجر نباتي", "veggie burger"]},
    "RP-MT-118": {"nameEn": "Dry Textured Soy Protein (TVP)", "prep": "dried", "caloriesKcal": 336.0, "carbsG": 33.9, "proteinG": 51.5, "fatG": 1.2, "fiberG": 17.5, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["لحم صويا", "فول صويا", "textured soy protein", "tvp"]},
    "RP-MT-119": {"nameEn": "Seitan (Wheat Gluten)", "caloriesKcal": 120.0, "carbsG": 4.0, "proteinG": 21.0, "fatG": 1.9, "fiberG": 0.6, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["سيتان", "seitan"]},
    "RP-MT-174": {"nameEn": "Plant-Based Chick'n Strips", "caloriesKcal": 180.0, "carbsG": 8.0, "proteinG": 20.0, "fatG": 7.0, "fiberG": 3.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["شرائح دجاج نباتية", "plant protein"]},
    "RP-MT-175": {"nameEn": "Plant-Based Vegetarian Sausage", "caloriesKcal": 210.0, "carbsG": 9.0, "proteinG": 18.0, "fatG": 11.0, "fiberG": 3.5, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["سجق نباتي", "plant sausage"]},
    "RP-MT-176": {"nameEn": "Soft Tofu", "caloriesKcal": 62.0, "carbsG": 1.8, "proteinG": 6.5, "fatG": 3.5, "fiberG": 0.3, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["توفو طري", "توفو", "soft tofu"]},
    "RP-MT-177": {"nameEn": "Silken Tofu", "caloriesKcal": 55.0, "carbsG": 1.9, "proteinG": 4.8, "fatG": 2.7, "fiberG": 0.1, "sodiumMg": 5.0, "waterG": 89.6, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["توفو حريري", "توفو", "silken tofu"]},
    "RP-MT-178": {"nameEn": "Tempeh", "caloriesKcal": 192.0, "carbsG": 7.6, "proteinG": 20.3, "fatG": 10.8, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["تمبي", "tempeh"]},
    "RP-MT-179": {"nameEn": "Firm Tofu", "caloriesKcal": 144.0, "carbsG": 2.8, "proteinG": 17.3, "fatG": 8.7, "fiberG": 2.3, "sodiumMg": 14.0, "waterG": 69.8, "sourceId": "usda_fdc", "sourceRecordId": "16426", "verificationStatus": "verified_standard", "tags": ["توفو جامد", "توفو", "firm tofu"]},
    # Cheeses classified as meat substitutes
    "RP-MT-120": {"nameEn": "Light White Cheese (Reduced-Fat Feta)", "caloriesKcal": 145.0, "carbsG": 3.5, "proteinG": 15.0, "fatG": 8.0, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["جبنة بيضاء لايت", "جبنة", "cheese"]},
    "RP-MT-121": {"nameEn": "Egyptian Quraish / Cottage Cheese", "caloriesKcal": 98.0, "carbsG": 3.4, "proteinG": 11.1, "fatG": 4.3, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["جبنة قريش", "جبنة", "quraish"]},
    "RP-MT-180": {"nameEn": "Akkawi Cheese", "caloriesKcal": 289.0, "carbsG": 1.8, "proteinG": 22.0, "fatG": 21.5, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["جبنة عكاوي", "عكاوي", "akkawi cheese"]},
    "RP-MT-181": {"nameEn": "Processed Triangle Cheese Wedges", "caloriesKcal": 285.0, "carbsG": 4.5, "proteinG": 11.0, "fatG": 25.0, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["جبنة مثلثات", "جبنة", "processed cheese"]},
    "RP-MT-182": {"nameEn": "Paneer Cheese", "caloriesKcal": 296.0, "carbsG": 3.6, "proteinG": 18.3, "fatG": 23.0, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["جبنة بانير", "بانير", "paneer"]},
    "RP-MT-183": {"nameEn": "Whole Milk Ricotta Cheese", "caloriesKcal": 174.0, "carbsG": 3.0, "proteinG": 11.3, "fatG": 13.0, "fiberG": 0.0, "sodiumMg": 84.0, "waterG": 71.7, "sourceId": "usda_fdc", "sourceRecordId": "01036", "verificationStatus": "verified_standard", "tags": ["ريكوتا", "جبنة ريكوتا", "ricotta cheese"]},
    "RP-MT-184": {"nameEn": "Feta Cheese", "caloriesKcal": 264.0, "carbsG": 4.1, "proteinG": 14.2, "fatG": 21.3, "fiberG": 0.0, "sodiumMg": 917.0, "waterG": 55.2, "sourceId": "usda_fdc", "sourceRecordId": "01019", "verificationStatus": "verified_standard", "tags": ["جبنة فيتا", "فيتا", "feta cheese"]},
    "RP-MT-185": {"nameEn": "Whole Milk Mozzarella Cheese", "caloriesKcal": 300.0, "carbsG": 2.2, "proteinG": 22.2, "fatG": 22.4, "fiberG": 0.0, "sodiumMg": 627.0, "waterG": 50.0, "sourceId": "usda_fdc", "sourceRecordId": "01026", "verificationStatus": "verified_standard", "tags": ["موتزاريلا", "جبنة موتزاريلا", "mozzarella"]},
    "RP-MT-186": {"nameEn": "Egyptian Domiati White Cheese", "caloriesKcal": 245.0, "carbsG": 2.8, "proteinG": 15.0, "fatG": 19.5, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["جبنة بيضاء دمياطي", "جبنة دمياطي", "domiati cheese"]},
    # Organ Meats & Eggs
    "RP-MT-025": {"nameEn": "Raw Beef Liver", "caloriesKcal": 135.0, "carbsG": 3.9, "proteinG": 20.4, "fatG": 3.6, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["كبدة بقري", "beef liver"]},
    "RP-MT-047": {"nameEn": "Raw Chicken Liver", "caloriesKcal": 119.0, "carbsG": 0.7, "proteinG": 16.9, "fatG": 4.8, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["كبدة فراخ", "chicken liver"]},
    "RP-MT-075": {"nameEn": "Grilled / Braised Beef Liver", "caloriesKcal": 175.0, "carbsG": 5.1, "proteinG": 26.5, "fatG": 4.7, "fiberG": 0.0, "sodiumMg": 79.0, "waterG": 61.9, "sourceId": "usda_fdc", "sourceRecordId": "13326", "verificationStatus": "verified_standard", "tags": ["كبدة بقري", "beef liver"]},
    "RP-MT-122": {"nameEn": "Egg White (Raw)", "prep": "raw", "caloriesKcal": 52.0, "carbsG": 0.7, "proteinG": 10.9, "fatG": 0.2, "fiberG": 0.0, "sodiumMg": 166.0, "waterG": 87.6, "sourceId": "usda_fdc", "sourceRecordId": "01124", "verificationStatus": "verified_standard", "tags": ["بياض بيض", "egg white"]},
    "RP-MT-152": {"nameEn": "Pan-Fried Beef Liver", "caloriesKcal": 195.0, "carbsG": 5.2, "proteinG": 26.0, "fatG": 7.2, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["كبدة بقري مقلية", "beef liver"]},
    "RP-MT-161": {"nameEn": "Pan-Cooked / Fried Chicken Liver", "prep": "fried", "caloriesKcal": 167.0, "carbsG": 0.7, "proteinG": 24.1, "fatG": 6.5, "fiberG": 0.0, "sodiumMg": 76.0, "waterG": 67.1, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["كبدة فراخ", "chicken liver"]},
    "RP-MT-166": {"nameEn": "Egg Yolk (Raw)", "prep": "raw", "caloriesKcal": 322.0, "carbsG": 3.6, "proteinG": 15.9, "fatG": 26.5, "fiberG": 0.0, "sodiumMg": 48.0, "waterG": 52.3, "sourceId": "usda_fdc", "sourceRecordId": "01125", "verificationStatus": "verified_standard", "tags": ["صفار بيض", "egg yolk"]},
    "RP-MT-187": {"nameEn": "Omelet (Cooked Whole Egg)", "caloriesKcal": 154.0, "carbsG": 1.0, "proteinG": 10.6, "fatG": 11.7, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["أومليت", "بيض", "omelet"]},
    "RP-MT-188": {"nameEn": "Scrambled Egg", "caloriesKcal": 149.0, "carbsG": 1.6, "proteinG": 10.0, "fatG": 11.0, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["بيض مخفوق", "بيض", "scrambled egg"]},
    "RP-MT-189": {"nameEn": "Poached Egg", "caloriesKcal": 143.0, "carbsG": 0.7, "proteinG": 12.5, "fatG": 9.5, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["بيض بوشيه", "بيض", "poached egg"]},
    "RP-MT-190": {"nameEn": "Fried Egg", "caloriesKcal": 196.0, "carbsG": 0.8, "proteinG": 13.6, "fatG": 14.8, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["بيض مقلي", "بيض", "fried egg"]},
    "RP-MT-191": {"nameEn": "Hard-Boiled Whole Egg", "caloriesKcal": 155.0, "carbsG": 1.1, "proteinG": 12.6, "fatG": 10.6, "fiberG": 0.0, "sodiumMg": 124.0, "waterG": 74.6, "sourceId": "usda_fdc", "sourceRecordId": "01129", "verificationStatus": "verified_standard", "tags": ["بيض مسلوق", "بيض", "boiled egg"]},
    "RP-MT-192": {"nameEn": "Raw Whole Egg", "caloriesKcal": 143.0, "carbsG": 0.7, "proteinG": 12.6, "fatG": 9.5, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["بيض نيء", "بيض", "raw egg"]},
    # Surimi, Shellfish, Breaded & Processed Meats
    "RP-MT-077": {"nameEn": "Imitation Crab (Surimi)", "caloriesKcal": 95.0, "carbsG": 15.0, "proteinG": 7.6, "fatG": 0.5, "fiberG": 0.5, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["كابوريا مقلدة", "surimi"]},
    "RP-MT-084": {"nameEn": "Raw Oysters", "caloriesKcal": 68.0, "carbsG": 3.9, "proteinG": 7.0, "fatG": 2.5, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["أويستر", "محار", "oysters"]},
    "RP-MT-098": {"nameEn": "Cooked Clams / Oysters", "caloriesKcal": 140.0, "carbsG": 5.1, "proteinG": 18.0, "fatG": 3.5, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["محار", "clams"]},
    "RP-MT-099": {"nameEn": "Cooked Mussels", "caloriesKcal": 172.0, "carbsG": 7.4, "proteinG": 23.8, "fatG": 4.5, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["بلح البحر", "mussels"]},
    "RP-MT-136": {"nameEn": "Fried Breaded Calamari", "caloriesKcal": 175.0, "carbsG": 7.8, "proteinG": 17.9, "fatG": 7.5, "fiberG": 0.3, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["كاليماري مقلي", "calamari"]},
    "RP-MT-137": {"nameEn": "Fried Breaded Shrimp", "caloriesKcal": 242.0, "carbsG": 11.5, "proteinG": 21.4, "fatG": 12.3, "fiberG": 0.4, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["جمبري مقلي", "جمبري", "fried shrimp"]},
    "RP-MT-138": {"nameEn": "Fried Breaded Cod Fillet", "caloriesKcal": 200.0, "carbsG": 9.5, "proteinG": 18.0, "fatG": 9.8, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["سمك القد مقلي", "سمك", "fried cod"]},
    "RP-MT-142": {"nameEn": "Beef Luncheon Meat", "caloriesKcal": 240.0, "carbsG": 3.8, "proteinG": 13.5, "fatG": 18.8, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["لانشون بقري", "لانشون", "luncheon meat"]},
    "RP-MT-144": {"nameEn": "Breaded Beef Escalope (Pané)", "caloriesKcal": 265.0, "carbsG": 14.5, "proteinG": 18.5, "fatG": 14.5, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["إسكالوب بانيه", "بانيه", "beef escalope"]},
    "RP-MT-148": {"nameEn": "Beef Salami", "caloriesKcal": 336.0, "carbsG": 2.4, "proteinG": 21.7, "fatG": 26.3, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["سلامي بقري", "سلامي", "salami"]},
    "RP-MT-159": {"nameEn": "Chicken Luncheon Meat", "caloriesKcal": 210.0, "carbsG": 4.0, "proteinG": 14.0, "fatG": 15.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["لانشون فراخ", "لانشون", "chicken luncheon"]},
    "RP-MT-160": {"nameEn": "Chicken Nuggets", "caloriesKcal": 296.0, "carbsG": 15.0, "proteinG": 15.5, "fatG": 19.0, "fiberG": 0.9, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["ناجتس فراخ", "ناجتس", "chicken nuggets"]},
    "RP-MT-165": {"nameEn": "Breaded Chicken Cutlet (Pané)", "caloriesKcal": 268.0, "carbsG": 14.2, "proteinG": 19.5, "fatG": 14.5, "fiberG": 0.8, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["فراخ بانيه", "بانيه", "breaded chicken"]},
    "RP-MT-167": {"nameEn": "Beef Hot Dog / Frankfurter", "caloriesKcal": 315.0, "carbsG": 2.5, "proteinG": 11.7, "fatG": 28.5, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["هوت دوج", "سوسيس", "hot dog"]},
    "RP-MT-169": {"nameEn": "Beef Pepperoni", "caloriesKcal": 466.0, "carbsG": 2.0, "proteinG": 22.0, "fatG": 40.3, "fiberG": 0.0, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["بيبروني", "pepperoni"]},
    "RP-MT-193": {"nameEn": "Breaded Fried Fish Fillet (Pané)", "caloriesKcal": 232.0, "carbsG": 16.5, "proteinG": 14.5, "fatG": 12.0, "fiberG": 0.8, "sourceId": "clinic_reviewed", "verificationStatus": "clinic_reviewed", "tags": ["فيليه سمك بانيه", "سمك", "بانيه", "breaded fish"]},
}

SEARCH_TYPO_TAGS = {
    "مجبري": ["جمبري", "روبيان", "shrimp"],
    "ساملون": ["سلمون", "سمك", "salmon"],
    "مسك": ["سمك", "fish"],
    "كالمياري": ["كاليماري", "حبار", "calamari"],
    "مسان": ["سمان", "quail"],
    "محام": ["حمام", "pigeon"],
    "مجل": ["جمل", "camel"],
    "لمحة": ["لحمة", "شاورما", "shawarma"],
}

def make_meat_record(it, seq_num):
    code = f"RP-MT-{seq_num:03d}"
    item_id = f"food_meat_{code.lower().replace('-', '_')}"
    portion_id = f"portion_{item_id}_serving"

    w = it["weight"]
    cat = it["cat"]
    override = MEAT_ANALYTICAL_OVERRIDES.get(code, {})
    m = MACROS[cat]
    
    def fmt(n):
        r = round(n, 1)
        return int(r) if r == int(r) else r

    if override:
        kcal100 = override["caloriesKcal"]
        c100 = override["carbsG"]
        p100 = override["proteinG"]
        f100 = override["fatG"]
    else:
        kcal100 = fmt((m["caloriesKcal"] / w) * 100)
        c100 = fmt((m["carbsG"] / w) * 100)
        p100 = fmt((m["proteinG"] / w) * 100)
        f100 = fmt((m["fatG"] / w) * 100)
    w_gram = int(w) if isinstance(w, (int, float)) and w == int(w) else round(w, 1)
    
    name_en = override.get("nameEn") or translate_name(it["nameAr"])
    hh_en = f"{int(w)}g portion"

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
    core_keys = [
        "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG",
        "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg",
        "calciumMg", "ironMg", "waterG"
    ]
    nutrients["missingNutrientKeys"] = [k for k in core_keys if nutrients[k] is None]

    prep_state = override.get("prep", it["prep"])
    tags = ["meats", cat, prep_state]
    for extra in override.get("tags", []):
        if extra not in tags:
            tags.append(extra)
    for bad, syns in SEARCH_TYPO_TAGS.items():
        if bad in it["nameAr"]:
            for s in syns:
                if s not in tags:
                    tags.append(s)

    source_id = override.get("sourceId", "regimeplan_2026")
    ver_status = override.get("verificationStatus", "clinic_reviewed")

    record = {
        "id": item_id,
        "code": code,
        "sourceId": source_id,
        "nameEn": name_en,
        "nameAr": it["nameAr"],
        "foodGroupId": "meats",
        "primaryExchangeCategoryId": cat,
        "preparationState": prep_state,
        "verificationStatus": ver_status,
        "isCustom": False,
        "nutrients100g": nutrients,
        "portions": [{
            "id": portion_id,
            "portionNameEn": f"1 Meat Exchange (~{int(w)}g)",
            "portionNameAr": f"بديل لحوم واحد (~{int(w)} جم)",
            "householdMeasureEn": hh_en,
            "householdMeasureAr": it["hhAr"],
            "gramWeight": w_gram,
            "exchangeCategory": cat,
            "exchangeEquivalentFactor": 1,
            "isDefaultServing": True
        }],
        "tags": tags,
        "notesAr": f"قوائم البدائل الغذائية RegimePlan 2026 (ص {it['page']}). وزن الحصة البديلة: {int(w)} جم ({it['hhAr']}).",
        "notesEn": f"RegimePlan Food Exchange Lists (2026, p. {it['page']}). Standard meat exchange portion: {int(w)}g ({hh_en})."
    }
    if override.get("sourceRecordId"):
        record["sourceRecordId"] = override["sourceRecordId"]
    return record

new_records = [make_meat_record(it, seq) for seq, it in numbered_items]
all_meats = orig + new_records

header = '''/**
 * Nutrition Clinic Pro - Food Catalog: Meats, Poultry, Fish, Seafood & Cheeses Module
 * Source: Egyptian NNI 2006, USDA FoodData Central & RegimePlan 2026
 */

import { FoodItemRecord } from '../types';

export const MEAT_FOOD_ITEMS: FoodItemRecord[] = '''

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(header + json.dumps(all_meats, ensure_ascii=False, indent=2) + ";\n")

print(f"Generated {len(all_meats)} meats in {OUT_PATH} (Original: {len(orig)}, New: {len(new_records)})")
