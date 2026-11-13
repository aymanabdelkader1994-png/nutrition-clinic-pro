#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nutrition Clinic Pro - Unified Master Food Catalog Generator & Validator
Deterministic generation pipeline for all 8 modular food catalog datasets.

Sources:
1. Egyptian National Nutrition Institute (NNI) Food Composition Tables (2006)
2. USDA FoodData Central (Standard Reference Legacy & Foundation)
3. RegimePlan Food Exchange Lists (Arabic Edition, 2026, 13 pages)
4. Acrobat Egyptian Traditional & Occasion Food Guide (2026)

Usage:
    python3 scripts/build_full_catalog.py
"""

import os
import sys
import subprocess
import json

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")
DATA_DIR = os.path.join(BASE_DIR, "src", "clinical", "food", "data")

GENERATOR_SCRIPTS = [
    ("Starches & Grains", "gen_starches.py", "starches.ts"),
    ("Fruits & Juices", "gen_fruits.py", "fruits.ts"),
    ("Dairy & Plant Milks", "gen_dairy.py", "dairy.ts"),
    ("Occasions & Traditional Foods", "gen_occasions.py", "occasions.ts"),
    ("Vegetables", "gen_vegetables.py", "vegetables.ts"),
    ("Legumes", "gen_legumes.py", "legumes.ts"),
    ("Meats & Cheeses", "gen_meats.py", "meats.ts"),
    ("Fats & Oils", "gen_fats.py", "fats.ts"),
]

import math
import re

CORE_TRACKED_KEYS = [
    "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG",
    "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg",
    "calciumMg", "ironMg", "waterG",
]

NUTRIENT_REQUIRED_KEYS = [
    "basisWeightG", "caloriesKcal", "carbsG", "proteinG", "fatG", "missingNutrientKeys",
]

VALID_SOURCE_IDS = {"usda_fdc", "egyptian_nni_2006", "regimeplan_2026", "clinic_reviewed"}


def validate_catalog(all_items):
    errors = []
    seen_ids = set()
    seen_codes = set()
    seen_portion_ids = set()

    if len(all_items) != 676:
        errors.append(f"Expected 676 total catalog records, got {len(all_items)}")

    for item in all_items:
        item_id = item.get("id")
        code = item.get("code")
        if not item_id:
            errors.append(f"Item missing id: {item}")
            continue
        if item_id in seen_ids:
            errors.append(f"Duplicate item id: {item_id}")
        seen_ids.add(item_id)

        if code:
            if code in seen_codes:
                errors.append(f"Duplicate item code: {code} ({item_id})")
            seen_codes.add(code)

        # Portions
        portions = item.get("portions") or []
        if not portions:
            errors.append(f"{item_id}: missing portions")
        for p in portions:
            pid = p.get("id")
            if not pid:
                errors.append(f"{item_id}: portion missing id")
            elif pid in seen_portion_ids:
                errors.append(f"Duplicate global portion id: {pid} ({item_id})")
            else:
                seen_portion_ids.add(pid)
            gw = p.get("gramWeight")
            if not isinstance(gw, (int, float)) or not math.isfinite(gw) or gw <= 0:
                errors.append(f"{item_id}: invalid gramWeight {gw}")

        # Nutrients schema & plausibility
        n100 = item.get("nutrients100g") or {}
        for rk in NUTRIENT_REQUIRED_KEYS:
            if rk not in n100:
                errors.append(f"{item_id}: nutrients100g missing required key {rk}")

        bw = n100.get("basisWeightG")
        if not isinstance(bw, (int, float)) or bw <= 0:
            errors.append(f"{item_id}: basisWeightG must be > 0 (got {bw})")

        kcal = n100.get("caloriesKcal")
        carbs = n100.get("carbsG")
        prot = n100.get("proteinG")
        fat = n100.get("fatG")
        for label, val in [("caloriesKcal", kcal), ("carbsG", carbs), ("proteinG", prot), ("fatG", fat)]:
            if not isinstance(val, (int, float)) or not math.isfinite(val) or val < 0:
                errors.append(f"{item_id}: {label} invalid value {val}")

        if all(isinstance(v, (int, float)) for v in (carbs, prot, fat)):
            macro_sum = carbs + prot + fat
            if macro_sum > 100.5:
                errors.append(f"{item_id} ({code}): macro sum carbs+protein+fat = {macro_sum:.2f}g exceeds 100.5g/100g")

        # missingNutrientKeys consistency
        missing_keys = n100.get("missingNutrientKeys")
        if not isinstance(missing_keys, list):
            errors.append(f"{item_id}: missingNutrientKeys must be a list")
            missing_keys = []
        if len(set(missing_keys)) != len(missing_keys):
            errors.append(f"{item_id}: duplicate entries in missingNutrientKeys")
        missing_set = set(missing_keys)
        for ck in CORE_TRACKED_KEYS:
            val = n100.get(ck)
            if val is None and ck not in missing_set:
                errors.append(f"{item_id}: core key {ck} is None but absent from missingNutrientKeys")
            elif isinstance(val, (int, float)) and ck in missing_set:
                errors.append(f"{item_id}: core key {ck} has numeric value {val} but is listed in missingNutrientKeys")

        # Provenance checks
        src = item.get("sourceId")
        ver = item.get("verificationStatus")
        src_rec = item.get("sourceRecordId")
        if src not in VALID_SOURCE_IDS:
            errors.append(f"{item_id}: unknown sourceId {src}")
        if src == "usda_fdc":
            allowed_ver = ("verified_standard", "recipe_based") if not str(code or "").startswith("RP-") else ("verified_standard",)
            if ver not in allowed_ver:
                errors.append(f"{item_id}: usda_fdc must have verificationStatus in {allowed_ver}, got '{ver}'")
            if not src_rec or not re.match(r"^\d{5,6}$", str(src_rec)):
                errors.append(f"{item_id}: usda_fdc must have 5-6 digit sourceRecordId, got '{src_rec}'")
        elif src == "regimeplan_2026":
            if ver != "clinic_reviewed":
                errors.append(f"{item_id}: regimeplan_2026 must have verificationStatus='clinic_reviewed', got '{ver}'")
            if src_rec is not None:
                errors.append(f"{item_id}: regimeplan_2026 must not carry institutional sourceRecordId '{src_rec}'")
        elif src == "clinic_reviewed":
            if ver not in ("clinic_reviewed", "recipe_based"):
                errors.append(f"{item_id}: clinic_reviewed source has invalid verificationStatus '{ver}'")
            if src_rec is not None:
                errors.append(f"{item_id}: clinic_reviewed source must not carry institutional sourceRecordId '{src_rec}'")

    # English name quality guard (no bare prep-only names or raw untranslated fallback strings)
    prep_only_words = {"raw", "cooked", "boiled", "grilled", "baked", "roasted", "fried", "canned", "dried", "smoked", "minced", "ground", "/", "skinless"}
    for item in all_items:
        en = (item.get("nameEn") or "").strip()
        ar = (item.get("nameAr") or "").strip()
        if not en or not ar:
            errors.append(f"{item.get('id')}: missing bilingual nameEn or nameAr")
            continue
        words = set(en.lower().split())
        if words.issubset(prep_only_words) or "Meat Product (" in en:
            errors.append(f"{item.get('id')} ({item.get('code')}): invalid placeholder/prep-only English name '{en}'")

    # Specific clinical sentinel assertions
    by_code = {it.get("code"): it for it in all_items if it.get("code")}
    for sentinel_code, check_fn, msg in [
        ("RP-FT-082", lambda x: x["nutrients100g"]["caloriesKcal"] < 600 and x["nutrients100g"]["proteinG"] >= 20 and x["nutrients100g"]["carbsG"] >= 10, "Raw peanuts must have authentic analytical composition"),
        ("RP-FT-033", lambda x: x["nutrients100g"]["proteinG"] >= 20 and x["nutrients100g"]["carbsG"] >= 15, "Raw almonds must have non-zero protein & carbs"),
        ("RP-ST-128", lambda x: x["nutrients100g"]["proteinG"] == 0 and x["nutrients100g"]["fatG"] == 0 and x["nutrients100g"]["carbsG"] >= 99, "Powdered sugar must have 0P/0F"),
        ("RP-DA-013", lambda x: x["nutrients100g"]["fatG"] < 2.0 and x["nutrients100g"]["proteinG"] >= 30, "Nonfat dry milk powder must have <2g fat & >=30g protein"),
        ("RP-DA-012", lambda x: x["nutrients100g"]["fatG"] < 2.0 and x["nutrients100g"]["carbsG"] >= 4.0, "Nonfat buttermilk must have <2g fat & >=4g carbs"),
        ("RP-MT-191", lambda x: x["nutrients100g"]["carbsG"] > 0 and x["nutrients100g"]["fatG"] < 15, "Boiled egg must have realistic carbs & fat"),
        ("RP-MT-165", lambda x: x["nutrients100g"]["carbsG"] > 10, "Breaded chicken must have >10g/100g carbs"),
        ("RP-MT-016", lambda x: x.get("preparationState") == "raw", "Dry chickpea flour must have preparationState=raw"),
    ]:
        rec = by_code.get(sentinel_code)
        if not rec or not check_fn(rec):
            errors.append(f"Sentinel check failed for {sentinel_code}: {msg}")

    if errors:
        print("\nCATALOG VALIDATION FAILED:")
        for e in errors[:40]:
            print(f"  - {e}")
        if len(errors) > 40:
            print(f"  ... and {len(errors) - 40} more errors.")
        sys.exit(1)


def run_generators():
    print("=" * 70)
    print("NUTRITION CLINIC PRO — MASTER FOOD CATALOG GENERATION PIPELINE")
    print("=" * 70)

    category_counts = {}
    all_items = []

    for name, script_name, out_file in GENERATOR_SCRIPTS:
        script_path = os.path.join(SCRIPTS_DIR, script_name)
        if not os.path.exists(script_path):
            print(f"ERROR: Generator script {script_path} not found.")
            sys.exit(1)

        print(f"\n[Running] {name} ({script_name})...")
        res = subprocess.run([sys.executable, script_path], cwd=BASE_DIR, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"FAILED: {script_name} exited with code {res.returncode}")
            print(res.stderr)
            sys.exit(res.returncode)

        # Print script output
        for line in res.stdout.strip().split("\n"):
            if line:
                print(f"  {line}")

        out_path = os.path.join(DATA_DIR, out_file)
        if not os.path.exists(out_path):
            print(f"ERROR: Output file {out_path} was not generated.")
            sys.exit(1)

        with open(out_path, "r", encoding="utf-8") as f:
            content = f.read()
        marker = "FoodItemRecord[] = "
        idx = content.find(marker)
        if idx < 0:
            print(f"ERROR: Missing expected TypeScript array marker in {out_file}")
            sys.exit(1)

        json_text = content[idx + len(marker):].rstrip().rstrip(";")
        try:
            items = json.loads(json_text)
        except Exception as e:
            print(f"ERROR: Could not parse items in {out_file}: {e}")
            sys.exit(1)

        if not isinstance(items, list) or len(items) == 0:
            print(f"ERROR: Generated dataset {out_file} is empty or not a list.")
            sys.exit(1)

        category_counts[name] = len(items)
        all_items.extend(items)

    validate_catalog(all_items)

    print("\n" + "=" * 70)
    print("CATALOG GENERATION SUMMARY:")
    print("=" * 70)
    total_items = 0
    for name, count in category_counts.items():
        print(f"  - {name:<32}: {count:>4} items")
        total_items += count

    print("-" * 70)
    print(f"  Total Compiled Category Items   : {total_items:>4} items")
    print("  Catalog-Wide Validation         : PASSED (0 errors)")
    print("=" * 70)
    print("Deterministic catalog generation completed successfully.\n")

if __name__ == "__main__":
    run_generators()
