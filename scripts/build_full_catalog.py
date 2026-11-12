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

def run_generators():
    print("=" * 70)
    print("NUTRITION CLINIC PRO — MASTER FOOD CATALOG GENERATION PIPELINE")
    print("=" * 70)

    category_counts = {}

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

        # Parse item count
        with open(out_path, "r", encoding="utf-8") as f:
            content = f.read()
        marker = "FoodItemRecord[] = "
        idx = content.find(marker)
        if idx >= 0:
            json_text = content[idx + len(marker):].rstrip().rstrip(";")
            try:
                items = json.loads(json_text)
                category_counts[name] = len(items)
            except Exception as e:
                print(f"WARNING: Could not parse items in {out_file}: {e}")

    print("\n" + "=" * 70)
    print("CATALOG GENERATION SUMMARY:")
    print("=" * 70)
    total_items = 0
    for name, count in category_counts.items():
        print(f"  - {name:<32}: {count:>4} items")
        total_items += count

    print("-" * 70)
    print(f"  Total Compiled Category Items   : {total_items:>4} items")
    print("=" * 70)
    print("Deterministic catalog generation completed successfully.\n")

if __name__ == "__main__":
    run_generators()
