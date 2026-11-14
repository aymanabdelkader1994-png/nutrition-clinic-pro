# -*- coding: utf-8 -*-
import zlib
import re
import json
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_DIR = os.environ.get("NCP_CATALOG_OUT_DIR") or os.path.join(BASE_DIR, "src", "clinical", "food", "data")
OUT_PATH = os.path.join(OUT_DIR, "meats.ts")

PDF_PATH = os.path.join(BASE_DIR, "public/assets/aistudio/regimeplan-food-exchange-list-ar-2026-10-10_1630b277.pdf")
ORIG_PATH = os.path.join(BASE_DIR, "scripts/original_30_grouped.json")
def parse_cmap(cmap_str):
    mapping = {}
    for block in re.findall(r"(\d+)\s+beginbfchar(.*?)endbfchar", cmap_str, re.DOTALL):
        for line in block[1].strip().split("\n"):
            line = line.strip()
            m = re.match(r"<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>", line)
            if m:
                try:
                    mapping[m.group(1).upper()] = bytes.fromhex(m.group(2)).decode("utf-16-be")
                except Exception:
                    pass
    for block in re.findall(r"(\d+)\s+beginbfrange(.*?)endbfrange", cmap_str, re.DOTALL):
        for m in re.finditer(r"<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>", block[1]):
            start = int(m.group(1), 16)
            end = int(m.group(2), 16)
            target = int(m.group(3), 16)
            for off in range(end - start + 1):
                try:
                    mapping[f"{start + off:04X}"] = chr(target + off)
                except Exception:
                    pass
    return mapping


def _build_pdf_context():
    with open(PDF_PATH, "rb") as f:
        pdf_content = f.read()
    pdf_streams = re.findall(b"stream[\r\n]+(.*?)[\r\n]+endstream", pdf_content, re.DOTALL)
    fmaps = {
        "/F4": parse_cmap(zlib.decompress(pdf_streams[27]).decode("latin1")),
        "/F5": parse_cmap(zlib.decompress(pdf_streams[29]).decode("latin1")),
        "/F9": parse_cmap(zlib.decompress(pdf_streams[31]).decode("latin1")),
        "/F10": parse_cmap(zlib.decompress(pdf_streams[33]).decode("latin1")),
        "/F11": parse_cmap(zlib.decompress(pdf_streams[35]).decode("latin1")),
    }
    return pdf_streams, fmaps

token_pattern = re.compile(
    r"(/[A-Za-z0-9_]+)\s+[0-9.]+\s+Tf|"
    r"([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+([0-9.\-]+)\s+Tm|"
    r"([0-9.\-]+)\s+([0-9.\-]+)\s+Td|"
    r"<([0-9a-fA-F]+)>\s*Tj"
)

def extract_page_tokens(decomp, font_maps):
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

MEAT_USDA_SR_PROFILES = {
    "RP-MT-003": {"sourceRecordId": "16057", "nutrients": {"caloriesKcal": 164.0, "carbsG": 27.4, "proteinG": 8.86, "fatG": 2.59, "fiberG": 7.6, "saturatedFatG": 0.269, "transFatG": 0.0, "monounsaturatedFatG": 0.583, "polyunsaturatedFatG": 1.16, "cholesterolMg": 0.0, "sodiumMg": 7.0, "potassiumMg": 291.0, "calciumMg": 49.0, "ironMg": 2.89, "waterG": 60.2}},
    "RP-MT-004": {"sourceRecordId": "05333", "nutrients": {"caloriesKcal": 189.0, "carbsG": 0.0, "proteinG": 23.3, "fatG": 10.9, "fiberG": 0.0, "saturatedFatG": 3.11, "transFatG": 0.087, "monounsaturatedFatG": 4.88, "polyunsaturatedFatG": 2.08, "cholesterolMg": 107.0, "sodiumMg": 75.0, "potassiumMg": 677.0, "calciumMg": 8.0, "ironMg": 0.93, "waterG": 64.9}},
    "RP-MT-005": {"sourceRecordId": "05332", "nutrients": {"caloriesKcal": 143.0, "carbsG": 0.04, "proteinG": 17.4, "fatG": 8.1, "fiberG": 0.0, "saturatedFatG": 2.3, "transFatG": 0.065, "monounsaturatedFatG": 3.61, "polyunsaturatedFatG": 1.51, "cholesterolMg": 86.0, "sodiumMg": 60.0, "potassiumMg": 522.0, "calciumMg": 6.0, "ironMg": 0.82, "waterG": 73.2}},
    "RP-MT-008": {"sourceRecordId": "05098", "nutrients": {"caloriesKcal": 179.0, "carbsG": 0.0, "proteinG": 24.8, "fatG": 8.15, "fiberG": 0.0, "saturatedFatG": 2.31, "transFatG": 0.044, "monounsaturatedFatG": 3.36, "polyunsaturatedFatG": 1.7, "cholesterolMg": 133.0, "sodiumMg": 106.0, "potassiumMg": 269.0, "calciumMg": 9.0, "ironMg": 1.13, "waterG": 67.0}},
    "RP-MT-009": {"sourceRecordId": "05098", "nutrients": {"caloriesKcal": 179.0, "carbsG": 0.0, "proteinG": 24.8, "fatG": 8.15, "fiberG": 0.0, "saturatedFatG": 2.31, "transFatG": 0.044, "monounsaturatedFatG": 3.36, "polyunsaturatedFatG": 1.7, "cholesterolMg": 133.0, "sodiumMg": 106.0, "potassiumMg": 269.0, "calciumMg": 9.0, "ironMg": 1.13, "waterG": 67.0}},
    "RP-MT-010": {"sourceRecordId": "05096", "nutrients": {"caloriesKcal": 121.0, "carbsG": 0.0, "proteinG": 19.7, "fatG": 4.12, "fiberG": 0.0, "saturatedFatG": 1.1, "transFatG": 0.02, "monounsaturatedFatG": 1.5, "polyunsaturatedFatG": 0.94, "cholesterolMg": 94.0, "sodiumMg": 95.0, "potassiumMg": 242.0, "calciumMg": 7.0, "ironMg": 0.81, "waterG": 76.2}},
    "RP-MT-011": {"sourceRecordId": "05064", "nutrients": {"caloriesKcal": 165.0, "carbsG": 0.0, "proteinG": 31.0, "fatG": 3.57, "fiberG": 0.0, "saturatedFatG": 1.01, "monounsaturatedFatG": 1.24, "polyunsaturatedFatG": 0.77, "cholesterolMg": 85.0, "sodiumMg": 74.0, "potassiumMg": 256.0, "calciumMg": 15.0, "ironMg": 1.04, "waterG": 65.3}},
    "RP-MT-012": {"sourceRecordId": "05064", "nutrients": {"caloriesKcal": 165.0, "carbsG": 0.0, "proteinG": 31.0, "fatG": 3.57, "fiberG": 0.0, "saturatedFatG": 1.01, "monounsaturatedFatG": 1.24, "polyunsaturatedFatG": 0.77, "cholesterolMg": 85.0, "sodiumMg": 74.0, "potassiumMg": 256.0, "calciumMg": 15.0, "ironMg": 1.04, "waterG": 65.3}},
    "RP-MT-013": {"sourceRecordId": "05062", "nutrients": {"caloriesKcal": 120.0, "carbsG": 0.0, "proteinG": 22.5, "fatG": 2.62, "fiberG": 0.0, "saturatedFatG": 0.563, "transFatG": 0.007, "monounsaturatedFatG": 0.689, "polyunsaturatedFatG": 0.424, "cholesterolMg": 73.0, "sodiumMg": 45.0, "potassiumMg": 334.0, "calciumMg": 5.0, "ironMg": 0.37, "waterG": 73.9}},
    "RP-MT-026": {"sourceRecordId": "17091", "nutrients": {"caloriesKcal": 196.0, "carbsG": 0.0, "proteinG": 31.9, "fatG": 6.58, "fiberG": 0.0, "saturatedFatG": 1.84, "monounsaturatedFatG": 2.35, "polyunsaturatedFatG": 0.59, "cholesterolMg": 118.0, "sodiumMg": 89.0, "potassiumMg": 338.0, "calciumMg": 24.0, "ironMg": 1.16, "waterG": 60.2}},
    "RP-MT-027": {"sourceRecordId": "17091", "nutrients": {"caloriesKcal": 196.0, "carbsG": 0.0, "proteinG": 31.9, "fatG": 6.58, "fiberG": 0.0, "saturatedFatG": 1.84, "monounsaturatedFatG": 2.35, "polyunsaturatedFatG": 0.59, "cholesterolMg": 118.0, "sodiumMg": 89.0, "potassiumMg": 338.0, "calciumMg": 24.0, "ironMg": 1.16, "waterG": 60.2}},
    "RP-MT-028": {"sourceRecordId": "17090", "nutrients": {"caloriesKcal": 112.0, "carbsG": 0.0, "proteinG": 20.2, "fatG": 2.87, "fiberG": 0.0, "saturatedFatG": 0.86, "monounsaturatedFatG": 0.92, "polyunsaturatedFatG": 0.3, "cholesterolMg": 83.0, "sodiumMg": 86.0, "potassiumMg": 328.0, "calciumMg": 15.0, "ironMg": 0.85, "waterG": 75.9}},
    "RP-MT-032": {"sourceRecordId": "05147", "nutrients": {"caloriesKcal": 305.0, "carbsG": 0.0, "proteinG": 25.2, "fatG": 21.9, "fiberG": 0.0, "saturatedFatG": 6.87, "monounsaturatedFatG": 10.2, "polyunsaturatedFatG": 2.52, "cholesterolMg": 91.0, "sodiumMg": 70.0, "potassiumMg": 329.0, "calciumMg": 13.0, "ironMg": 2.83, "waterG": 52.0}},
    "RP-MT-033": {"sourceRecordId": "05146", "nutrients": {"caloriesKcal": 371.0, "carbsG": 0.0, "proteinG": 15.9, "fatG": 33.6, "fiberG": 0.0, "saturatedFatG": 9.78, "monounsaturatedFatG": 17.8, "polyunsaturatedFatG": 3.76, "cholesterolMg": 80.0, "sodiumMg": 73.0, "potassiumMg": 308.0, "calciumMg": 12.0, "ironMg": 2.5, "waterG": 49.7}},
    "RP-MT-035": {"sourceRecordId": "05157", "nutrients": {"caloriesKcal": 192.0, "carbsG": 0.0, "proteinG": 19.6, "fatG": 12.0, "fiberG": 0.0, "saturatedFatG": 3.38, "monounsaturatedFatG": 4.18, "polyunsaturatedFatG": 2.98, "cholesterolMg": 76.0, "sodiumMg": 53.0, "potassiumMg": 216.0, "calciumMg": 13.0, "ironMg": 3.97, "waterG": 69.6}},
    "RP-MT-037": {"sourceRecordId": "05160", "nutrients": {"caloriesKcal": 294.0, "carbsG": 0.0, "proteinG": 18.5, "fatG": 23.8, "fiberG": 0.0, "saturatedFatG": 8.43, "monounsaturatedFatG": 9.72, "polyunsaturatedFatG": 3.07, "cholesterolMg": 95.0, "sodiumMg": 54.0, "potassiumMg": 199.0, "calciumMg": 12.0, "ironMg": 3.54, "waterG": 56.6}},
    "RP-MT-038": {"sourceRecordId": "05306", "nutrients": {"caloriesKcal": 203.0, "carbsG": 0.0, "proteinG": 27.4, "fatG": 10.4, "fiberG": 0.0, "saturatedFatG": 2.67, "transFatG": 0.134, "monounsaturatedFatG": 3.46, "polyunsaturatedFatG": 2.92, "cholesterolMg": 93.0, "sodiumMg": 78.0, "potassiumMg": 294.0, "calciumMg": 28.0, "ironMg": 1.52, "waterG": 62.1}},
    "RP-MT-040": {"sourceRecordId": "05140", "nutrients": {"caloriesKcal": 337.0, "carbsG": 0.0, "proteinG": 19.0, "fatG": 28.4, "fiberG": 0.0, "saturatedFatG": 9.67, "monounsaturatedFatG": 12.9, "polyunsaturatedFatG": 3.65, "cholesterolMg": 84.0, "sodiumMg": 59.0, "potassiumMg": 204.0, "calciumMg": 11.0, "ironMg": 2.7, "waterG": 51.8}},
    "RP-MT-041": {"sourceRecordId": "05024", "nutrients": {"caloriesKcal": 154.0, "carbsG": 0.0, "proteinG": 30.4, "fatG": 2.68, "fiberG": 0.0, "saturatedFatG": 0.67, "transFatG": 0.13, "monounsaturatedFatG": 0.528, "polyunsaturatedFatG": 0.353, "cholesterolMg": 370.0, "sodiumMg": 56.0, "potassiumMg": 179.0, "calciumMg": 17.0, "ironMg": 3.19, "waterG": 67.9}},
    "RP-MT-042": {"sourceRecordId": "05023", "nutrients": {"caloriesKcal": 94.0, "carbsG": 0.0, "proteinG": 17.7, "fatG": 2.06, "fiberG": 0.0, "saturatedFatG": 0.529, "transFatG": 0.06, "monounsaturatedFatG": 0.512, "polyunsaturatedFatG": 0.357, "cholesterolMg": 240.0, "sodiumMg": 69.0, "potassiumMg": 237.0, "calciumMg": 11.0, "ironMg": 2.49, "waterG": 79.3}},
    "RP-MT-043": {"sourceRecordId": "05073", "nutrients": {"caloriesKcal": 155.0, "carbsG": 0.0, "proteinG": 24.2, "fatG": 5.7, "fiberG": 0.0, "saturatedFatG": 1.5, "transFatG": 0.03, "monounsaturatedFatG": 2.18, "polyunsaturatedFatG": 1.2, "cholesterolMg": 130.0, "sodiumMg": 128.0, "potassiumMg": 256.0, "calciumMg": 11.0, "ironMg": 1.14, "waterG": 69.9}},
    "RP-MT-044": {"sourceRecordId": "05073", "nutrients": {"caloriesKcal": 155.0, "carbsG": 0.0, "proteinG": 24.2, "fatG": 5.7, "fiberG": 0.0, "saturatedFatG": 1.5, "transFatG": 0.03, "monounsaturatedFatG": 2.18, "polyunsaturatedFatG": 1.2, "cholesterolMg": 130.0, "sodiumMg": 128.0, "potassiumMg": 256.0, "calciumMg": 11.0, "ironMg": 1.14, "waterG": 69.9}},
    "RP-MT-045": {"sourceRecordId": "05099", "nutrients": {"caloriesKcal": 195.0, "carbsG": 0.0, "proteinG": 25.0, "fatG": 9.79, "fiberG": 0.0, "saturatedFatG": 2.71, "monounsaturatedFatG": 3.7, "polyunsaturatedFatG": 2.24, "cholesterolMg": 90.0, "sodiumMg": 75.0, "potassiumMg": 183.0, "calciumMg": 11.0, "ironMg": 1.42, "waterG": 65.6}},
    "RP-MT-046": {"sourceRecordId": "05065", "nutrients": {"caloriesKcal": 151.0, "carbsG": 0.0, "proteinG": 29.0, "fatG": 3.03, "fiberG": 0.0, "saturatedFatG": 0.85, "monounsaturatedFatG": 1.03, "polyunsaturatedFatG": 0.66, "cholesterolMg": 77.0, "sodiumMg": 63.0, "potassiumMg": 187.0, "calciumMg": 13.0, "ironMg": 0.88, "waterG": 68.3}},
    "RP-MT-048": {"sourceRecordId": "05305", "nutrients": {"caloriesKcal": 148.0, "carbsG": 0.0, "proteinG": 19.7, "fatG": 7.66, "fiberG": 0.0, "saturatedFatG": 2.02, "transFatG": 0.103, "monounsaturatedFatG": 2.64, "polyunsaturatedFatG": 2.2, "cholesterolMg": 69.0, "sodiumMg": 58.0, "potassiumMg": 237.0, "calciumMg": 19.0, "ironMg": 1.09, "waterG": 72.4}},
    "RP-MT-049": {"sourceRecordId": "05141", "nutrients": {"caloriesKcal": 135.0, "carbsG": 0.94, "proteinG": 18.3, "fatG": 5.95, "fiberG": 0.0, "saturatedFatG": 2.32, "monounsaturatedFatG": 1.54, "polyunsaturatedFatG": 0.75, "cholesterolMg": 77.0, "sodiumMg": 74.0, "potassiumMg": 271.0, "calciumMg": 11.0, "ironMg": 2.4, "waterG": 73.8}},
    "RP-MT-050": {"sourceRecordId": "05220", "nutrients": {"caloriesKcal": 147.0, "carbsG": 0.0, "proteinG": 30.1, "fatG": 2.08, "fiberG": 0.0, "saturatedFatG": 0.593, "transFatG": 0.024, "monounsaturatedFatG": 0.626, "polyunsaturatedFatG": 0.528, "cholesterolMg": 80.0, "sodiumMg": 99.0, "potassiumMg": 249.0, "calciumMg": 9.0, "ironMg": 0.71, "waterG": 67.9}},
    "RP-MT-051": {"sourceRecordId": "15015", "nutrients": {"caloriesKcal": 82.0, "carbsG": 0.0, "proteinG": 17.8, "fatG": 0.67, "fiberG": 0.0, "saturatedFatG": 0.131, "monounsaturatedFatG": 0.094, "polyunsaturatedFatG": 0.231, "cholesterolMg": 43.0, "sodiumMg": 54.0, "potassiumMg": 413.0, "calciumMg": 16.0, "ironMg": 0.38, "waterG": 81.2}},
    "RP-MT-052": {"sourceRecordId": "15088", "nutrients": {"caloriesKcal": 208.0, "carbsG": 0.0, "proteinG": 24.6, "fatG": 11.4, "fiberG": 0.0, "saturatedFatG": 1.53, "monounsaturatedFatG": 3.87, "polyunsaturatedFatG": 5.15, "cholesterolMg": 142.0, "sodiumMg": 307.0, "potassiumMg": 397.0, "calciumMg": 382.0, "ironMg": 2.92, "waterG": 59.6}},
    "RP-MT-053": {"sourceRecordId": "15047", "nutrients": {"caloriesKcal": 262.0, "carbsG": 0.0, "proteinG": 23.8, "fatG": 17.8, "fiberG": 0.0, "saturatedFatG": 4.18, "monounsaturatedFatG": 7.01, "polyunsaturatedFatG": 4.3, "cholesterolMg": 75.0, "sodiumMg": 83.0, "potassiumMg": 401.0, "calciumMg": 15.0, "ironMg": 1.57, "waterG": 53.3}},
    "RP-MT-054": {"sourceRecordId": "15046", "nutrients": {"caloriesKcal": 205.0, "carbsG": 0.0, "proteinG": 18.6, "fatG": 13.9, "fiberG": 0.0, "saturatedFatG": 3.26, "monounsaturatedFatG": 5.46, "polyunsaturatedFatG": 3.35, "cholesterolMg": 70.0, "sodiumMg": 90.0, "potassiumMg": 314.0, "calciumMg": 12.0, "ironMg": 1.63, "waterG": 63.6}},
    "RP-MT-055": {"sourceRecordId": "15262", "nutrients": {"caloriesKcal": 128.0, "carbsG": 0.0, "proteinG": 26.2, "fatG": 2.65, "fiberG": 0.0, "saturatedFatG": 0.94, "monounsaturatedFatG": 0.955, "polyunsaturatedFatG": 0.6, "cholesterolMg": 57.0, "sodiumMg": 56.0, "potassiumMg": 380.0, "calciumMg": 14.0, "ironMg": 0.69, "waterG": 71.6}},
    "RP-MT-056": {"sourceRecordId": "15261", "nutrients": {"caloriesKcal": 96.0, "carbsG": 0.0, "proteinG": 20.1, "fatG": 1.7, "fiberG": 0.0, "saturatedFatG": 0.585, "monounsaturatedFatG": 0.498, "polyunsaturatedFatG": 0.363, "cholesterolMg": 50.0, "sodiumMg": 52.0, "potassiumMg": 302.0, "calciumMg": 10.0, "ironMg": 0.56, "waterG": 78.1}},
    "RP-MT-057": {"sourceRecordId": "15119", "nutrients": {"caloriesKcal": 198.0, "carbsG": 0.0, "proteinG": 29.1, "fatG": 8.21, "fiberG": 0.0, "saturatedFatG": 1.53, "monounsaturatedFatG": 2.95, "polyunsaturatedFatG": 2.88, "cholesterolMg": 18.0, "sodiumMg": 416.0, "potassiumMg": 207.0, "calciumMg": 13.0, "ironMg": 1.39, "waterG": 59.8}},
    "RP-MT-058": {"sourceRecordId": "15221", "nutrients": {"caloriesKcal": 130.0, "carbsG": 0.0, "proteinG": 29.2, "fatG": 0.59, "fiberG": 0.0, "saturatedFatG": 0.205, "transFatG": 0.02, "monounsaturatedFatG": 0.138, "polyunsaturatedFatG": 0.175, "cholesterolMg": 47.0, "sodiumMg": 54.0, "potassiumMg": 527.0, "calciumMg": 4.0, "ironMg": 0.92, "waterG": 69.0}},
    "RP-MT-059": {"sourceRecordId": "15127", "nutrients": {"caloriesKcal": 109.0, "carbsG": 0.0, "proteinG": 24.4, "fatG": 0.49, "fiberG": 0.0, "saturatedFatG": 0.172, "transFatG": 0.016, "monounsaturatedFatG": 0.116, "polyunsaturatedFatG": 0.147, "cholesterolMg": 39.0, "sodiumMg": 45.0, "potassiumMg": 441.0, "calciumMg": 4.0, "ironMg": 0.77, "waterG": 74.0}},
    "RP-MT-060": {"sourceRecordId": "15209", "nutrients": {"caloriesKcal": 182.0, "carbsG": 0.0, "proteinG": 25.4, "fatG": 8.13, "fiberG": 0.0, "saturatedFatG": 1.26, "monounsaturatedFatG": 2.7, "polyunsaturatedFatG": 3.26, "cholesterolMg": 71.0, "sodiumMg": 56.0, "potassiumMg": 628.0, "calciumMg": 15.0, "ironMg": 1.03, "waterG": 59.6}},
    "RP-MT-061": {"sourceRecordId": "15209", "nutrients": {"caloriesKcal": 182.0, "carbsG": 0.0, "proteinG": 25.4, "fatG": 8.13, "fiberG": 0.0, "saturatedFatG": 1.26, "monounsaturatedFatG": 2.7, "polyunsaturatedFatG": 3.26, "cholesterolMg": 71.0, "sodiumMg": 56.0, "potassiumMg": 628.0, "calciumMg": 15.0, "ironMg": 1.03, "waterG": 59.6}},
    "RP-MT-062": {"sourceRecordId": "15076", "nutrients": {"caloriesKcal": 142.0, "carbsG": 0.0, "proteinG": 19.8, "fatG": 6.34, "fiberG": 0.0, "saturatedFatG": 0.981, "monounsaturatedFatG": 2.1, "polyunsaturatedFatG": 2.54, "cholesterolMg": 55.0, "sodiumMg": 44.0, "potassiumMg": 490.0, "calciumMg": 12.0, "ironMg": 0.8, "waterG": 68.5}},
    "RP-MT-064": {"sourceRecordId": "17178", "nutrients": {"caloriesKcal": 197.0, "carbsG": 0.0, "proteinG": 29.1, "fatG": 8.05, "fiberG": 0.0, "saturatedFatG": 2.4, "monounsaturatedFatG": 2.17, "polyunsaturatedFatG": 1.56, "cholesterolMg": 82.0, "sodiumMg": 47.0, "potassiumMg": 383.0, "calciumMg": 19.0, "ironMg": 2.27, "waterG": 60.6}},
    "RP-MT-065": {"sourceRecordId": "17179", "nutrients": {"caloriesKcal": 206.0, "carbsG": 0.0, "proteinG": 30.4, "fatG": 8.41, "fiberG": 0.0, "saturatedFatG": 2.51, "monounsaturatedFatG": 2.27, "polyunsaturatedFatG": 1.63, "cholesterolMg": 86.0, "sodiumMg": 37.0, "potassiumMg": 300.0, "calciumMg": 20.0, "ironMg": 2.37, "waterG": 58.8}},
    "RP-MT-066": {"sourceRecordId": "17177", "nutrients": {"caloriesKcal": 136.0, "carbsG": 0.0, "proteinG": 20.0, "fatG": 5.55, "fiberG": 0.0, "saturatedFatG": 1.66, "monounsaturatedFatG": 1.5, "polyunsaturatedFatG": 1.08, "cholesterolMg": 57.0, "sodiumMg": 41.0, "potassiumMg": 330.0, "calciumMg": 13.0, "ironMg": 1.57, "waterG": 72.8}},
    "RP-MT-069": {"sourceRecordId": "23640", "nutrients": {"caloriesKcal": 94.0, "carbsG": 1.99, "proteinG": 11.7, "fatG": 4.05, "fiberG": 0.0, "saturatedFatG": 1.36, "transFatG": 0.2, "monounsaturatedFatG": 1.6, "polyunsaturatedFatG": 0.208, "cholesterolMg": 157.0, "sodiumMg": 68.0, "potassiumMg": 42.0, "calciumMg": 81.0, "ironMg": 0.66, "waterG": 81.6}},
    "RP-MT-070": {"sourceRecordId": "13324", "nutrients": {"caloriesKcal": 158.0, "carbsG": 0.0, "proteinG": 27.3, "fatG": 4.65, "fiberG": 0.0, "saturatedFatG": 1.44, "transFatG": 0.27, "monounsaturatedFatG": 0.96, "polyunsaturatedFatG": 1.14, "cholesterolMg": 716.0, "sodiumMg": 94.0, "potassiumMg": 135.0, "calciumMg": 19.0, "ironMg": 5.8, "waterG": 66.9}},
    "RP-MT-072": {"sourceRecordId": "13355", "nutrients": {"caloriesKcal": 147.0, "carbsG": 0.36, "proteinG": 21.8, "fatG": 5.82, "fiberG": 0.0, "saturatedFatG": 2.68, "monounsaturatedFatG": 2.12, "polyunsaturatedFatG": 0.145, "cholesterolMg": 68.0, "sodiumMg": 1080.0, "potassiumMg": 210.0, "calciumMg": 10.0, "ironMg": 2.22, "waterG": 69.5}},
    "RP-MT-073": {"sourceRecordId": "17169", "nutrients": {"caloriesKcal": 143.0, "carbsG": 0.0, "proteinG": 27.1, "fatG": 3.03, "fiberG": 0.0, "saturatedFatG": 0.93, "monounsaturatedFatG": 1.36, "polyunsaturatedFatG": 0.23, "cholesterolMg": 75.0, "sodiumMg": 86.0, "potassiumMg": 405.0, "calciumMg": 17.0, "ironMg": 3.73, "waterG": 68.2}},
    "RP-MT-074": {"sourceRecordId": "17168", "nutrients": {"caloriesKcal": 109.0, "carbsG": 0.0, "proteinG": 20.6, "fatG": 2.31, "fiberG": 0.0, "saturatedFatG": 0.71, "monounsaturatedFatG": 1.03, "polyunsaturatedFatG": 0.17, "cholesterolMg": 57.0, "sodiumMg": 82.0, "potassiumMg": 385.0, "calciumMg": 13.0, "ironMg": 2.83, "waterG": 75.8}},
    "RP-MT-075": {"sourceRecordId": "13326", "nutrients": {"caloriesKcal": 191.0, "carbsG": 5.13, "proteinG": 29.1, "fatG": 5.26, "fiberG": 0.0, "saturatedFatG": 2.95, "transFatG": 0.365, "monounsaturatedFatG": 1.12, "polyunsaturatedFatG": 1.11, "cholesterolMg": 396.0, "sodiumMg": 79.0, "potassiumMg": 352.0, "calciumMg": 6.0, "ironMg": 6.54, "waterG": 58.8}},
    "RP-MT-078": {"sourceRecordId": "15084", "nutrients": {"caloriesKcal": 129.0, "carbsG": 0.0, "proteinG": 19.7, "fatG": 4.97, "fiberG": 0.0, "saturatedFatG": 0.862, "transFatG": 0.026, "monounsaturatedFatG": 1.2, "polyunsaturatedFatG": 1.42, "cholesterolMg": 55.0, "sodiumMg": 403.0, "potassiumMg": 344.0, "calciumMg": 215.0, "ironMg": 0.64, "waterG": 74.0}},
    "RP-MT-079": {"sourceRecordId": "15077", "nutrients": {"caloriesKcal": 117.0, "carbsG": 0.0, "proteinG": 18.3, "fatG": 4.32, "fiberG": 0.0, "saturatedFatG": 0.929, "monounsaturatedFatG": 2.02, "polyunsaturatedFatG": 0.995, "cholesterolMg": 23.0, "sodiumMg": 672.0, "potassiumMg": 175.0, "calciumMg": 11.0, "ironMg": 0.85, "waterG": 72.0}},
    "RP-MT-082": {"sourceRecordId": "15012", "nutrients": {"caloriesKcal": 264.0, "carbsG": 4.0, "proteinG": 24.6, "fatG": 17.9, "fiberG": 0.0, "saturatedFatG": 4.06, "monounsaturatedFatG": 4.63, "polyunsaturatedFatG": 7.4, "cholesterolMg": 588.0, "sodiumMg": 1500.0, "potassiumMg": 181.0, "calciumMg": 275.0, "ironMg": 11.9, "waterG": 47.5}},
    "RP-MT-083": {"sourceRecordId": "15001", "nutrients": {"caloriesKcal": 131.0, "carbsG": 0.0, "proteinG": 20.4, "fatG": 4.84, "fiberG": 0.0, "saturatedFatG": 1.28, "monounsaturatedFatG": 1.18, "polyunsaturatedFatG": 1.64, "cholesterolMg": 60.0, "sodiumMg": 104.0, "potassiumMg": 383.0, "calciumMg": 147.0, "ironMg": 3.25, "waterG": 73.4}},
    "RP-MT-086": {"sourceRecordId": "15110", "nutrients": {"caloriesKcal": 144.0, "carbsG": 0.0, "proteinG": 19.7, "fatG": 6.65, "fiberG": 0.0, "saturatedFatG": 1.61, "transFatG": 0.047, "monounsaturatedFatG": 3.0, "polyunsaturatedFatG": 1.15, "cholesterolMg": 66.0, "sodiumMg": 81.0, "potassiumMg": 418.0, "calciumMg": 5.0, "ironMg": 0.38, "waterG": 73.4}},
    "RP-MT-087": {"sourceRecordId": "15065", "nutrients": {"caloriesKcal": 92.0, "carbsG": 0.0, "proteinG": 19.4, "fatG": 0.98, "fiberG": 0.0, "saturatedFatG": 0.135, "monounsaturatedFatG": 0.112, "polyunsaturatedFatG": 0.483, "cholesterolMg": 71.0, "sodiumMg": 86.0, "potassiumMg": 356.0, "calciumMg": 60.0, "ironMg": 0.46, "waterG": 78.2}},
    "RP-MT-088": {"sourceRecordId": "15010", "nutrients": {"caloriesKcal": 95.0, "carbsG": 0.0, "proteinG": 16.4, "fatG": 2.82, "fiberG": 0.0, "saturatedFatG": 0.722, "monounsaturatedFatG": 0.844, "polyunsaturatedFatG": 0.865, "cholesterolMg": 58.0, "sodiumMg": 43.0, "potassiumMg": 358.0, "calciumMg": 14.0, "ironMg": 0.3, "waterG": 80.4}},
    "RP-MT-089": {"sourceRecordId": "15036", "nutrients": {"caloriesKcal": 91.0, "carbsG": 0.0, "proteinG": 18.6, "fatG": 1.33, "fiberG": 0.0, "saturatedFatG": 0.292, "monounsaturatedFatG": 0.471, "polyunsaturatedFatG": 0.29, "cholesterolMg": 49.0, "sodiumMg": 68.0, "potassiumMg": 435.0, "calciumMg": 7.0, "ironMg": 0.16, "waterG": 80.3}},
    "RP-MT-090": {"sourceRecordId": "90240", "nutrients": {"caloriesKcal": 111.0, "carbsG": 5.41, "proteinG": 20.5, "fatG": 0.84, "fiberG": 0.0, "saturatedFatG": 0.218, "transFatG": 0.009, "monounsaturatedFatG": 0.082, "polyunsaturatedFatG": 0.222, "cholesterolMg": 41.0, "sodiumMg": 667.0, "potassiumMg": 314.0, "calciumMg": 10.0, "ironMg": 0.58, "waterG": 70.2}},
    "RP-MT-091": {"sourceRecordId": "15148", "nutrients": {"caloriesKcal": 89.0, "carbsG": 0.0, "proteinG": 19.0, "fatG": 0.86, "fiberG": 0.0, "saturatedFatG": 0.208, "transFatG": 0.013, "monounsaturatedFatG": 0.253, "polyunsaturatedFatG": 0.34, "cholesterolMg": 146.0, "sodiumMg": 486.0, "potassiumMg": 230.0, "calciumMg": 96.0, "ironMg": 0.29, "waterG": 78.1}},
    "RP-MT-092": {"sourceRecordId": "15040", "nutrients": {"caloriesKcal": 203.0, "carbsG": 0.0, "proteinG": 23.0, "fatG": 11.6, "fiberG": 0.0, "saturatedFatG": 2.62, "monounsaturatedFatG": 4.79, "polyunsaturatedFatG": 2.74, "cholesterolMg": 77.0, "sodiumMg": 115.0, "potassiumMg": 419.0, "calciumMg": 74.0, "ironMg": 1.41, "waterG": 64.2}},
    "RP-MT-093": {"sourceRecordId": "15039", "nutrients": {"caloriesKcal": 158.0, "carbsG": 0.0, "proteinG": 18.0, "fatG": 9.04, "fiberG": 0.0, "saturatedFatG": 2.04, "monounsaturatedFatG": 3.74, "polyunsaturatedFatG": 2.13, "cholesterolMg": 60.0, "sodiumMg": 90.0, "potassiumMg": 327.0, "calciumMg": 57.0, "ironMg": 1.1, "waterG": 72.0}},
    "RP-MT-094": {"sourceRecordId": "15002", "nutrients": {"caloriesKcal": 210.0, "carbsG": 0.0, "proteinG": 28.9, "fatG": 9.71, "fiberG": 0.0, "saturatedFatG": 2.2, "monounsaturatedFatG": 3.77, "polyunsaturatedFatG": 2.56, "cholesterolMg": 85.0, "sodiumMg": 3670.0, "potassiumMg": 544.0, "calciumMg": 232.0, "ironMg": 4.63, "waterG": 50.3}},
    "RP-MT-095": {"sourceRecordId": "15219", "nutrients": {"caloriesKcal": 190.0, "carbsG": 0.0, "proteinG": 26.6, "fatG": 8.47, "fiberG": 0.0, "saturatedFatG": 1.47, "monounsaturatedFatG": 4.17, "polyunsaturatedFatG": 1.92, "cholesterolMg": 74.0, "sodiumMg": 67.0, "potassiumMg": 463.0, "calciumMg": 55.0, "ironMg": 1.92, "waterG": 63.4}},
    "RP-MT-096": {"sourceRecordId": "15114", "nutrients": {"caloriesKcal": 148.0, "carbsG": 0.0, "proteinG": 20.8, "fatG": 6.61, "fiberG": 0.0, "saturatedFatG": 1.15, "monounsaturatedFatG": 3.25, "polyunsaturatedFatG": 1.5, "cholesterolMg": 58.0, "sodiumMg": 52.0, "potassiumMg": 361.0, "calciumMg": 43.0, "ironMg": 1.5, "waterG": 71.4}},
    "RP-MT-097": {"sourceRecordId": "15230", "nutrients": {"caloriesKcal": 164.0, "carbsG": 4.4, "proteinG": 29.8, "fatG": 2.08, "fiberG": 0.0, "saturatedFatG": 0.453, "monounsaturatedFatG": 0.324, "polyunsaturatedFatG": 0.477, "cholesterolMg": 96.0, "sodiumMg": 460.0, "potassiumMg": 630.0, "calciumMg": 106.0, "ironMg": 9.54, "waterG": 60.5}},
    "RP-MT-100": {"sourceRecordId": "15140", "nutrients": {"caloriesKcal": 83.0, "carbsG": 0.0, "proteinG": 17.9, "fatG": 0.74, "fiberG": 0.0, "saturatedFatG": 0.201, "transFatG": 0.014, "monounsaturatedFatG": 0.129, "polyunsaturatedFatG": 0.258, "cholesterolMg": 97.0, "sodiumMg": 395.0, "potassiumMg": 259.0, "calciumMg": 91.0, "ironMg": 0.5, "waterG": 79.7}},
    "RP-MT-102": {"sourceRecordId": "15175", "nutrients": {"caloriesKcal": 92.0, "carbsG": 3.08, "proteinG": 15.6, "fatG": 1.38, "fiberG": 0.0, "saturatedFatG": 0.358, "monounsaturatedFatG": 0.107, "polyunsaturatedFatG": 0.524, "cholesterolMg": 233.0, "sodiumMg": 44.0, "potassiumMg": 246.0, "calciumMg": 32.0, "ironMg": 0.68, "waterG": 78.6}},
    "RP-MT-103": {"sourceRecordId": "15271", "nutrients": {"caloriesKcal": 99.0, "carbsG": 0.2, "proteinG": 24.0, "fatG": 0.28, "saturatedFatG": 0.056, "transFatG": 0.002, "monounsaturatedFatG": 0.048, "polyunsaturatedFatG": 0.079, "cholesterolMg": 189.0, "sodiumMg": 111.0, "potassiumMg": 259.0, "calciumMg": 70.0, "ironMg": 0.51, "waterG": 74.3}},
    "RP-MT-104": {"sourceRecordId": "15271", "nutrients": {"caloriesKcal": 99.0, "carbsG": 0.2, "proteinG": 24.0, "fatG": 0.28, "saturatedFatG": 0.056, "transFatG": 0.002, "monounsaturatedFatG": 0.048, "polyunsaturatedFatG": 0.079, "cholesterolMg": 189.0, "sodiumMg": 111.0, "potassiumMg": 259.0, "calciumMg": 70.0, "ironMg": 0.51, "waterG": 74.3}},
    "RP-MT-105": {"sourceRecordId": "15270", "nutrients": {"caloriesKcal": 85.0, "carbsG": 0.0, "proteinG": 20.1, "fatG": 0.51, "saturatedFatG": 0.101, "transFatG": 0.004, "monounsaturatedFatG": 0.086, "polyunsaturatedFatG": 0.152, "cholesterolMg": 161.0, "sodiumMg": 119.0, "potassiumMg": 264.0, "calciumMg": 64.0, "ironMg": 0.52, "waterG": 78.4}},
    "RP-MT-106": {"sourceRecordId": "15092", "nutrients": {"caloriesKcal": 124.0, "carbsG": 0.0, "proteinG": 23.6, "fatG": 2.56, "fiberG": 0.0, "saturatedFatG": 0.655, "monounsaturatedFatG": 0.544, "polyunsaturatedFatG": 0.953, "cholesterolMg": 53.0, "sodiumMg": 87.0, "potassiumMg": 328.0, "calciumMg": 13.0, "ironMg": 0.37, "waterG": 72.1}},
    "RP-MT-107": {"sourceRecordId": "15091", "nutrients": {"caloriesKcal": 97.0, "carbsG": 0.0, "proteinG": 18.4, "fatG": 2.0, "fiberG": 0.0, "saturatedFatG": 0.511, "monounsaturatedFatG": 0.424, "polyunsaturatedFatG": 0.743, "cholesterolMg": 41.0, "sodiumMg": 68.0, "potassiumMg": 256.0, "calciumMg": 10.0, "ironMg": 0.29, "waterG": 78.3}},
    "RP-MT-108": {"sourceRecordId": "15016", "nutrients": {"caloriesKcal": 105.0, "carbsG": 0.0, "proteinG": 22.8, "fatG": 0.86, "fiberG": 0.0, "saturatedFatG": 0.168, "monounsaturatedFatG": 0.124, "polyunsaturatedFatG": 0.292, "cholesterolMg": 55.0, "sodiumMg": 78.0, "potassiumMg": 244.0, "calciumMg": 14.0, "ironMg": 0.49, "waterG": 75.9}},
    "RP-MT-110": {"sourceRecordId": "05009", "nutrients": {"caloriesKcal": 239.0, "carbsG": 0.0, "proteinG": 27.3, "fatG": 13.6, "fiberG": 0.0, "saturatedFatG": 3.79, "monounsaturatedFatG": 5.34, "polyunsaturatedFatG": 2.97, "cholesterolMg": 88.0, "sodiumMg": 82.0, "potassiumMg": 223.0, "calciumMg": 15.0, "ironMg": 1.26, "waterG": 59.4}},
    "RP-MT-112": {"sourceRecordId": "05103", "nutrients": {"caloriesKcal": 254.0, "carbsG": 0.0, "proteinG": 23.8, "fatG": 16.9, "fiberG": 0.0, "saturatedFatG": 4.98, "transFatG": 0.084, "monounsaturatedFatG": 7.71, "polyunsaturatedFatG": 3.59, "cholesterolMg": 141.0, "sodiumMg": 98.0, "potassiumMg": 212.0, "calciumMg": 18.0, "ironMg": 0.84, "waterG": 59.4}},
    "RP-MT-113": {"sourceRecordId": "05100", "nutrients": {"caloriesKcal": 191.0, "carbsG": 0.0, "proteinG": 17.5, "fatG": 12.8, "fiberG": 0.0, "saturatedFatG": 3.54, "transFatG": 0.061, "monounsaturatedFatG": 5.42, "polyunsaturatedFatG": 2.5, "cholesterolMg": 111.0, "sodiumMg": 84.0, "potassiumMg": 187.0, "calciumMg": 11.0, "ironMg": 0.46, "waterG": 69.2}},
    "RP-MT-114": {"sourceRecordId": "05072", "nutrients": {"caloriesKcal": 195.0, "carbsG": 0.0, "proteinG": 28.6, "fatG": 8.08, "fiberG": 0.0, "saturatedFatG": 2.13, "monounsaturatedFatG": 2.94, "polyunsaturatedFatG": 1.97, "cholesterolMg": 94.0, "sodiumMg": 96.0, "potassiumMg": 249.0, "calciumMg": 12.0, "ironMg": 1.32, "waterG": 62.2}},
    "RP-MT-122": {"sourceRecordId": "01124", "nutrients": {"caloriesKcal": 52.0, "carbsG": 0.73, "proteinG": 10.9, "fatG": 0.17, "fiberG": 0.0, "saturatedFatG": 0.0, "monounsaturatedFatG": 0.0, "polyunsaturatedFatG": 0.0, "cholesterolMg": 0.0, "sodiumMg": 166.0, "potassiumMg": 163.0, "calciumMg": 7.0, "ironMg": 0.08, "waterG": 87.6}},
    "RP-MT-124": {"sourceRecordId": "15042", "nutrients": {"caloriesKcal": 217.0, "carbsG": 0.0, "proteinG": 24.6, "fatG": 12.4, "fiberG": 0.0, "saturatedFatG": 2.79, "monounsaturatedFatG": 5.11, "polyunsaturatedFatG": 2.92, "cholesterolMg": 82.0, "sodiumMg": 918.0, "potassiumMg": 447.0, "calciumMg": 84.0, "ironMg": 1.51, "waterG": 59.7}},
    "RP-MT-126": {"sourceRecordId": "15028", "nutrients": {"caloriesKcal": 70.0, "carbsG": 0.0, "proteinG": 12.4, "fatG": 1.93, "fiberG": 0.0, "saturatedFatG": 0.441, "transFatG": 0.011, "monounsaturatedFatG": 0.535, "polyunsaturatedFatG": 0.374, "cholesterolMg": 45.0, "sodiumMg": 296.0, "potassiumMg": 160.0, "calciumMg": 21.0, "ironMg": 0.18, "waterG": 84.6}},
    "RP-MT-129": {"sourceRecordId": "15032", "nutrients": {"caloriesKcal": 118.0, "carbsG": 0.0, "proteinG": 24.8, "fatG": 1.3, "fiberG": 0.0, "saturatedFatG": 0.299, "monounsaturatedFatG": 0.268, "polyunsaturatedFatG": 0.403, "cholesterolMg": 47.0, "sodiumMg": 53.0, "potassiumMg": 475.0, "calciumMg": 21.0, "ironMg": 1.14, "waterG": 73.4}},
    "RP-MT-130": {"sourceRecordId": "15031", "nutrients": {"caloriesKcal": 92.0, "carbsG": 0.0, "proteinG": 19.4, "fatG": 1.02, "fiberG": 0.0, "saturatedFatG": 0.233, "monounsaturatedFatG": 0.202, "polyunsaturatedFatG": 0.321, "cholesterolMg": 37.0, "sodiumMg": 53.0, "potassiumMg": 483.0, "calciumMg": 27.0, "ironMg": 0.89, "waterG": 79.2}},
    "RP-MT-143": {"sourceRecordId": "13340", "nutrients": {"caloriesKcal": 284.0, "carbsG": 0.0, "proteinG": 19.3, "fatG": 22.3, "fiberG": 0.0, "saturatedFatG": 8.12, "transFatG": 0.84, "monounsaturatedFatG": 10.1, "polyunsaturatedFatG": 0.746, "cholesterolMg": 132.0, "sodiumMg": 65.0, "potassiumMg": 184.0, "calciumMg": 5.0, "ironMg": 2.61, "waterG": 57.9}},
    "RP-MT-147": {"sourceRecordId": "13347", "nutrients": {"caloriesKcal": 251.0, "carbsG": 0.47, "proteinG": 18.2, "fatG": 19.0, "fiberG": 0.0, "saturatedFatG": 6.34, "monounsaturatedFatG": 9.22, "polyunsaturatedFatG": 0.67, "cholesterolMg": 98.0, "sodiumMg": 973.0, "potassiumMg": 145.0, "calciumMg": 8.0, "ironMg": 1.86, "waterG": 59.8}},
    "RP-MT-163": {"sourceRecordId": "05014", "nutrients": {"caloriesKcal": 177.0, "carbsG": 0.0, "proteinG": 27.3, "fatG": 6.71, "fiberG": 0.0, "saturatedFatG": 1.84, "monounsaturatedFatG": 2.39, "polyunsaturatedFatG": 1.54, "cholesterolMg": 83.0, "sodiumMg": 70.0, "potassiumMg": 180.0, "calciumMg": 14.0, "ironMg": 1.17, "waterG": 66.8}},
    "RP-MT-164": {"sourceRecordId": "05006", "nutrients": {"caloriesKcal": 215.0, "carbsG": 0.0, "proteinG": 18.6, "fatG": 15.1, "fiberG": 0.0, "saturatedFatG": 4.31, "transFatG": 0.097, "monounsaturatedFatG": 6.24, "polyunsaturatedFatG": 3.23, "cholesterolMg": 75.0, "sodiumMg": 70.0, "potassiumMg": 189.0, "calciumMg": 11.0, "ironMg": 0.9, "waterG": 66.0}},
    "RP-MT-166": {"sourceRecordId": "01125", "nutrients": {"caloriesKcal": 322.0, "carbsG": 3.59, "proteinG": 15.9, "fatG": 26.5, "fiberG": 0.0, "saturatedFatG": 9.55, "monounsaturatedFatG": 11.7, "polyunsaturatedFatG": 4.2, "cholesterolMg": 1080.0, "sodiumMg": 48.0, "potassiumMg": 109.0, "calciumMg": 129.0, "ironMg": 2.73, "waterG": 52.3}},
    "RP-MT-179": {"sourceRecordId": "16426", "nutrients": {"caloriesKcal": 144.0, "carbsG": 2.78, "proteinG": 17.3, "fatG": 8.72, "fiberG": 2.3, "saturatedFatG": 1.26, "transFatG": 0.0, "monounsaturatedFatG": 1.92, "polyunsaturatedFatG": 4.92, "cholesterolMg": 0.0, "sodiumMg": 14.0, "potassiumMg": 237.0, "calciumMg": 683.0, "ironMg": 2.66, "waterG": 69.8}},
    "RP-MT-183": {"sourceRecordId": "01036", "nutrients": {"caloriesKcal": 150.0, "carbsG": 7.27, "proteinG": 7.54, "fatG": 10.2, "fiberG": 0.0, "saturatedFatG": 6.42, "transFatG": 0.333, "monounsaturatedFatG": 2.66, "polyunsaturatedFatG": 0.445, "cholesterolMg": 49.0, "sodiumMg": 110.0, "potassiumMg": 219.0, "calciumMg": 206.0, "ironMg": 0.13, "waterG": 73.7}},
    "RP-MT-184": {"sourceRecordId": "01019", "nutrients": {"caloriesKcal": 265.0, "carbsG": 3.88, "proteinG": 14.2, "fatG": 21.5, "fiberG": 0.0, "saturatedFatG": 13.3, "monounsaturatedFatG": 4.62, "polyunsaturatedFatG": 0.591, "cholesterolMg": 89.0, "sodiumMg": 1140.0, "potassiumMg": 62.0, "calciumMg": 493.0, "ironMg": 0.65, "waterG": 55.2}},
    "RP-MT-185": {"sourceRecordId": "01026", "nutrients": {"caloriesKcal": 299.0, "carbsG": 2.4, "proteinG": 22.2, "fatG": 22.1, "fiberG": 0.0, "saturatedFatG": 13.9, "monounsaturatedFatG": 6.57, "polyunsaturatedFatG": 0.765, "cholesterolMg": 79.0, "sodiumMg": 486.0, "potassiumMg": 76.0, "calciumMg": 505.0, "ironMg": 0.44, "waterG": 50.0}},
    "RP-MT-191": {"sourceRecordId": "01129", "nutrients": {"caloriesKcal": 155.0, "carbsG": 1.12, "proteinG": 12.6, "fatG": 10.6, "fiberG": 0.0, "saturatedFatG": 3.27, "monounsaturatedFatG": 4.08, "polyunsaturatedFatG": 1.41, "cholesterolMg": 373.0, "sodiumMg": 124.0, "potassiumMg": 126.0, "calciumMg": 50.0, "ironMg": 1.19, "waterG": 74.6}},
}

# Whole-token PDF CMap typo canonicalization (never partial substring guessing)
AR_TYPO_NORMALIZATION = {
    "مسك": "سمك",
    "مجبري": "جمبري",
    "ساملون": "سلمون",
    "كالمياري": "كاليماري",
    "مسان": "سمان",
    "محام": "حمام",
    "مجل": "جمل",
    "مجلي": "جملي",
    "لمحة": "لحمة",
    "باملاء": "بالماء",
    "طمعية": "طعمية",
    "ممحص": "محمص",
    "محص": "حمص",
    "متبيه": "تمبيه",
}

# Semantic dictionaries separated cleanly into domain slots
PREP_MAP = {
    "مشوية على الفحم": "Charcoal-Grilled",
    "مشوي على الفحم": "Charcoal-Grilled",
    "في الفرن": "Baked",
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
    "مشوح": "Sautéed",
    "مشوحة": "Sautéed",
}

PROCESSING_MAP = {
    "معلبة بالزيت": "Canned in Oil",
    "معلب بالزيت": "Canned in Oil",
    "معلبة بالماء": "Canned in Water",
    "معلب بالماء": "Canned in Water",
    "معلب": "Canned",
    "معلبة": "Canned",
    "مدخن": "Smoked",
    "مدخنة": "Smoked",
    "مملح": "Corned / Salted",
    "مملحة": "Corned / Salted",
    "طازج": "Fresh",
    "طازجة": "Fresh",
    "نهري": "Freshwater",
    "نهرية": "Freshwater",
}

DESCRIPTOR_MAP = {
    "قليل الدهن": "Lean",
    "قليلة الدهن": "Lean",
    "بدون جلد": "Skinless",
    "بالجلد": "With Skin",
    "مفروم": "Ground",
    "مفرومة": "Ground",
    "كاملة": "Whole",
    "كامل": "Whole",
}

SPECIES_MAP = {
    # Mammals & Game
    "بقري": ("Beef", "mammal"),
    "ضأن": ("Lamb", "mammal"),
    "ضاني": ("Lamb", "mammal"),
    "بتلو": ("Veal", "mammal"),
    "ماعز": ("Goat", "mammal"),
    "جاموسي": ("Buffalo", "mammal"),
    "جمل": ("Camel", "mammal"),
    "جملي": ("Camel", "mammal"),
    "أرانب": ("Rabbit", "mammal"),
    "نعام": ("Ostrich", "mammal"),
    # Poultry
    "فراخ": ("Chicken", "poultry"),
    "فرخة": ("Chicken", "poultry"),
    "دجاج": ("Chicken", "poultry"),
    "ديك رومي": ("Turkey", "poultry"),
    "رومي": ("Turkey", "poultry"),
    "بط": ("Duck", "poultry"),
    "وز": ("Goose", "poultry"),
    "حمام": ("Pigeon / Squab", "poultry"),
    "سمان": ("Quail", "poultry"),
    # Fish & Seafood
    "أبو سيف": ("Swordfish", "fish"),
    "قشر بياض": ("Nile Perch", "fish"),
    "بلح البحر": ("Mussels", "seafood"),
    "القد": ("Cod", "fish"),
    "قد": ("Cod", "fish"),
    "بولاك": ("Pollock", "fish"),
    "سلمون": ("Salmon", "fish"),
    "تونة": ("Tuna", "fish"),
    "ماكريل": ("Mackerel", "fish"),
    "سردين": ("Sardines", "fish"),
    "بلطي": ("Tilapia", "fish"),
    "بوري": ("Grey Mullet", "fish"),
    "دنيس": ("Sea Bream", "fish"),
    "وقار": ("Grouper", "fish"),
    "هامور": ("Grouper", "fish"),
    "قاروص": ("Sea Bass", "fish"),
    "مكرونة": ("Brushtooth Lizardfish", "fish"),
    "تراوت": ("Trout", "fish"),
    "بربوني": ("Red Mullet", "fish"),
    "كنعد": ("Kingfish", "fish"),
    "موسى": ("Sole", "fish"),
    "قرموط": ("Catfish", "fish"),
    "هاليبوت": ("Halibut", "fish"),
    "رنجة": ("Herring", "fish"),
    "فسيخ": ("Feseekh (Cured Grey Mullet)", "fish"),
    "أنشوجة": ("Anchovies", "fish"),
    "جمبري": ("Shrimp", "seafood"),
    "كابوريا": ("Crab", "seafood"),
    "إستاكوزا": ("Lobster", "seafood"),
    "استاكوزا": ("Lobster", "seafood"),
    "سكالوب": ("Scallops", "seafood"),
    "حبار": ("Calamari", "seafood"),
    "كاليماري": ("Calamari", "seafood"),
    "أخطبوط": ("Octopus", "seafood"),
    "محار": ("Clams / Oysters", "seafood"),
    "أويستر": ("Oysters", "seafood"),
}

CUT_OR_FOOD_MAP = {
    "هوت دوج": "Hot Dog",
    "بياض بيض": "Egg White",
    "صفار بيض": "Egg Yolk",
    "صدر": "Breast",
    "ورك": "Thigh",
    "دبوس": "Drumstick",
    "جناح": "Wing",
    "قوانص": "Gizzards",
    "شاورما": "Shawarma",
    "كفتة": "Kofta",
    "ريش": "Ribs",
    "ستيك": "Steak",
    "كبدة": "Liver",
    "قلب": "Heart",
    "كلاوي": "Kidneys",
    "مخ": "Brain",
    "كرشة": "Tripe",
    "طحال": "Spleen",
    "كوارع": "Trotters",
    "لسان": "Tongue",
    "سجق": "Sausage",
    "سوسيس": "Frankfurter",
    "برجر": "Burger Patty",
    "لانشون": "Luncheon Meat",
    "بسطرمة": "Pastrami",
    "باسترامي": "Pastrami",
    "بيبروني": "Pepperoni",
    "سلامي": "Salami",
    "جبنة": "Cheese",
    "جبن": "Cheese",
    "بيض": "Egg",
    "توفو": "Tofu",
    "تمبيه": "Tempeh",
    "كافيار": "Caviar",
    "فيليه": "Fillet",
    "بانيه": "Breaded Cutlet (Pané)",
}

MULTI_WORD_PHRASES = sorted(
    [
        k
        for d in (PREP_MAP, PROCESSING_MAP, DESCRIPTOR_MAP, SPECIES_MAP, CUT_OR_FOOD_MAP)
        for k in d.keys()
        if " " in k
    ],
    key=lambda x: -len(x),
)

GLUED_PORTION_SUFFIX_RE = re.compile(
    r"(?:\d+\s*(?:شرائح|شريحة|حبات|حبة|قطع|قطعة|مثلثات).*|"
    r"قرص(?:\s*\)?\s*\d+\s*غ\)?)?.*|"
    r"(?:ربع|نصف)\s+(?:محامة|بطة|وزة|فرخة|مسانة|سمانة)(?:\s*\)\s*\d+\s*غ\)?)?.*|"
    r"مسانة(?:\s*\)\s*\d+\s*غ\)?)?.*)$"
)


def _strip_pdf_glued_portions(ar_text: str) -> str:
    s = (ar_text or "").replace("\u00a0", " ").strip()
    s = re.sub(r"\s+", " ", s)
    # Remove glued trailing portion nouns/weights that leaked from the household column
    s = GLUED_PORTION_SUFFIX_RE.sub("", s).strip()
    s = re.sub(r"(?<=[\u0621-\u064A])(?:مسكة|سمكة)(?:\s+(?:ونصف|وربع))?$", "", s).strip()
    s = re.sub(r"\d+$", "", s).strip()

    # Handle single glued suffix tokens (e.g., 'مشويربع', 'نيءنصف', 'مدخنةنصف', 'مطبوخةقانصة', 'مقليةكبدة', 'مشويةريشة', 'مشويحلقتان')
    tokens = s.split()
    cleaned = []
    for idx, tok in enumerate(tokens):
        t = re.sub(r"[()\[\]،,]+", "", tok)
        if not t:
            continue
        # Only strip glued portion markers attached to the end of another Arabic word
        m_glued = re.match(r"^([\u0621-\u064A]{2,}?)(حلقتان|حلقات|ريشة|قانصة|كبدة|نصف|ربع)$", t)
        if m_glued and m_glued.group(1) not in ("لحم", "سمك"):
            t = m_glued.group(1)
        elif idx == len(tokens) - 1 and t in ("نصف", "ربع", "وربع") and cleaned:
            continue
        cleaned.append(t)
    # Strip trailing 'ونصف'/'وربع'/'نصف'/'ربع' left after removing glued portion nouns
    while cleaned and cleaned[-1] in ("نصف", "ربع", "وربع", "ونصف"):
        cleaned.pop()
    return " ".join(cleaned)


def parse_arabic_meat_name(ar: str) -> dict:
    cleaned = _strip_pdf_glued_portions(ar)
    canonical_tokens = [AR_TYPO_NORMALIZATION.get(tok, tok) for tok in cleaned.split()]
    norm_text = " ".join(canonical_tokens)

    prep = None
    processing = []
    descriptors = []
    species = None
    species_kind = None
    cut = None
    has_generic_meat = False
    has_generic_fish = False
    unrecognized = []

    # 1. Extract complete multi-word phrases longest-first
    working = f" {norm_text} "
    for phrase in MULTI_WORD_PHRASES:
        padded = f" {phrase} "
        if padded in working:
            working = working.replace(padded, " ", 1)
            if phrase in PREP_MAP and prep is None:
                prep = PREP_MAP[phrase]
            elif phrase in PROCESSING_MAP and PROCESSING_MAP[phrase] not in processing:
                processing.append(PROCESSING_MAP[phrase])
            elif phrase in DESCRIPTOR_MAP and DESCRIPTOR_MAP[phrase] not in descriptors:
                descriptors.append(DESCRIPTOR_MAP[phrase])
            elif phrase in SPECIES_MAP and species is None:
                species, species_kind = SPECIES_MAP[phrase]
            elif phrase in CUT_OR_FOOD_MAP and cut is None:
                cut = CUT_OR_FOOD_MAP[phrase]

    # 2. Classify every remaining whole token strictly by dictionary (zero prefix guessing)
    for tok in working.split():
        if tok in PREP_MAP:
            if prep is None:
                prep = PREP_MAP[tok]
        elif tok in PROCESSING_MAP:
            val = PROCESSING_MAP[tok]
            if val not in processing:
                processing.append(val)
        elif tok in DESCRIPTOR_MAP:
            val = DESCRIPTOR_MAP[tok]
            if val not in descriptors:
                descriptors.append(val)
        elif tok in SPECIES_MAP:
            sp_val, sp_kind = SPECIES_MAP[tok]
            if species is None:
                species, species_kind = sp_val, sp_kind
            elif sp_val != species:
                unrecognized.append(tok)
        elif tok in CUT_OR_FOOD_MAP:
            ct_val = CUT_OR_FOOD_MAP[tok]
            if cut is None:
                cut = ct_val
            elif ct_val != cut:
                unrecognized.append(tok)
        elif tok in ("لحم", "لحمة"):
            has_generic_meat = True
        elif tok == "سمك":
            has_generic_fish = True
        else:
            unrecognized.append(tok)

    has_identity = bool(species or cut or has_generic_fish or has_generic_meat)
    return {
        "source_ar": ar,
        "normalized_ar": norm_text,
        "has_identity": has_identity,
        "species": species,
        "species_kind": species_kind,
        "cut": cut,
        "preparation": prep,
        "processing": processing,
        "descriptors": descriptors,
        "has_generic_meat": has_generic_meat,
        "has_generic_fish": has_generic_fish,
        "unrecognized": unrecognized,
    }


def translate_name(ar: str) -> str:
    parsed = parse_arabic_meat_name(ar)

    # Transparent fallback if core food identity is missing or unknown words exist
    if not parsed["has_identity"] or parsed["unrecognized"]:
        return f"Untranslated Arabic Meat/Seafood Item ({ar})"

    parts = []
    postfixes = []
    # Preparation & Processing first
    if parsed["preparation"]:
        parts.append(parsed["preparation"])
    for proc in parsed["processing"]:
        if proc == "Canned in Oil":
            parts.append("Canned")
            postfixes.append("in Oil")
        elif proc == "Canned in Water":
            parts.append("Canned")
            postfixes.append("in Water")
        else:
            parts.append(proc)

    # Additional descriptors (Whole, Lean, Skinless, With Skin, Ground)
    desc_order = ["Whole", "Lean", "Skinless", "With Skin", "Ground"]
    for d in desc_order:
        if d in parsed["descriptors"]:
            parts.append(d)
    for d in parsed["descriptors"]:
        if d not in desc_order:
            parts.append(d)

    # Species vs generic Meat/Fish rules (never confuse Beef & Lamb; never duplicate Fish)
    species = parsed["species"]
    cut = parsed["cut"]

    if species:
        if species in ("Goat", "Camel", "Duck") and parsed["has_generic_meat"] and not cut:
            parts.append(f"{species} Meat")
        elif parsed["has_generic_fish"] and parsed["species_kind"] == "fish" and "fish" not in species.lower() and not cut:
            parts.append(f"{species} Fish")
        else:
            parts.append(species)
    elif parsed["has_generic_meat"]:
        # Generic un-qualified 'لحم' (e.g., برجر لحم مشوي / شاورما لمحة) represents Beef in clinical Egypt exchange guide
        parts.append("Beef")
    elif parsed["has_generic_fish"]:
        parts.append("Fish")

    if cut:
        parts.append(cut)
    parts.extend(postfixes)

    # Deduplicate any identical consecutive tokens without losing meaning
    dedup = []
    for p in parts:
        if not dedup or dedup[-1].lower() != p.lower():
            dedup.append(p)
    return " ".join(dedup)


def _extract_pdf_meat_items(streams, font_maps):
    items = []
    current_cat = "meat_lean"

    for p_num in [7, 8, 9, 10]:
        decomp = zlib.decompress(streams[page_streams[p_num - 1]]).decode("latin1")
        toks = extract_page_tokens(decomp, font_maps)

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

                if "متوسطة الدهون" in txt or "73 سعرة" in txt:
                    current_cat = "meat_medium_fat"
                elif "عالية الدهون" in txt or "001 سعرة" in txt or "100 سعرة" in txt:
                    current_cat = "meat_high_fat"
                elif "اللحوم وبدائلها" in txt or "46 سعرة" in txt or "قليلة الدهون" in txt:
                    current_cat = "meat_lean"

                if any(h in txt for h in [
                    "nalPemigeR", "الكمية", "منصة", "سعرة", "المقدار", "tsil-",
                    "ابدأ", "يحسب", "أخصائي", "اللحوم وبدائلها", "الطعما"
                ]):
                    continue

                m = re.search(r"(\d+)\s*$", txt)
                if not m:
                    continue

                rev_digits = m.group(1)
                weight_str = rev_digits[::-1]
                try:
                    weight = float(weight_str)
                except Exception:
                    continue

                if weight <= 0 or weight > 500:
                    continue

                rest = txt[:m.start()].strip()
                if not rest or len(rest) < 3:
                    continue

                hh_ar = "حصة معيارية"
                name_ar = rest

                for hm in ["شريحة ونصف", "شريحة", "قطعة فيليه", "قطعة", "نصف كوب", "ثلث كوب", "ربع كوب", "كوب", "ملعقتان كبيرتان", "ملعقة كبيرة", "نصف دبوس", "دبوس", "نصف صدر", "صدر متوسط", "صدر", "ورك متوسط", "ورك", "ربع فرخة", "نصف فرخة", "حبة كبيرة", "حبة متوسطة", "حبة ونصف", "حبة", "حبتان", "3 قطع", "5 أصابع", "إصبع", "علبة", "—"]:
                    if hm in rest:
                        parts = rest.split(hm, 1)
                        name_ar = parts[0].strip()
                        hh_ar = (hm + " " + parts[1]).strip()
                        break

                name_ar = re.sub(r"\s*=\s*\d+.*$", "", name_ar).strip()
                if not name_ar:
                    continue

                if any(ex in name_ar for ex in ["لبن", "زبادي", "فول", "عدس", "حمص", "فاصوليا", "لوبيا", "إدامامي"]):
                    continue

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

    # Repair post-deduplication PDF column clippings and substring split artifacts without altering RP-MT codes
    for _, it in numbered_items:
        if it["nameAr"] == "لحم بقري قليل الدهن في":
            it["nameAr"] = "لحم بقري قليل الدهن في الفرن"
            it["prep"] = "baked"
        elif it["nameAr"] == "دبوس فراخ بدون جلد في":
            it["nameAr"] = "دبوس فراخ بدون جلد في الفرن"
            it["prep"] = "baked"
        elif it["nameAr"] == "تونة م" and "بالزيت" in it["hhAr"]:
            it["nameAr"] = "تونة معلبة بالزيت"
            it["hhAr"] = "علبة (130 جم) — 5 حصص"
            it["prep"] = "ready-to-eat"
        elif it["nameAr"] == "أنشوجة م" and "بالزيت" in it["hhAr"]:
            it["nameAr"] = "أنشوجة معلبة بالزيت"
            it["hhAr"] = "6 قطع فيليه"
            it["prep"] = "ready-to-eat"

    return numbered_items

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

CORE_KEYS = [
    "caloriesKcal", "carbsG", "proteinG", "fatG",
    "fiberG", "saturatedFatG", "transFatG", "monounsaturatedFatG",
    "polyunsaturatedFatG", "cholesterolMg", "sodiumMg", "potassiumMg",
    "calciumMg", "ironMg", "waterG"
]


def make_meat_record(it, seq_num):
    code = f"RP-MT-{seq_num:03d}"
    item_id = f"food_meat_{code.lower().replace('-', '_')}"
    portion_id = f"portion_{item_id}_serving"

    w = it["weight"]
    cat = it["cat"]
    usda_prof = MEAT_USDA_SR_PROFILES.get(code)
    override = MEAT_ANALYTICAL_OVERRIDES.get(code, {})

    if usda_prof:
        n_src = usda_prof["nutrients"]
        source_id = "usda_fdc"
        src_rec_id = usda_prof["sourceRecordId"]
        ver_status = "verified_standard"
        comp_basis = "analytical_table"
    elif override:
        n_src = override
        source_id = override.get("sourceId", "clinic_reviewed")
        src_rec_id = None
        ver_status = override.get("verificationStatus", "clinic_reviewed")
        comp_basis = "recipe_based" if ver_status == "recipe_based" else "clinic_estimated"
    else:
        n_src = {}
        source_id = "regimeplan_2026"
        src_rec_id = None
        ver_status = "clinic_reviewed"
        comp_basis = "exchange_only"

    w_gram = int(w) if isinstance(w, (int, float)) and w == int(w) else round(w, 1)

    name_en = override.get("nameEn") or translate_name(it["nameAr"])
    hh_en = f"{int(w)}g portion"

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

    if source_id == "usda_fdc":
        notes_ar = (
            f"التركيبة التحليلية لكل 100 جم من USDA SR Legacy (NDB {src_rec_id}). "
            f"وزن بديل اللحوم من RegimePlan 2026 (ص {it['page']}): {int(w)} جم ({it['hhAr']})."
        )
        notes_en = (
            f"Analytical 100g composition from USDA SR Legacy (NDB {src_rec_id}). "
            f"RegimePlan Food Exchange Lists (2026, p. {it['page']}) meat exchange portion: {int(w)}g ({hh_en})."
        )
    elif comp_basis == "exchange_only":
        notes_ar = (
            f"سجل بديل غذائي فقط من RegimePlan 2026 (ص {it['page']}). "
            f"وزن الحصة البديلة: {int(w)} جم ({it['hhAr']}). التركيبة التحليلية لكل 100 جم غير محللة."
        )
        notes_en = (
            f"Exchange-only food item from RegimePlan Food Exchange Lists (2026, p. {it['page']}). "
            f"Standard meat exchange portion: {int(w)}g ({hh_en}). Analytical 100g composition is unassayed."
        )
    else:
        notes_ar = f"تركيبة مراجعة سريرياً لكل 100 جم. وزن الحصة البديلة وفق RegimePlan 2026 (ص {it['page']}): {int(w)} جم ({it['hhAr']})."
        notes_en = f"Clinically reviewed 100g composition. RegimePlan Food Exchange Lists (2026, p. {it['page']}) meat exchange portion: {int(w)}g ({hh_en})."

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
        "compositionBasis": comp_basis,
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
        "notesAr": notes_ar,
        "notesEn": notes_en
    }
    if src_rec_id is not None:
        record["sourceRecordId"] = str(src_rec_id)
    return record

def generate_meats_catalog(out_path=None):
    target_path = out_path or OUT_PATH
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with open(ORIG_PATH, "r", encoding="utf-8") as f:
        orig = json.load(f)["meats"]
    pdf_streams, fmaps = _build_pdf_context()
    numbered_items = _extract_pdf_meat_items(pdf_streams, fmaps)

    print(f"Extracted {len(numbered_items)} unique non-footer meat items from pages 7-10")
    cats = {}
    for _, it in numbered_items:
        cats[it["cat"]] = cats.get(it["cat"], 0) + 1
    print("Categories:", cats)
    print(f"Selected {len(numbered_items)} new meat items to combine with {len(orig)} original.")

    new_records = [make_meat_record(it, seq) for seq, it in numbered_items]
    all_meats = orig + new_records

    header = '''/**
 * Nutrition Clinic Pro - Food Catalog: Meats, Poultry, Fish, Seafood & Cheeses Module
 * Source: Egyptian NNI 2006, USDA FoodData Central & RegimePlan 2026
 */

import { FoodItemRecord } from '../types';

export const MEAT_FOOD_ITEMS: FoodItemRecord[] = '''

    with open(target_path, "w", encoding="utf-8") as f:
        f.write(header + json.dumps(all_meats, ensure_ascii=False, indent=2) + ";\n")

    print(f"Generated {len(all_meats)} meats in {target_path} (Original: {len(orig)}, New: {len(new_records)})")
    return all_meats


if __name__ == "__main__":
    generate_meats_catalog()
