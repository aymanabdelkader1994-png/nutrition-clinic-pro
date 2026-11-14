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
import ast
import subprocess
import json
import argparse
import hashlib
import shutil
import tempfile
import math
import re

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

CORE_TRACKED_KEYS = [
    "caloriesKcal", "carbsG", "proteinG", "fatG",
    "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG",
    "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg",
    "calciumMg", "ironMg", "waterG",
]

NUTRIENT_REQUIRED_KEYS = [
    "basisWeightG", "caloriesKcal", "carbsG", "proteinG", "fatG", "missingNutrientKeys",
]

VALID_SOURCE_IDS = {"usda_fdc", "egyptian_nni_2006", "regimeplan_2026", "clinic_reviewed"}
VALID_COMPOSITION_BASES = {"analytical_table", "clinic_estimated", "recipe_based", "exchange_only"}

FORBIDDEN_MACRO_TABLE_NAMES = {
    "MACROS", "LEG_MACRO", "FAT_MACRO", "EXCHANGE_MACROS",
    "STARCH_MACROS", "FRUIT_MACROS", "VEG_MACROS", "DAIRY_MACROS", "MEAT_MACROS",
}
MACRO_KEY_LITERALS = {"caloriesKcal", "carbsG", "proteinG", "fatG"}
WEIGHT_VAR_NAMES = {"W", "w", "weight", "w_gram", "gram_weight"}


def _ast_names_and_strs(node):
    names = set()
    strs = set()
    for sub in ast.walk(node):
        if isinstance(sub, ast.Name):
            names.add(sub.id)
        elif isinstance(sub, ast.Constant) and isinstance(sub.value, str):
            strs.add(sub.value)
    return names, strs


def validate_generator_scripts_ast(scripts_dir):
    """Static AST guard forbidding exchange-macro division in all category generators."""
    violations = []
    for _, script_name, _ in GENERATOR_SCRIPTS:
        script_path = os.path.join(scripts_dir, script_name)
        if not os.path.exists(script_path):
            continue
        with open(script_path, "r", encoding="utf-8") as f:
            src = f.read()
        tree = ast.parse(src, filename=script_name)
        for node in ast.walk(tree):
            if isinstance(node, ast.Name) and node.id in FORBIDDEN_MACRO_TABLE_NAMES:
                violations.append(
                    f"{script_name}:{getattr(node, 'lineno', '?')}: forbidden generic exchange macro identifier '{node.id}'"
                )
            elif isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Div, ast.FloorDiv)):
                left_names, left_strs = _ast_names_and_strs(node.left)
                right_names, _ = _ast_names_and_strs(node.right)
                divides_by_weight = bool(right_names & WEIGHT_VAR_NAMES)
                references_forbidden = bool(left_names & FORBIDDEN_MACRO_TABLE_NAMES)
                references_macro_key = bool(left_strs & MACRO_KEY_LITERALS)
                if references_forbidden or (divides_by_weight and references_macro_key):
                    violations.append(
                        f"{script_name}:{getattr(node, 'lineno', '?')}: forbidden exchange-macro division expression"
                    )
    if violations:
        print("\nSTATIC AST GUARD FAILED (FORBIDDEN EXCHANGE-MACRO DERIVATION DETECTED):")
        for v in violations:
            print(f"  - {v}")
        sys.exit(1)


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

        comp_basis = item.get("compositionBasis")
        if comp_basis not in VALID_COMPOSITION_BASES:
            errors.append(f"{item_id}: invalid or missing compositionBasis {comp_basis!r}")

        kcal = n100.get("caloriesKcal")
        carbs = n100.get("carbsG")
        prot = n100.get("proteinG")
        fat = n100.get("fatG")
        avail_carbs = n100.get("availableCarbsG")

        if comp_basis == "exchange_only":
            if avail_carbs is not None:
                errors.append(f"{item_id}: exchange_only item must have availableCarbsG=None (got {avail_carbs})")
            for key in CORE_TRACKED_KEYS:
                if n100.get(key) is not None:
                    errors.append(f"{item_id}: exchange_only item must have {key}=None (got {n100.get(key)})")
        else:
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

        # Provenance & compositionBasis consistency checks
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
            if comp_basis != "analytical_table":
                errors.append(f"{item_id}: usda_fdc must have compositionBasis='analytical_table', got '{comp_basis}'")
        elif src == "egyptian_nni_2006":
            if comp_basis != "analytical_table":
                errors.append(f"{item_id}: egyptian_nni_2006 must have compositionBasis='analytical_table', got '{comp_basis}'")
        elif src == "regimeplan_2026":
            if ver != "clinic_reviewed":
                errors.append(f"{item_id}: regimeplan_2026 must have verificationStatus='clinic_reviewed', got '{ver}'")
            if src_rec is not None:
                errors.append(f"{item_id}: regimeplan_2026 must not carry institutional sourceRecordId '{src_rec}'")
            if comp_basis != "exchange_only":
                errors.append(f"{item_id}: regimeplan_2026 must have compositionBasis='exchange_only', got '{comp_basis}'")
        elif src == "clinic_reviewed":
            if ver not in ("clinic_reviewed", "recipe_based"):
                errors.append(f"{item_id}: clinic_reviewed source has invalid verificationStatus '{ver}'")
            if src_rec is not None:
                errors.append(f"{item_id}: clinic_reviewed source must not carry institutional sourceRecordId '{src_rec}'")
            if comp_basis == "exchange_only":
                errors.append(f"{item_id}: clinic_reviewed item cannot have compositionBasis='exchange_only'")

    # English name quality guard (no bare prep-only names, mistranslated generic placeholders, or fallback strings)
    prep_only_words = {"raw", "cooked", "boiled", "grilled", "baked", "roasted", "fried", "canned", "dried", "smoked", "minced", "ground", "/", "skinless"}
    duplicate_descriptor_pairs = [
        ("smoked", "smoked"),
        ("raw", "raw"),
        ("cooked", "cooked"),
        ("grilled", "grilled"),
        ("fried", "fried"),
        ("baked", "baked"),
        ("beef", "beef"),
    ]
    for item in all_items:
        en = (item.get("nameEn") or "").strip()
        ar = (item.get("nameAr") or "").strip()
        if not en or not ar:
            errors.append(f"{item.get('id')}: missing bilingual nameEn or nameAr")
            continue
        words_list = en.lower().split()
        words = set(words_list)
        if (
            words.issubset(prep_only_words)
            or "Meat Product (" in en
            or "Untranslated" in en
            or "Meat / Beef" in en
        ):
            errors.append(f"{item.get('id')} ({item.get('code')}): invalid placeholder/mistranslated English name '{en}'")
        for w1, w2 in duplicate_descriptor_pairs:
            if words_list.count(w1) > 1 or any(words_list[i] == w1 and words_list[i + 1] == w2 for i in range(len(words_list) - 1)):
                errors.append(f"{item.get('id')} ({item.get('code')}): duplicate descriptor word '{w1}' in '{en}'")

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
        ("RP-MT-118", lambda x: x.get("preparationState") == "dried", "Dry TVP must have preparationState=dried"),
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


def _snapshot_hashes(target_dir, filenames):
    hashes = {}
    for fn in filenames:
        p = os.path.join(target_dir, fn)
        if os.path.exists(p):
            h = hashlib.sha256()
            with open(p, "rb") as f:
                h.update(f.read())
            hashes[fn] = h.hexdigest()
        else:
            hashes[fn] = None
    return hashes


def _validate_category_items(out_file, items):
    if not isinstance(items, list) or len(items) == 0:
        raise ValueError(f"Generated dataset {out_file} is empty or not a list.")
    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError(f"{out_file}[{idx}]: expected object, got {type(item).__name__}")
        for req in ("id", "sourceId", "nameEn", "nameAr", "foodGroupId", "primaryExchangeCategoryId", "preparationState", "verificationStatus", "nutrients100g", "portions"):
            if req not in item:
                raise ValueError(f"{out_file}[{idx}] ({item.get('id', '?')}): missing required field '{req}'")


def publish_catalog_transaction(staging_dir, data_dir, filenames, simulate_fail_after=None):
    """
    Publishes all staged catalog files as a single transactional batch.
    Backs up existing targets and restores the exact prior state if any step fails.
    """
    os.makedirs(data_dir, exist_ok=True)
    backup_dir = tempfile.mkdtemp(prefix="ncp_catalog_backup_")
    existed_before = {}
    tmp_paths = []
    try:
        # 1. Backup existing production files
        for fn in filenames:
            dst = os.path.join(data_dir, fn)
            existed_before[fn] = os.path.exists(dst)
            if existed_before[fn]:
                shutil.copy2(dst, os.path.join(backup_dir, fn))

        # 2. Write temporary files inside target data_dir before replacing
        for fn in filenames:
            src = os.path.join(staging_dir, fn)
            if not os.path.exists(src):
                raise FileNotFoundError(f"Staged file missing prior to publish: {src}")
            tmp_dst = os.path.join(data_dir, f".tmp_{fn}")
            tmp_paths.append(tmp_dst)
            with open(src, "rb") as rf:
                payload = rf.read()
            with open(tmp_dst, "wb") as wf:
                wf.write(payload)
                wf.flush()
                os.fsync(wf.fileno())

        # 3. Promote all files via os.replace; roll back everything if any replace fails
        for idx, fn in enumerate(filenames):
            if simulate_fail_after is not None and idx >= simulate_fail_after:
                raise RuntimeError(f"Simulated transactional publish failure before {fn}")
            tmp_dst = os.path.join(data_dir, f".tmp_{fn}")
            dst = os.path.join(data_dir, fn)
            os.replace(tmp_dst, dst)
    except Exception as pub_err:
        print(f"\nPUBLICATION FAILED ({pub_err}); ROLLING BACK ALL CATALOG FILES...")
        for fn in filenames:
            dst = os.path.join(data_dir, fn)
            bak = os.path.join(backup_dir, fn)
            if existed_before.get(fn) and os.path.exists(bak):
                shutil.copy2(bak, dst)
            elif not existed_before.get(fn) and os.path.exists(dst):
                os.remove(dst)
        raise
    finally:
        for tp in tmp_paths:
            if os.path.exists(tp):
                try:
                    os.remove(tp)
                except OSError:
                    pass
        shutil.rmtree(backup_dir, ignore_errors=True)


def run_generators(scripts_dir=SCRIPTS_DIR, data_dir=DATA_DIR, staging_dir_override=None, simulate_publish_fail_after=None):
    print("=" * 70)
    print("NUTRITION CLINIC PRO — STAGED & TRANSACTIONAL CATALOG PIPELINE")
    print("=" * 70)

    out_files = [item[2] for item in GENERATOR_SCRIPTS]

    # Pre-flight: ensure all expected generators exist before staging
    for _, script_name, _ in GENERATOR_SCRIPTS:
        script_path = os.path.join(scripts_dir, script_name)
        if not os.path.exists(script_path):
            print(f"ERROR: Generator script {script_path} not found.")
            sys.exit(1)

    # Pre-flight static AST guard against exchange-macro division
    validate_generator_scripts_ast(scripts_dir)

    pre_hashes = _snapshot_hashes(data_dir, out_files)

    managed_temp = staging_dir_override is None
    staging_dir = staging_dir_override or tempfile.mkdtemp(prefix="ncp_catalog_stage_")
    os.makedirs(staging_dir, exist_ok=True)

    category_counts = {}
    all_items = []

    try:
        # Stage 1: Execute all category generators inside isolated staging_dir
        for name, script_name, out_file in GENERATOR_SCRIPTS:
            script_path = os.path.join(scripts_dir, script_name)
            print(f"\n[Staging] {name} ({script_name}) -> {os.path.join(staging_dir, out_file)}")
            env = os.environ.copy()
            env["NCP_CATALOG_OUT_DIR"] = staging_dir
            res = subprocess.run([sys.executable, script_path], cwd=BASE_DIR, env=env, capture_output=True, text=True)
            if res.returncode != 0:
                print(f"FAILED: {script_name} exited with code {res.returncode}")
                if res.stderr:
                    print(res.stderr)
                sys.exit(res.returncode)

            for line in res.stdout.strip().split("\n"):
                if line:
                    print(f"  {line}")

            staged_path = os.path.join(staging_dir, out_file)
            if not os.path.exists(staged_path):
                print(f"ERROR: Expected staged output file {staged_path} was not generated.")
                sys.exit(1)

            with open(staged_path, "r", encoding="utf-8") as f:
                content = f.read()
            marker = "FoodItemRecord[] = "
            idx = content.find(marker)
            if idx < 0:
                print(f"ERROR: Missing expected TypeScript array marker in staged {out_file}")
                sys.exit(1)

            json_text = content[idx + len(marker):].rstrip().rstrip(";")
            try:
                items = json.loads(json_text)
            except Exception as e:
                print(f"ERROR: Could not parse JSON items in staged {out_file}: {e}")
                sys.exit(1)

            try:
                _validate_category_items(out_file, items)
            except ValueError as e:
                print(f"ERROR: Category validation failed for staged {out_file}: {e}")
                sys.exit(1)

            category_counts[name] = len(items)
            all_items.extend(items)

        # Ensure no generator bypassed staging to alter production files prematurely
        mid_hashes = _snapshot_hashes(data_dir, out_files)
        if mid_hashes != pre_hashes:
            print("ERROR: A category generator modified production data_dir directly during staged run!")
            sys.exit(1)

        # Stage 2: Combined catalog validation BEFORE publishing any file
        validate_catalog(all_items)

        # Stage 3: Atomic transactional publication into production data_dir
        try:
            publish_catalog_transaction(
                staging_dir,
                data_dir,
                out_files,
                simulate_fail_after=simulate_publish_fail_after,
            )
        except Exception as e:
            print(f"ERROR: Transactional publication aborted and rolled back cleanly: {e}")
            sys.exit(1)

        print("\n" + "=" * 70)
        print("CATALOG PIPELINE REPORT:")
        print("=" * 70)
        total_items = 0
        for name, count in category_counts.items():
            print(f"  - {name:<32}: {count:>4} items")
            total_items += count

        print("-" * 70)
        print(f"  Total Compiled Category Items   : {total_items:>4} items")
        print("  Stage 1 — Staged Generation     : SUCCEEDED (8/8 modules isolated)")
        print("  Stage 2 — Catalog Validation    : PASSED (0 errors)")
        print("  Stage 3 — Safe Publication      : SUCCEEDED (transactional commit)")
        print("  Stage 4 — Reproducibility Check : NOT EXECUTED (verify separately via dual isolated runs)")
        print("=" * 70 + "\n")
    finally:
        if managed_temp:
            shutil.rmtree(staging_dir, ignore_errors=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Nutrition Clinic Pro Failure-Safe Catalog Generator")
    parser.add_argument("--scripts-dir", default=SCRIPTS_DIR, help="Path to generator scripts directory")
    parser.add_argument("--data-dir", default=DATA_DIR, help="Target publication directory")
    parser.add_argument("--simulate-publish-fail-after", type=int, default=None, help="Inject simulated publish failure after N files (testing only)")
    args = parser.parse_args()
    run_generators(
        scripts_dir=os.path.abspath(args.scripts_dir),
        data_dir=os.path.abspath(args.data_dir),
        simulate_publish_fail_after=args.simulate_publish_fail_after,
    )
