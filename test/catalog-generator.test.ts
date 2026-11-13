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
    for (const item of all) {
      bySource[item.sourceId] = (bySource[item.sourceId] || 0) + 1;
      byVerification[item.verificationStatus] = (byVerification[item.verificationStatus] || 0) + 1;
      assert.ok(DATA_SOURCES[item.sourceId]);
      if (item.sourceId === 'usda_fdc') {
        assert.ok(item.sourceRecordId && /^\d{5,6}$/.test(item.sourceRecordId), `${item.code} invalid sourceRecordId`);
      } else {
        assert.equal(item.sourceRecordId, undefined, `${item.code} must not fabricate sourceRecordId`);
      }
    }

    assert.deepEqual(bySource, {
      usda_fdc: 110,
      egyptian_nni_2006: 8,
      clinic_reviewed: 122,
      regimeplan_2026: 436,
    });
    assert.deepEqual(byVerification, {
      verified_standard: 117,
      clinic_reviewed: 549,
      recipe_based: 10,
    });

    // Spot-check pure oil vs tahini vs peanut scaling accuracy
    const tahini = getFoodItemById('food_fat_rp_ft_014')!;
    const scaledTahini = calculatePortionNutrients(tahini, tahini.portions[0].id, 1);
    assert.equal(scaledTahini.netWeightG, 9);
    assert.ok(scaledTahini.proteinG > 1 && scaledTahini.carbsG > 1);

    const pureOil = getFoodItemById('food_oil_olive_extra_virgin')!;
    const scaledOil = scaleNutrientProfile(pureOil.nutrients100g, 5);
    assert.equal(scaledOil.caloriesKcal, 44.2);
    assert.equal(scaledOil.fatG, 5.0);
    assert.equal(scaledOil.proteinG, 0);
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
