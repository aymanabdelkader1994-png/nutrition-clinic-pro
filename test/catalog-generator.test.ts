/**
 * Nutrition Clinic Pro - Master Catalog Pipeline, Semantic Meat Translation & Release-Gate Audit Tests
 *
 * Covers:
 * - Task A: Staged isolation, validation failures, and transactional rollback (9 failure modes)
 * - Task B: Deterministic semantic Arabic-to-English meat/seafood translation + negative guards + 200-item catalog check
 * - Task C: Provenance attribution, exchange-vs-analytical separation, and sentinel accuracy across all 676 records
 * - Task D: Dual-run isolated reproducibility SHA-256 verification (0 byte differences)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

import {
  getAllFoodItems,
  getFoodItemById,
  calculatePortionNutrients,
  scaleNutrientProfile,
  DATA_SOURCES,
} from '../src/clinical/index';

const REPO_ROOT = path.resolve(process.cwd());
const SCRIPTS_DIR = path.join(REPO_ROOT, 'scripts');
const PROD_BUILD_SCRIPT = path.join(SCRIPTS_DIR, 'build_full_catalog.py');

const GENERATOR_FILES = [
  'gen_starches.py',
  'gen_fruits.py',
  'gen_dairy.py',
  'gen_occasions.py',
  'gen_vegetables.py',
  'gen_legumes.py',
  'gen_meats.py',
  'gen_fats.py',
];

const OUTPUT_TS_FILES = [
  'starches.ts',
  'fruits.ts',
  'dairy.ts',
  'occasions.ts',
  'vegetables.ts',
  'legumes.ts',
  'meats.ts',
  'fats.ts',
];

function sha256File(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function snapshotDirHashes(dirPath: string, files: string[]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const fn of files) {
    out[fn] = sha256File(path.join(dirPath, fn));
  }
  return out;
}

function makeTempSandbox(): { root: string; scriptsDir: string; dataDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ncp_gate_test_'));
  const scriptsDir = path.join(root, 'scripts');
  const dataDir = path.join(root, 'data');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });

  // Copy real scripts and original_30_grouped.json into sandbox scriptsDir; symlink read-only public assets
  for (const fn of GENERATOR_FILES) {
    fs.copyFileSync(path.join(SCRIPTS_DIR, fn), path.join(scriptsDir, fn));
  }
  fs.copyFileSync(path.join(SCRIPTS_DIR, 'original_30_grouped.json'), path.join(scriptsDir, 'original_30_grouped.json'));
  fs.copyFileSync(PROD_BUILD_SCRIPT, path.join(scriptsDir, 'build_full_catalog.py'));
  fs.symlinkSync(path.join(REPO_ROOT, 'public'), path.join(root, 'public'), 'dir');

  // Seed initial sentinel data files in dataDir to detect unintended mutations or rollbacks
  for (const fn of OUTPUT_TS_FILES) {
    fs.writeFileSync(path.join(dataDir, fn), `// INITIAL_SENTINEL_${fn}\nexport const SEED = [];\n`, 'utf-8');
  }

  return { root, scriptsDir, dataDir };
}

function runPythonTranslations(inputs: string[]): Record<string, string> {
  const pyCode = `
import json, sys
sys.path.insert(0, ${JSON.stringify(REPO_ROOT)})
from scripts.gen_meats import translate_name
inputs = json.loads(sys.argv[1])
print(json.dumps({s: translate_name(s) for s in inputs}, ensure_ascii=False))
`;
  const res = spawnSync('python3', ['-c', pyCode, JSON.stringify(inputs)], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
  });
  assert.equal(res.status, 0, `Python translation call failed: ${res.stderr}`);
  return JSON.parse(res.stdout.trim());
}

describe('Task A: Catalog Pipeline Failure Isolation & Transactional Rollback', () => {
  it('aborts cleanly with intact production hashes when a generator script is missing', () => {
    const sb = makeTempSandbox();
    try {
      const before = snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES);
      fs.unlinkSync(path.join(sb.scriptsDir, 'gen_fats.py'));

      const res = spawnSync(
        'python3',
        [path.join(sb.scriptsDir, 'build_full_catalog.py'), '--scripts-dir', sb.scriptsDir, '--data-dir', sb.dataDir],
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      );
      assert.notEqual(res.status, 0);
      assert.deepEqual(snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES), before);
    } finally {
      fs.rmSync(sb.root, { recursive: true, force: true });
    }
  });

  it('prevents partial catalog updates when a later generator exits non-zero', () => {
    const sb = makeTempSandbox();
    try {
      const before = snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES);
      // Replace gen_fats.py (8th script) with failing generator after 7 generators succeed in staging
      fs.writeFileSync(
        path.join(sb.scriptsDir, 'gen_fats.py'),
        'import sys\nsys.stderr.write("Injected generator failure\\n")\nsys.exit(2)\n',
        'utf-8'
      );

      const res = spawnSync(
        'python3',
        [path.join(sb.scriptsDir, 'build_full_catalog.py'), '--scripts-dir', sb.scriptsDir, '--data-dir', sb.dataDir],
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      );
      assert.notEqual(res.status, 0);
      assert.deepEqual(snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES), before);
    } finally {
      fs.rmSync(sb.root, { recursive: true, force: true });
    }
  });

  it('rejects a generator that exits 0 without producing its expected staged file', () => {
    const sb = makeTempSandbox();
    try {
      const before = snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES);
      fs.writeFileSync(path.join(sb.scriptsDir, 'gen_legumes.py'), 'print("Done without writing")\n', 'utf-8');

      const res = spawnSync(
        'python3',
        [path.join(sb.scriptsDir, 'build_full_catalog.py'), '--scripts-dir', sb.scriptsDir, '--data-dir', sb.dataDir],
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      );
      assert.notEqual(res.status, 0);
      assert.deepEqual(snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES), before);
    } finally {
      fs.rmSync(sb.root, { recursive: true, force: true });
    }
  });

  it('rejects malformed JSON output in a staged file before touching data_dir', () => {
    const sb = makeTempSandbox();
    try {
      const before = snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES);
      fs.writeFileSync(
        path.join(sb.scriptsDir, 'gen_dairy.py'),
        [
          'import os',
          'out = os.path.join(os.environ["NCP_CATALOG_OUT_DIR"], "dairy.ts")',
          'with open(out, "w", encoding="utf-8") as f:',
          '    f.write("export const DAIRY: FoodItemRecord[] = [{broken json;")',
        ].join('\n'),
        'utf-8'
      );

      const res = spawnSync(
        'python3',
        [path.join(sb.scriptsDir, 'build_full_catalog.py'), '--scripts-dir', sb.scriptsDir, '--data-dir', sb.dataDir],
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      );
      assert.notEqual(res.status, 0);
      assert.ok(res.stdout.includes('Could not parse JSON items'), `Unexpected stdout: ${res.stdout}\n${res.stderr}`);
      assert.deepEqual(snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES), before);
    } finally {
      fs.rmSync(sb.root, { recursive: true, force: true });
    }
  });

  it('rejects an empty category array before touching data_dir', () => {
    const sb = makeTempSandbox();
    try {
      const before = snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES);
      fs.writeFileSync(
        path.join(sb.scriptsDir, 'gen_vegetables.py'),
        [
          'import os',
          'out = os.path.join(os.environ["NCP_CATALOG_OUT_DIR"], "vegetables.ts")',
          'with open(out, "w", encoding="utf-8") as f:',
          '    f.write("export const VEG: FoodItemRecord[] = [];")',
        ].join('\n'),
        'utf-8'
      );

      const res = spawnSync(
        'python3',
        [path.join(sb.scriptsDir, 'build_full_catalog.py'), '--scripts-dir', sb.scriptsDir, '--data-dir', sb.dataDir],
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      );
      assert.notEqual(res.status, 0);
      assert.ok(res.stdout.includes('is empty or not a list'), `Unexpected stdout: ${res.stdout}\n${res.stderr}`);
      assert.deepEqual(snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES), before);
    } finally {
      fs.rmSync(sb.root, { recursive: true, force: true });
    }
  });

  it('rejects invalid required fields without corrupting data_dir', () => {
    const sb = makeTempSandbox();
    try {
      const before = snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES);
      // Inject invalid record missing proteinG into gen_occasions.py
      fs.writeFileSync(
        path.join(sb.scriptsDir, 'gen_occasions.py'),
        [
          'import os, json',
          'out = os.path.join(os.environ["NCP_CATALOG_OUT_DIR"], "occasions.ts")',
          'bad = [{',
          '  "id": "food_bad_1",',
          '  "sourceId": "clinic_reviewed",',
          '  "nameEn": "Valid Name",',
          '  "nameAr": "اسم",',
          '  "foodGroupId": "occasions",',
          '  "primaryExchangeCategoryId": "combination_food",',
          '  "preparationState": "cooked",',
          '  "verificationStatus": "clinic_reviewed",',
          '  "compositionBasis": "clinic_estimated",',
          '  "nutrients100g": {"basisWeightG": 100, "caloriesKcal": 100, "carbsG": 10, "fatG": 2, "missingNutrientKeys": []},',
          '  "portions": [{"id": "p1", "gramWeight": 50}]',
          '}]',
          'with open(out, "w", encoding="utf-8") as f:',
          '    f.write("export const OCC: FoodItemRecord[] = " + json.dumps(bad) + ";")',
        ].join('\n'),
        'utf-8'
      );

      const resInvalidField = spawnSync(
        'python3',
        [path.join(sb.scriptsDir, 'build_full_catalog.py'), '--scripts-dir', sb.scriptsDir, '--data-dir', sb.dataDir],
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      );
      assert.notEqual(resInvalidField.status, 0);
      assert.ok(
        resInvalidField.stdout.includes('nutrients100g missing required key proteinG'),
        `Unexpected stdout: ${resInvalidField.stdout}\n${resInvalidField.stderr}`
      );
      assert.deepEqual(snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES), before);
    } finally {
      fs.rmSync(sb.root, { recursive: true, force: true });
    }
  });

  it('rejects duplicate record IDs and combined catalog count mismatch before touching data_dir', () => {
    const sb = makeTempSandbox();
    try {
      const before = snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES);
      fs.writeFileSync(
        path.join(sb.scriptsDir, 'gen_occasions.py'),
        [
          'import os, json',
          'out = os.path.join(os.environ["NCP_CATALOG_OUT_DIR"], "occasions.ts")',
          'dup_item = {',
          '  "id": "food_dup_id_test",',
          '  "code": "RP-DUP-1",',
          '  "sourceId": "clinic_reviewed",',
          '  "nameEn": "Dup One",',
          '  "nameAr": "مكرر",',
          '  "foodGroupId": "occasions",',
          '  "primaryExchangeCategoryId": "combination_food",',
          '  "preparationState": "cooked",',
          '  "verificationStatus": "clinic_reviewed",',
          '  "compositionBasis": "clinic_estimated",',
          '  "nutrients100g": {"basisWeightG": 100, "caloriesKcal": 100, "carbsG": 10, "proteinG": 5, "fatG": 2, "fiberG": 0, "saturatedFatG": 0, "transFatG": 0, "monounsaturatedFatG": 0, "polyunsaturatedFatG": 0, "cholesterolMg": 0, "sodiumMg": 0, "potassiumMg": 0, "calciumMg": 0, "ironMg": 0, "waterG": 80, "missingNutrientKeys": []},',
          '  "portions": [{"id": "p_dup_1", "gramWeight": 50}]',
          '}',
          'dup_item2 = dict(dup_item, code="RP-DUP-2", portions=[{"id": "p_dup_2", "gramWeight": 50}])',
          'with open(out, "w", encoding="utf-8") as f:',
          '    f.write("export const OCC: FoodItemRecord[] = " + json.dumps([dup_item, dup_item2]) + ";")',
        ].join('\n'),
        'utf-8'
      );

      const resDup = spawnSync(
        'python3',
        [path.join(sb.scriptsDir, 'build_full_catalog.py'), '--scripts-dir', sb.scriptsDir, '--data-dir', sb.dataDir],
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      );
      assert.notEqual(resDup.status, 0);
      assert.ok(
        resDup.stdout.includes('Duplicate item id: food_dup_id_test'),
        `Unexpected stdout: ${resDup.stdout}\n${resDup.stderr}`
      );
      assert.deepEqual(snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES), before);
    } finally {
      fs.rmSync(sb.root, { recursive: true, force: true });
    }
  });

  it('rolls back all files cleanly when a mid-publish failure occurs after N file replacements', () => {
    const sb = makeTempSandbox();
    try {
      const before = snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES);

      // All 8 real generators run & pass validation, then publication fails halfway after 4 files
      const res = spawnSync(
        'python3',
        [
          path.join(sb.scriptsDir, 'build_full_catalog.py'),
          '--scripts-dir',
          sb.scriptsDir,
          '--data-dir',
          sb.dataDir,
          '--simulate-publish-fail-after',
          '4',
        ],
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      );

      assert.notEqual(res.status, 0, 'Simulated mid-publish failure must exit non-zero');
      assert.ok(
        res.stdout.includes('Simulated transactional publish failure') && res.stdout.includes('ROLLING BACK ALL CATALOG FILES'),
        `Rollback did not actually execute after full validation! Output:\n${res.stdout}\n${res.stderr}`
      );
      // All 8 files (including the first 4 that were replaced before failure!) must match exact initial SHA-256 hashes
      assert.deepEqual(snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES), before);

      // No leftover .tmp_* files in dataDir
      const entries = fs.readdirSync(sb.dataDir);
      assert.equal(
        entries.some((e) => e.startsWith('.tmp_')),
        false,
        `Leftover temp files found after rollback: ${entries.join(', ')}`
      );
    } finally {
      fs.rmSync(sb.root, { recursive: true, force: true });
    }
  });

  it('rejects exchange-macro division in any generator via static AST guard before execution', () => {
    const sb = makeTempSandbox();
    try {
      const before = snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES);
      fs.writeFileSync(
        path.join(sb.scriptsDir, 'gen_meats.py'),
        [
          'MACROS = {"meat_lean": {"caloriesKcal": 46, "carbsG": 0, "proteinG": 7, "fatG": 2}}',
          'w = 30.0',
          'kcal100 = (MACROS["meat_lean"]["caloriesKcal"] / w) * 100',
        ].join('\n'),
        'utf-8'
      );

      const res = spawnSync(
        'python3',
        [path.join(sb.scriptsDir, 'build_full_catalog.py'), '--scripts-dir', sb.scriptsDir, '--data-dir', sb.dataDir],
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      );
      assert.notEqual(res.status, 0);
      assert.ok(res.stdout.includes('STATIC AST GUARD FAILED'), `Expected AST guard failure, got:\n${res.stdout}\n${res.stderr}`);
      assert.deepEqual(snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES), before);
    } finally {
      fs.rmSync(sb.root, { recursive: true, force: true });
    }
  });

  it('rejects exchange_only records with numeric or zeroed macros in validate_catalog', () => {
    const sb = makeTempSandbox();
    try {
      const before = snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES);
      fs.writeFileSync(
        path.join(sb.scriptsDir, 'gen_occasions.py'),
        [
          'import os, json',
          'out = os.path.join(os.environ["NCP_CATALOG_OUT_DIR"], "occasions.ts")',
          'bad_ex = [{',
          '  "id": "food_bad_ex_zero",',
          '  "code": "RP-EX-BAD",',
          '  "sourceId": "regimeplan_2026",',
          '  "nameEn": "Invalid Exchange Zero",',
          '  "nameAr": "بديل غير صالح",',
          '  "foodGroupId": "occasions",',
          '  "primaryExchangeCategoryId": "combination_food",',
          '  "preparationState": "cooked",',
          '  "verificationStatus": "clinic_reviewed",',
          '  "compositionBasis": "exchange_only",',
          '  "nutrients100g": {"basisWeightG": 100, "caloriesKcal": 0, "carbsG": None, "proteinG": None, "fatG": None, "availableCarbsG": None, "fiberG": None, "saturatedFatG": None, "transFatG": None, "monounsaturatedFatG": None, "polyunsaturatedFatG": None, "cholesterolMg": None, "sodiumMg": None, "potassiumMg": None, "calciumMg": None, "ironMg": None, "waterG": None, "missingNutrientKeys": ["carbsG", "proteinG", "fatG", "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG", "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg", "calciumMg", "ironMg", "waterG"]},',
          '  "portions": [{"id": "p_bad_ex_1", "gramWeight": 30}]',
          '}]',
          'with open(out, "w", encoding="utf-8") as f:',
          '    f.write("export const OCC: FoodItemRecord[] = " + json.dumps(bad_ex) + ";")',
        ].join('\n'),
        'utf-8'
      );

      const res = spawnSync(
        'python3',
        [path.join(sb.scriptsDir, 'build_full_catalog.py'), '--scripts-dir', sb.scriptsDir, '--data-dir', sb.dataDir],
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      );
      assert.notEqual(res.status, 0);
      assert.ok(
        res.stdout.includes('exchange_only item must have caloriesKcal=None'),
        `Expected exchange_only rejection, got:\n${res.stdout}\n${res.stderr}`
      );
      assert.deepEqual(snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES), before);
    } finally {
      fs.rmSync(sb.root, { recursive: true, force: true });
    }
  });

  it('rejects exchange_only records with carbsG=None unless carbCalculationBasis=unspecified in validate_catalog', () => {
    const invalidCases: Array<{ label: string; recordId: string; code: string; carbBasisLine: string; expectedGot: string }> = [
      {
        label: 'total_by_difference',
        recordId: 'food_bad_ex_carb_tbd',
        code: 'RP-EX-CARB-TBD',
        carbBasisLine: '"carbCalculationBasis": "total_by_difference", ',
        expectedGot: "(got 'total_by_difference')",
      },
      {
        label: 'available_carbohydrate',
        recordId: 'food_bad_ex_carb_avail',
        code: 'RP-EX-CARB-AVAIL',
        carbBasisLine: '"carbCalculationBasis": "available_carbohydrate", ',
        expectedGot: "(got 'available_carbohydrate')",
      },
      {
        label: 'missing carbCalculationBasis',
        recordId: 'food_bad_ex_carb_missing',
        code: 'RP-EX-CARB-MISS',
        carbBasisLine: '',
        expectedGot: '(got None)',
      },
    ];

    for (const tc of invalidCases) {
      const sb = makeTempSandbox();
      try {
        const before = snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES);
        fs.writeFileSync(
          path.join(sb.scriptsDir, 'gen_occasions.py'),
          [
            'import os, json',
            'out = os.path.join(os.environ["NCP_CATALOG_OUT_DIR"], "occasions.ts")',
            'bad_ex = [{',
            `  "id": ${JSON.stringify(tc.recordId)},`,
            `  "code": ${JSON.stringify(tc.code)},`,
            '  "sourceId": "regimeplan_2026",',
            '  "nameEn": "Invalid Exchange Carb Basis",',
            '  "nameAr": "بديل بأساس كربوهيدرات غير صحيح",',
            '  "foodGroupId": "occasions",',
            '  "primaryExchangeCategoryId": "combination_food",',
            '  "preparationState": "cooked",',
            '  "verificationStatus": "clinic_reviewed",',
            '  "compositionBasis": "exchange_only",',
            `  "nutrients100g": {"basisWeightG": 100, "caloriesKcal": None, "carbsG": None, "availableCarbsG": None, ${tc.carbBasisLine}"proteinG": None, "fatG": None, "fiberG": None, "saturatedFatG": None, "transFatG": None, "monounsaturatedFatG": None, "polyunsaturatedFatG": None, "cholesterolMg": None, "sodiumMg": None, "potassiumMg": None, "calciumMg": None, "ironMg": None, "waterG": None, "missingNutrientKeys": ["caloriesKcal", "carbsG", "proteinG", "fatG", "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG", "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg", "calciumMg", "ironMg", "waterG"]},`,
            '  "portions": [{"id": "p_bad_ex_carb_1", "gramWeight": 30}]',
            '}]',
            'with open(out, "w", encoding="utf-8") as f:',
            '    f.write("export const OCC: FoodItemRecord[] = " + json.dumps(bad_ex) + ";")',
          ].join('\n'),
          'utf-8'
        );

        const res = spawnSync(
          'python3',
          [path.join(sb.scriptsDir, 'build_full_catalog.py'), '--scripts-dir', sb.scriptsDir, '--data-dir', sb.dataDir],
          { cwd: REPO_ROOT, encoding: 'utf-8' }
        );
        assert.notEqual(res.status, 0, `${tc.label}: expected validation failure`);
        assert.ok(
          res.stdout.includes(tc.recordId) &&
            res.stdout.includes("nutrients100g.carbCalculationBasis='unspecified'") &&
            res.stdout.includes(tc.expectedGot),
          `${tc.label}: expected rejection citing ${tc.recordId}, nutrients100g.carbCalculationBasis='unspecified', and ${tc.expectedGot}, got:\n${res.stdout}\n${res.stderr}`
        );
        assert.deepEqual(snapshotDirHashes(sb.dataDir, OUTPUT_TS_FILES), before);
      } finally {
        fs.rmSync(sb.root, { recursive: true, force: true });
      }
    }
  });
});

describe('Task B: Deterministic Semantic Meat/Seafood Translation Engine', () => {
  it('translates beef, lamb, fish, seafood, kofta, poultry cuts, and PDF-glued Arabic names accurately', () => {
    const cases: Array<[string, string]> = [
      ['لحم بقري مشوي', 'Grilled Beef'],
      ['لحم بقري مفروم مشوي', 'Grilled Ground Beef'],
      ['لحم ضاني مشوي', 'Grilled Lamb'],
      ['لحم ضاني مسلوق', 'Boiled Lamb'],
      ['لحم ضاني مفروم نيء', 'Raw Ground Lamb'],
      ['رنجة مدخنةنصف', 'Smoked Herring'],
      ['مسك القد نيء', 'Raw Cod Fish'],
      ['استاكوزا مطبوخة', 'Cooked Lobster'],
      ['كفتة مشوية', 'Grilled Kofta'],
      ['ورك فراخ بدون جلد مشوي', 'Grilled Skinless Chicken Thigh'],
      ['فراخ مفرومة مطبوخة', 'Cooked Ground Chicken'],
      ['فراخ مشوية على الفحم', 'Charcoal-Grilled Chicken'],
      ['لحم بتلو في الفرن', 'Baked Veal'],
      ['أرانب نيئة', 'Raw Rabbit'],
      ['لحم مجلي مطبوخ', 'Cooked Camel Meat'],
      ['لحم ماعز في الفرن', 'Baked Goat Meat'],
      ['مسان مشويمسانة )86 غ(', 'Grilled Quail'],
      ['برجر لحم مشويقرص )58 غ(', 'Grilled Beef Burger Patty'],
      ['رومي مدخن3 شرائح', 'Smoked Turkey'],
      ['سردين معلب بالزيتمسكة ونصف', 'Canned Sardines in Oil'],
      ['بسطرمة4 شرائح', 'Pastrami'],
      ['كبدة فراخ مقليةكبدة', 'Fried Chicken Liver'],
      ['محام في الفرنربع محامة', 'Baked Pigeon / Squab'],
    ];

    const results = runPythonTranslations(cases.map(([ar]) => ar));
    for (const [ar, expected] of cases) {
      assert.equal(results[ar], expected, `Mismatch for "${ar}"`);
    }

    // Semantic contrast assertions
    assert.equal(results['لحم بقري مشوي'].includes('Lamb'), false);
    assert.equal(results['لحم ضاني مشوي'].includes('Beef'), false);
    assert.equal(results['رنجة مدخنةنصف'].toLowerCase().split('smoked').length - 1, 1, 'No duplicate Smoked');
  });

  it('returns transparent Untranslated fallback for prep-only inputs or unknown/conflicting Arabic tokens', () => {
    const negativeInputs = [
      'نيء فقط',
      'مشوي فقط',
      'سمك غير معروف نيء',
      'لحم مشوي بخلطة خاصة',
      'لحم بقري ضاني مشوي',
    ];

    const results = runPythonTranslations(negativeInputs);
    for (const ar of negativeInputs) {
      assert.ok(
        results[ar].startsWith('Untranslated Arabic Meat/Seafood Item ('),
        `Expected transparent Untranslated fallback for "${ar}", got "${results[ar]}"`
      );
    }
  });

  it('verifies all 200 generated meat records in meats.ts have clean non-placeholder semantic names', () => {
    const meats = getAllFoodItems().filter((f) => f.foodGroupId === 'meats');
    assert.equal(meats.length, 200, 'Expected 200 meat/seafood/cheese substitute records');

    const byCode = new Map(meats.map((m) => [m.code, m]));
    assert.equal(byCode.get('RP-MT-029')?.nameEn, 'Baked Lean Beef');
    assert.equal(byCode.get('RP-MT-044')?.nameEn, 'Baked Skinless Chicken Drumstick');
    assert.equal(byCode.get('RP-MT-057')?.nameEn, 'Canned Tuna in Oil');
    assert.equal(byCode.get('RP-MT-094')?.nameEn, 'Canned Anchovies in Oil');
    assert.equal(byCode.get('RP-MT-124')?.nameEn, 'Smoked Herring');
    assert.equal(byCode.get('RP-MT-145')?.nameEn, 'Boiled Lamb');
    assert.equal(byCode.get('RP-MT-154')?.nameEn, 'Grilled Lamb');
    assert.equal(byCode.get('RP-MT-171')?.nameEn, 'Beef Shawarma');
    assert.equal(byCode.get('RP-MT-173')?.nameEn, 'Grilled Kofta');

    for (const item of meats) {
      assert.equal(item.nameEn.includes('Untranslated'), false, `${item.code}: "${item.nameEn}"`);
      assert.equal(item.nameEn.includes('Meat / Beef'), false, `${item.code}: "${item.nameEn}"`);
      assert.equal(item.nameEn.includes('Meat Product ('), false, `${item.code}: "${item.nameEn}"`);
      const lowerWords = item.nameEn.toLowerCase().split(/\s+/);
      assert.ok(lowerWords.indexOf('smoked') === lowerWords.lastIndexOf('smoked'), `Duplicate smoked in ${item.code}`);
      assert.ok(lowerWords.indexOf('beef') === lowerWords.lastIndexOf('beef'), `Duplicate beef in ${item.code}`);
    }
  });
});

describe('Task C & D: Catalog Provenance Counts & Isolated Dual-Run Reproducibility', () => {
  it('confirms exact 676-record provenance breakdown and analytical/exchange invariants', () => {
    const all = getAllFoodItems();
    assert.equal(all.length, 676);

    const bySource: Record<string, number> = {};
    const byVerification: Record<string, number> = {};
    const byBasis: Record<string, number> = {};
    for (const item of all) {
      bySource[item.sourceId] = (bySource[item.sourceId] || 0) + 1;
      byVerification[item.verificationStatus] = (byVerification[item.verificationStatus] || 0) + 1;
      const basis = item.compositionBasis ?? 'MISSING';
      byBasis[basis] = (byBasis[basis] || 0) + 1;
      assert.ok(DATA_SOURCES[item.sourceId]);
      if (item.sourceId === 'usda_fdc') {
        assert.ok(item.sourceRecordId && /^\d{5,6}$/.test(item.sourceRecordId), `${item.code} invalid sourceRecordId`);
      } else {
        assert.equal(item.sourceRecordId, undefined, `${item.code} must not fabricate sourceRecordId`);
      }
    }

    assert.deepEqual(bySource, {
      usda_fdc: 357,
      egyptian_nni_2006: 8,
      clinic_reviewed: 15,
      regimeplan_2026: 260,
      egyptian_exchange_guide_2026: 36,
    });
    assert.deepEqual(byVerification, {
      verified_standard: 365,
      clinic_reviewed: 308,
      recipe_based: 3,
    });
    assert.deepEqual(byBasis, {
      analytical_table: 365,
      exchange_only: 296,
      clinic_estimated: 12,
      recipe_based: 3,
    });

    // Spot-check pure oil vs tahini vs recipe_based Fino vs exchange_only Sunn portion scaling
    const tahini = getFoodItemById('food_fat_rp_ft_014')!;
    const scaledTahini = calculatePortionNutrients(tahini, tahini.portions[0].id, 1);
    assert.equal(scaledTahini.netWeightG, 9);
    assert.ok((scaledTahini.proteinG ?? 0) > 1 && (scaledTahini.carbsG ?? 0) > 1);

    const pureOil = getFoodItemById('food_oil_olive_extra_virgin')!;
    const scaledOil = scaleNutrientProfile(pureOil.nutrients100g, 5);
    assert.equal(scaledOil.caloriesKcal, 44.2);
    assert.equal(scaledOil.fatG, 5.0);
    assert.equal(scaledOil.proteinG, 0);

    const finoBread = getFoodItemById('food_starch_rp_rp_st_007')!;
    assert.equal(finoBread.compositionBasis, 'recipe_based');
    assert.equal(finoBread.sourceId, 'clinic_reviewed');
    const scaledFino = calculatePortionNutrients(finoBread, finoBread.portions[0].id, 1);
    assert.equal(scaledFino.netWeightG, 27);
    assert.equal(scaledFino.exchangeCategory, 'starch');
    assert.equal(scaledFino.calculatedExchangeCount, 1);
    assert.equal(scaledFino.caloriesKcal, 74.8);
    assert.equal(scaledFino.carbsG, 14.36);
    assert.equal(scaledFino.sodiumMg, null);

    const sunnBread = getFoodItemById('food_starch_rp_rp_st_008')!;
    assert.equal(sunnBread.compositionBasis, 'exchange_only');
    assert.equal(sunnBread.sourceId, 'regimeplan_2026');
    const scaledSunn = calculatePortionNutrients(sunnBread, sunnBread.portions[0].id, 1);
    assert.equal(scaledSunn.netWeightG, 28);
    assert.equal(scaledSunn.exchangeCategory, 'starch');
    assert.equal(scaledSunn.calculatedExchangeCount, 1);
    assert.equal(scaledSunn.caloriesKcal, null);
    assert.equal(scaledSunn.carbsG, null);
    assert.equal(scaledSunn.proteinG, null);
    assert.equal(scaledSunn.fatG, null);
  });

  it('produces byte-for-byte identical SHA-256 outputs across two independent isolated runs', () => {
    const tmpParent = fs.mkdtempSync(path.join(os.tmpdir(), 'ncp_repro_'));
    const run1Dir = path.join(tmpParent, 'run1');
    const run2Dir = path.join(tmpParent, 'run2');

    try {
      const r1 = spawnSync(
        'python3',
        [PROD_BUILD_SCRIPT, '--data-dir', run1Dir],
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      );
      assert.equal(r1.status, 0, `Run 1 failed: ${r1.stderr}\n${r1.stdout}`);
      // Verify honest stage separation (never falsely claims reproducibility when simply generating)
      assert.ok(r1.stdout.includes('Stage 1 — Staged Generation     : SUCCEEDED'));
      assert.ok(r1.stdout.includes('Stage 2 — Catalog Validation    : PASSED'));
      assert.ok(r1.stdout.includes('Stage 3 — Safe Publication      : SUCCEEDED'));
      assert.ok(r1.stdout.includes('Stage 4 — Reproducibility Check : NOT EXECUTED'));

      const r2 = spawnSync(
        'python3',
        [PROD_BUILD_SCRIPT, '--data-dir', run2Dir],
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      );
      assert.equal(r2.status, 0, `Run 2 failed: ${r2.stderr}\n${r2.stdout}`);

      const h1 = snapshotDirHashes(run1Dir, OUTPUT_TS_FILES);
      const h2 = snapshotDirHashes(run2Dir, OUTPUT_TS_FILES);

      for (const fn of OUTPUT_TS_FILES) {
        assert.ok(h1[fn], `Run 1 missing ${fn}`);
        assert.equal(h1[fn], h2[fn], `Reproducibility mismatch detected in ${fn}: ${h1[fn]} !== ${h2[fn]}`);
      }
    } finally {
      fs.rmSync(tmpParent, { recursive: true, force: true });
    }
  });
});

describe('REM-04 Phase 2: Controlled Arabic Name Remediation (124 Category A Records)', () => {
  const EXPECTED_MEAT_CORRECTIONS: Record<string, string> = {
    'RP-MT-002': 'حمص نيء',
    'RP-MT-003': 'حمص مطبوخ',
    'RP-MT-014': 'حمص بطحينة',
    'RP-MT-015': 'طعمية',
    'RP-MT-016': 'دقيق حمص',
    'RP-MT-017': 'حمص معلب',
    'RP-MT-018': 'دال حمص مطبوخ',
    'RP-MT-021': 'حمص محمص',
    'RP-MT-022': 'ترمس مطبوخ',
    'RP-MT-030': 'لحم بقري قليل الدهن مشوي',
    'RP-MT-032': 'وز في الفرن',
    'RP-MT-033': 'وز نيء',
    'RP-MT-034': 'سمان مشوي',
    'RP-MT-035': 'سمان نيء',
    'RP-MT-036': 'حمام في الفرن',
    'RP-MT-037': 'حمام نيء',
    'RP-MT-039': 'رومي مدخن',
    'RP-MT-040': 'بط في الفرن',
    'RP-MT-041': 'قوانص فراخ مطبوخة',
    'RP-MT-042': 'قوانص فراخ نيئة',
    'RP-MT-043': 'دبوس فراخ بدون جلد مسلوق',
    'RP-MT-047': 'كبدة فراخ نيئة',
    'RP-MT-049': 'لحم بط نيء',
    'RP-MT-051': 'سمك القد نيء',
    'RP-MT-052': 'سردين معلب بالزيت',
    'RP-MT-060': 'سالمون في الفرن',
    'RP-MT-061': 'سالمون مشوي',
    'RP-MT-062': 'سالمون نيء',
    'RP-MT-063': 'بسطرمة',
    'RP-MT-067': 'لحم جملي مطبوخ',
    'RP-MT-068': 'لحم جملي نيء',
    'RP-MT-071': 'لحم بقري مفروم قليل الدهن مشوح',
    'RP-MT-078': 'سالمون معلب',
    'RP-MT-079': 'سالمون مدخن',
    'RP-MT-081': 'جمبري نهري مطبوخ',
    'RP-MT-086': 'سمك أبو سيف نيء',
    'RP-MT-087': 'سمك بولاك نيء',
    'RP-MT-088': 'قرموط نيء',
    'RP-MT-089': 'هاليبوت نيء',
    'RP-MT-096': 'تراوت نيء',
    'RP-MT-098': 'محار مطبوخ',
    'RP-MT-099': 'بلح البحر مطبوخ',
    'RP-MT-101': 'كاليماري مشوي',
    'RP-MT-102': 'كاليماري نيء',
    'RP-MT-103': 'جمبري مسلوق',
    'RP-MT-104': 'جمبري مشوي',
    'RP-MT-105': 'جمبري نيء',
    'RP-MT-106': 'قاروص مشوي',
    'RP-MT-108': 'سمك القد في الفرن',
    'RP-MT-117': 'برجر نباتي',
    'RP-MT-122': 'بياض بيض',
    'RP-MT-124': 'رنجة مدخنة',
    'RP-MT-126': 'سمك موسى نيء',
    'RP-MT-132': 'دنيس نيء',
    'RP-MT-136': 'كاليماري مقلي',
    'RP-MT-137': 'جمبري مقلي',
    'RP-MT-138': 'سمك القد مقلي',
    'RP-MT-140': 'سالمون مقلي',
    'RP-MT-141': 'برجر لحم مشوي',
    'RP-MT-142': 'لانشون بقري',
    'RP-MT-144': 'إسكالوب بانيه',
    'RP-MT-148': 'سلامي بقري',
    'RP-MT-159': 'لانشون فراخ',
    'RP-MT-161': 'كبدة فراخ مقلية',
    'RP-MT-166': 'صفار بيض',
    'RP-MT-168': 'ريش ضاني مشوية',
    'RP-MT-169': 'بيبروني بقري',
    'RP-MT-171': 'شاورما لحمة',
    'RP-MT-174': 'شرائح دجاج نباتية',
    'RP-MT-178': 'تمبيه',
    'RP-MT-181': 'جبنة مثلثات',
    'RP-MT-182': 'بانير',
    'RP-MT-183': 'ريكوتا',
    'RP-MT-187': 'أومليت',
    'RP-MT-193': 'فيليه سمك بانيه',
    'RP-MT-196': 'سمك موسى مقلي',
  };

  const EXPECTED_FAT_CORRECTIONS: Record<string, string> = {
    'RP-FT-001': 'زبدة لب عباد الشمس',
    'RP-FT-003': 'بذور هيمب',
    'RP-FT-005': 'لب القرع محمص',
    'RP-FT-007': 'لب عباد الشمس مملح',
    'RP-FT-008': 'لب عباد الشمس محمص',
    'RP-FT-009': 'لب عباد الشمس نيء',
    'RP-FT-010': 'سمسم',
    'RP-FT-013': 'عين جمل نيء',
    'RP-FT-015': 'زبدة نباتية',
    'RP-FT-016': 'بارميزان نباتي',
    'RP-FT-017': 'جبنة قشقوان',
    'RP-FT-018': 'جبنة رومي',
    'RP-FT-019': 'جبنة شرائح معالجة',
    'RP-FT-020': 'مونتيري جاك',
    'RP-FT-024': 'جودة',
    'RP-FT-025': 'جبنة سويسرية',
    'RP-FT-026': 'بروفولون',
    'RP-FT-027': 'حلوم',
    'RP-FT-028': 'بارميزان',
    'RP-FT-029': 'شيدر',
    'RP-FT-030': 'كاجو نيء',
    'RP-FT-031': 'لوز مملح',
    'RP-FT-032': 'لوز محمص',
    'RP-FT-034': 'زبدة لوز',
    'RP-FT-036': 'أفوكادو نيء',
    'RP-FT-037': 'زيتون أخضر',
    'RP-FT-038': 'زيتون أسود',
    'RP-FT-039': 'كريمة شوفان',
    'RP-FT-040': 'كريمة كاجو',
    'RP-FT-042': 'ثومية',
    'RP-FT-043': 'طحينة بالخل',
    'RP-FT-046': 'صلصة سيزر',
    'RP-FT-048': 'مايونيز',
    'RP-FT-056': 'مارجرين',
    'RP-FT-059': 'زيت سمسم',
    'RP-FT-060': 'زيت عباد الشمس',
    'RP-FT-062': 'عين جمل محمص',
    'RP-FT-068': 'مكسرات مشكلة محمصة',
    'RP-FT-069': 'بندق محمص',
    'RP-FT-070': 'بيكان محمص',
    'RP-FT-075': 'بيكان نيء',
    'RP-FT-076': 'بندق نيء',
    'RP-FT-077': 'فستق مملح',
    'RP-FT-078': 'فستق محمص',
    'RP-FT-079': 'فستق نيء',
    'RP-FT-081': 'فول سوداني محمص',
    'RP-FT-083': 'كاجو مملح',
    'RP-FT-084': 'كاجو محمص',
  };

  it('verifies all 124 Category A corrected Arabic names in the runtime catalog and preserves exclusions', () => {
    assert.equal(Object.keys(EXPECTED_MEAT_CORRECTIONS).length, 76);
    assert.equal(Object.keys(EXPECTED_FAT_CORRECTIONS).length, 48);

    const byCode = new Map(getAllFoodItems().map((item) => [item.code, item]));

    for (const [code, expectedNameAr] of Object.entries(EXPECTED_MEAT_CORRECTIONS)) {
      const rec = byCode.get(code);
      assert.ok(rec, `Missing meat record ${code}`);
      assert.equal(rec.foodGroupId, 'meats');
      assert.equal(rec.nameAr, expectedNameAr, `Mismatch in ${code}`);
    }

    for (const [code, expectedNameAr] of Object.entries(EXPECTED_FAT_CORRECTIONS)) {
      const rec = byCode.get(code);
      assert.ok(rec, `Missing fat record ${code}`);
      assert.equal(rec.foodGroupId, 'fats');
      assert.equal(rec.nameAr, expectedNameAr, `Mismatch in ${code}`);
    }

    // Confirm RegimePlan PDF "سالمون" spelling preserved across all 6 salmon records
    for (const salmonCode of ['RP-MT-060', 'RP-MT-061', 'RP-MT-062', 'RP-MT-078', 'RP-MT-079', 'RP-MT-140']) {
      const rec = byCode.get(salmonCode)!;
      assert.ok(rec.nameAr.includes('سالمون'), `${salmonCode} must use سالمون spelling`);
      assert.equal(rec.nameAr.includes('ساملون'), false);
    }

    // Confirm wrapped-line fixes preserve non-nameAr fields
    const mt030 = byCode.get('RP-MT-030')!;
    assert.equal(mt030.nameAr, 'لحم بقري قليل الدهن مشوي');
    assert.equal(mt030.nameEn, 'Lean Beef');
    assert.equal(mt030.preparationState, 'cooked');

    const mt043 = byCode.get('RP-MT-043')!;
    assert.equal(mt043.nameAr, 'دبوس فراخ بدون جلد مسلوق');
    assert.equal(mt043.nameEn, 'Skinless Chicken Drumstick');
    assert.equal(mt043.preparationState, 'cooked');

    const mt071 = byCode.get('RP-MT-071')!;
    assert.equal(mt071.nameAr, 'لحم بقري مفروم قليل الدهن مشوح');
    assert.equal(mt071.nameEn, 'Lean Ground Beef');
    assert.equal(mt071.preparationState, 'cooked');

    // Explicit exclusions must remain unchanged
    assert.equal(byCode.get('RP-FT-021')?.nameAr, 'جرير');
    assert.equal(byCode.get('RP-OCC-015')?.nameAr, 'قطايف مقلية بالمسكرات');
  });

  it('guards against residual CMap swaps and glued measurement artifacts in meats and fats nameAr', () => {
    const meatsAndFats = getAllFoodItems().filter(
      (item) => item.foodGroupId === 'meats' || item.foodGroupId === 'fats'
    );
    const forbiddenSubstrings = [
      'محص',
      'مسك ',
      'شرائج',
      'ساملون',
      'مايوانيز',
      'جبنيم',
      'مدخنةنصف',
      'مقليفيليه',
      'مسلوقجمبري',
      'نيئةوزة',
      'غ(',
    ];

    for (const item of meatsAndFats) {
      for (const bad of forbiddenSubstrings) {
        assert.equal(
          item.nameAr.includes(bad),
          false,
          `Forbidden artifact "${bad}" found in ${item.code}: "${item.nameAr}"`
        );
      }
      if (item.code?.startsWith('RP-MT-') || item.code?.startsWith('RP-FT-')) {
        assert.equal(/[()0-9٠-٩]/.test(item.nameAr), false, `Unexpected digit/paren in ${item.code}: "${item.nameAr}"`);
      }
    }
  });

  it('verifies generator correction mappings and سالمون normalization without touching production files', () => {
    const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'ncp_rem04_gen_check_'));
    try {
      const pyCode = `
import json, os, sys
sys.dont_write_bytecode = True
sys.path.insert(0, ${JSON.stringify(REPO_ROOT)})
os.environ['NCP_CATALOG_OUT_DIR'] = ${JSON.stringify(tmpOut)}
from scripts.gen_meats import MEAT_NAME_AR_CORRECTIONS, AR_TYPO_NORMALIZATION, translate_name
from scripts.gen_fats import FAT_NAME_AR_CORRECTIONS
print(json.dumps({
  'meatCount': len(MEAT_NAME_AR_CORRECTIONS),
  'fatCount': len(FAT_NAME_AR_CORRECTIONS),
  'ft021Excluded': 'RP-FT-021' not in FAT_NAME_AR_CORRECTIONS,
  'salmonNorm': AR_TYPO_NORMALIZATION.get('ساملون'),
  'bakedSalmon': translate_name('سالمون في الفرن'),
  'smokedSalmon': translate_name('سالمون مدخن'),
  'rawSalmon': translate_name('سالمون نيء'),
}, ensure_ascii=False))
`;
      const res = spawnSync('python3', ['-c', pyCode], { cwd: REPO_ROOT, encoding: 'utf-8' });
      assert.equal(res.status, 0, `Python generator inspection failed: ${res.stderr}`);
      const lastLine = res.stdout.trim().split('\n').pop()!;
      const info = JSON.parse(lastLine);
      assert.equal(info.meatCount, 76);
      assert.equal(info.fatCount, 48);
      assert.equal(info.ft021Excluded, true);
      assert.equal(info.salmonNorm, 'سالمون');
      assert.equal(info.bakedSalmon, 'Baked Salmon');
      assert.equal(info.smokedSalmon, 'Smoked Salmon');
      assert.equal(info.rawSalmon, 'Raw Salmon');
    } finally {
      fs.rmSync(tmpOut, { recursive: true, force: true });
    }
  });
});

