/**
 * Nutrition Clinic Pro - Exchange Systems Definitions
 * Phase 2 Foundation
 *
 * Provides independently configurable exchange reference values.
 * Distinguishes the standard American Diabetes Association (ADA / AND)
 * exchange system from regional systems (e.g. Egyptian National Nutrition Institute).
 *
 * Clinical Rule:
 * Never assume that all exchange systems share identical reference values.
 * Local cultural staples and regional tables (e.g. Egyptian Baladi bread,
 * regional buffalo milk vs cow milk) have specific clinical calibrations.
 */

import { ExchangeCategoryId, ExchangeSystemDefinition, ExchangeSystemId } from './types';

/**
 * 1. American Diabetes Association (ADA) & Academy of Nutrition and Dietetics (AND)
 * Standard Exchange Lists for Meal Planning (2014 / 2019 reference values).
 */
export const ADA_AND_EXCHANGE_SYSTEM: ExchangeSystemDefinition = {
  systemId: 'ada_and',
  nameEn: 'Academy of Nutrition & Dietetics / ADA Exchange System',
  nameAr: 'نظام البدائل الغذائية المعتمد من أكاديمية التغذية والجمعية الأمريكية للسكري (ADA/AND)',
  citation: 'American Diabetes Association, Academy of Nutrition and Dietetics. Choose Your Foods: Food Lists for Diabetes. 2014/2019.',
  notesEn: 'International gold-standard exchange system. Treats starch as 15g CHO/3g PRO/1g FAT/80 kcal, and divides meats into Lean, Medium-Fat, and High-Fat tiers.',
  notesAr: 'المعيار المرجعي الدولي لقوائم البدائل الغذائية. يحدد بديل النشويات بـ 15 جم كربوهيدرات، 3 جم بروتين، 1 جم دهون، 80 سعرة حرارية؛ ويقسم اللحوم إلى قليلة ومتوسطة وعالية الدهون.',
  exchangeValues: {
    starch: {
      categoryId: 'starch',
      nameEn: 'Starch / Grains',
      nameAr: 'النشويات والخبز والحبوب',
      carbsG: 15.0,
      proteinG: 3.0,
      fatG: 1.0,
      caloriesKcal: 80,
      clinicalDescriptionEn: '15g CHO, 3g PRO, 1g FAT, 80 kcal (e.g. 1/3 cup cooked rice, 1 slice bread, 1/2 cup oatmeal).',
      clinicalDescriptionAr: '15 جم كربوهيدرات، 3 جم بروتين، 1 جم دهون، 80 سعرة (مثل 1/3 كوب أرز مطبوخ، شريحة توست، نصف كوب شوفان مطبوخ).',
    },
    fruit: {
      categoryId: 'fruit',
      nameEn: 'Fruit',
      nameAr: 'الفواكه',
      carbsG: 15.0,
      proteinG: 0.0,
      fatG: 0.0,
      caloriesKcal: 60,
      clinicalDescriptionEn: '15g CHO, 0g PRO, 0g FAT, 60 kcal (e.g. 1 small fresh apple, 1/2 medium banana, 1/2 cup fruit juice).',
      clinicalDescriptionAr: '15 جم كربوهيدرات، 0 جم بروتين، 0 جم دهون، 60 سعرة (مثل تفاحة صغيرة طازجة، نصف موزة متوسطة، نصف كوب عصير فاكهة طبيعي).',
    },
    milk_skim: {
      categoryId: 'milk_skim',
      nameEn: 'Milk, Skim / Fat-Free & 1%',
      nameAr: 'الحليب خالي الدسم (أو 1% دسم)',
      carbsG: 12.0,
      proteinG: 8.0,
      fatG: 0.0,
      caloriesKcal: 90,
      clinicalDescriptionEn: '12g CHO, 8g PRO, 0-3g FAT (nominal 0g), 90 kcal (1 cup / 240 ml skim cow milk or non-fat yogurt).',
      clinicalDescriptionAr: '12 جم كربوهيدرات، 8 جم بروتين، 0 جم دهون، 90 سعرة (كوب حليب بقري خالي الدسم 240 مل أو زبادي خالي الدسم).',
    },
    milk_lowfat: {
      categoryId: 'milk_lowfat',
      nameEn: 'Milk, Reduced-Fat (2%)',
      nameAr: 'الحليب قليل الدسم (2%)',
      carbsG: 12.0,
      proteinG: 8.0,
      fatG: 5.0,
      caloriesKcal: 120,
      clinicalDescriptionEn: '12g CHO, 8g PRO, 5g FAT, 120 kcal (1 cup / 240 ml 2% reduced-fat milk or low-fat yogurt).',
      clinicalDescriptionAr: '12 جم كربوهيدرات، 8 جم بروتين، 5 جم دهون، 120 سعرة (كوب حليب 2% دسم أو زبادي قليل الدسم).',
    },
    milk_whole: {
      categoryId: 'milk_whole',
      nameEn: 'Milk, Whole',
      nameAr: 'الحليب كامل الدسم',
      carbsG: 12.0,
      proteinG: 8.0,
      fatG: 8.0,
      caloriesKcal: 150,
      clinicalDescriptionEn: '12g CHO, 8g PRO, 8g FAT, 150 kcal (1 cup / 240 ml whole cow milk or whole milk yogurt).',
      clinicalDescriptionAr: '12 جم كربوهيدرات، 8 جم بروتين، 8 جم دهون، 150 سعرة (كوب حليب بقري كامل الدسم 240 مل أو زبادي كامل الدسم).',
    },
    vegetable_non_starchy: {
      categoryId: 'vegetable_non_starchy',
      nameEn: 'Vegetable, Non-Starchy',
      nameAr: 'الخضروات غير النشوية',
      carbsG: 5.0,
      proteinG: 2.0,
      fatG: 0.0,
      caloriesKcal: 25,
      clinicalDescriptionEn: '5g CHO, 2g PRO, 0g FAT, 25 kcal (1/2 cup cooked vegetables or vegetable juice, 1 cup raw salad greens).',
      clinicalDescriptionAr: '5 جم كربوهيدرات، 2 جم بروتين، 0 جم دهون، 25 سعرة (نصف كوب خضار مطبوخ، 1 كوب خضار طازج ورقي).',
    },
    meat_lean: {
      categoryId: 'meat_lean',
      nameEn: 'Meat & Meat Substitutes, Lean',
      nameAr: 'اللحوم والبروتين قليل الدهون',
      carbsG: 0.0,
      proteinG: 7.0,
      fatG: 2.0,
      caloriesKcal: 45,
      clinicalDescriptionEn: '0g CHO, 7g PRO, 2g FAT, 45 kcal (1 oz / 28g cooked skinless poultry, tuna in water, egg whites).',
      clinicalDescriptionAr: '0 جم كربوهيدرات، 7 جم بروتين، 2 جم دهون، 45 سعرة (أوقية / 28 جم دجاج منزوع الجلد، تونة مصفاة بالماء، بياض بيضتين).',
    },
    meat_medium_fat: {
      categoryId: 'meat_medium_fat',
      nameEn: 'Meat & Meat Substitutes, Medium-Fat',
      nameAr: 'اللحوم والبروتين متوسط الدهون',
      carbsG: 0.0,
      proteinG: 7.0,
      fatG: 5.0,
      caloriesKcal: 75,
      clinicalDescriptionEn: '0g CHO, 7g PRO, 5g FAT, 75 kcal (1 oz / 28g beef flank, poultry with skin, 1 whole egg, 1 oz mozzarella).',
      clinicalDescriptionAr: '0 جم كربوهيدرات، 7 جم بروتين، 5 جم دهون، 75 سعرة (أوقية لحم بقري متوسط الدسم، بيضة كاملة، أوقية جبن قريش/موزاريلا).',
    },
    meat_high_fat: {
      categoryId: 'meat_high_fat',
      nameEn: 'Meat & Meat Substitutes, High-Fat',
      nameAr: 'اللحوم والبروتين عالي الدهون',
      carbsG: 0.0,
      proteinG: 7.0,
      fatG: 8.0,
      caloriesKcal: 100,
      clinicalDescriptionEn: '0g CHO, 7g PRO, 8g FAT, 100 kcal (1 oz / 28g processed sausages, cheddar, regular cheese, spareribs).',
      clinicalDescriptionAr: '0 جم كربوهيدرات، 7 جم بروتين، 8 جم دهون، 100 سعرة (أوقية لحم مفروم دسم، سجق، جبن شيدر أصفر).',
    },
    plant_protein_legumes: {
      categoryId: 'plant_protein_legumes',
      nameEn: 'Plant-Based Protein / Legumes',
      nameAr: 'البقوليات والبروتين النباتي',
      carbsG: 15.0,
      proteinG: 7.0,
      fatG: 1.0,
      caloriesKcal: 125,
      clinicalDescriptionEn: 'Combined exchange equivalent: counts as 1 Starch Exchange + 1 Lean Meat Exchange (e.g. 1/2 cup cooked lentils or black beans).',
      clinicalDescriptionAr: 'بديل مركب: يحسب كبديل نشويات واحد + بديل لحوم خفيفة الدسم واحد (مثل نصف كوب عدس مطبوخ أو فاصوليا).',
    },
    fat: {
      categoryId: 'fat',
      nameEn: 'Fats & Oils',
      nameAr: 'الدهون والزيوت',
      carbsG: 0.0,
      proteinG: 0.0,
      fatG: 5.0,
      caloriesKcal: 45,
      clinicalDescriptionEn: '0g CHO, 0g PRO, 5g FAT, 45 kcal (1 tsp olive/canola oil, 1 tsp butter, 1 tbsp salad dressing, 6 almonds).',
      clinicalDescriptionAr: '0 جم كربوهيدرات، 0 جم بروتين، 5 جم دهون، 45 سعرة (ملعقة صغيرة زيت زيتون/زبدة، ملعقة كبيرة طحينة، 6 حبات لوز).',
    },
    free_food: {
      categoryId: 'free_food',
      nameEn: 'Free Foods',
      nameAr: 'الأطعمة الحرة (منخفضة السعرات جداً)',
      carbsG: 0.0,
      proteinG: 0.0,
      fatG: 0.0,
      caloriesKcal: 0,
      clinicalDescriptionEn: '< 20 kcal and < 5g CHO per serving in moderate consumption (e.g. lemon, spices, black coffee, vinegar).',
      clinicalDescriptionAr: 'أقل من 20 سعرة وأقل من 5 جم كربوهيدرات للحصة (مثل عصير الليمون، البهارات، القهوة السادة، الشاي دون سكر، الخل).',
    },
    combination_food: {
      categoryId: 'combination_food',
      nameEn: 'Combination / Mixed Dishes',
      nameAr: 'الأطباق والوجبات المركبة',
      carbsG: 30.0,
      proteinG: 14.0,
      fatG: 8.0,
      caloriesKcal: 250,
      clinicalDescriptionEn: 'Standard baseline composite representation; variable based on ingredient composition.',
      clinicalDescriptionAr: 'تمثيل مرجعي مركب للأطباق المتعددة؛ يتفاوت وفق نسب المكونات المستخدمة.',
    },
  },
};

/**
 * 2. Egyptian National Nutrition Institute (NNI) Regional Exchange System
 * Calibrated specifically for Egyptian food composition, traditional flatbreads,
 * local legumes (Ful Medames), and regional dairy.
 */
export const EGYPTIAN_NCI_EXCHANGE_SYSTEM: ExchangeSystemDefinition = {
  systemId: 'egyptian_nci',
  nameEn: 'Egyptian National Nutrition Institute (NNI) Exchange System',
  nameAr: 'نظام البدائل الغذائية للمعهد القومي للتغذية بمصر (NNI)',
  citation: 'National Nutrition Institute (NNI), Cairo, Egypt. Food Composition Tables for Egypt & Clinical Diet Planning Guidelines. 2006.',
  notesEn: 'Regional clinical standard. Specifically accounts for Egyptian Baladi wheat flatbread (1/4 round loaf ~ 35g = 1 Starch Exchange), regional buffalo dairy with higher saturated fat content (10g fat, 160 kcal for whole buffalo milk), and cooked fava beans (Ful Medames).',
  notesAr: 'المعيار السريري الإقليمي المعتمد من المعهد القومي للتغذية بالقاهرة. يعاير بدقة الخبز البلدي المدعم (ربع رغيف بلدي زنة 35 جم = بديل نشويات واحد)، والألبان الجاموسية الإقليمية ذات المحتوى الدهني الأعلى (10 جم دهون، 160 سعرة لحليب الجاموس الكامل)، وفول التدميس المصري.',
  exchangeValues: {
    starch: {
      categoryId: 'starch',
      nameEn: 'Starch / Baladi Bread & Grains',
      nameAr: 'النشويات والخبز البلدي والحبوب',
      carbsG: 15.0,
      proteinG: 3.0,
      fatG: 1.0,
      caloriesKcal: 80,
      clinicalDescriptionEn: '15g CHO, 3g PRO, 1g FAT, 80 kcal (e.g. 1/4 Egyptian Baladi Loaf ~ 35g, 3 tbsp cooked Egyptian short-grain rice, 1/2 small sweet potato).',
      clinicalDescriptionAr: '15 جم كربوهيدرات، 3 جم بروتين، 1 جم دهون، 80 سعرة (مثل ربع رغيف خبز بلدي مصري زنة 35 جم، 3 ملاعق طعام أرز مصري مطبوخ، 3 ملاعق مكرونة).',
    },
    fruit: {
      categoryId: 'fruit',
      nameEn: 'Fruit',
      nameAr: 'الفواكه المصرية والموسمية',
      carbsG: 15.0,
      proteinG: 0.0,
      fatG: 0.0,
      caloriesKcal: 60,
      clinicalDescriptionEn: '15g CHO, 0g PRO, 0g FAT, 60 kcal (e.g. 1 small guava, 2 small fresh figs, 1/2 medium Baladi mango, 3 dates).',
      clinicalDescriptionAr: '15 جم كربوهيدرات، 0 جم بروتين، 0 جم دهون، 60 سعرة (مثل حبة جوافة صغيرة، حبتان تين طازج، نصف حبة مانجو بلدي، 3 حبات بلح/تمر).',
    },
    milk_skim: {
      categoryId: 'milk_skim',
      nameEn: 'Milk / Yogurt, Skim (Non-Fat)',
      nameAr: 'الحليب واللبن الرائب منزوع الدسم',
      carbsG: 12.0,
      proteinG: 8.0,
      fatG: 0.0,
      caloriesKcal: 90,
      clinicalDescriptionEn: '12g CHO, 8g PRO, 0g FAT, 90 kcal (1 cup skim cow milk or fat-free yogurt).',
      clinicalDescriptionAr: '12 جم كربوهيدرات، 8 جم بروتين، 0 جم دهون، 90 سعرة (كوب حليب بقري منزوع الدسم 240 مل أو زبادي بلدي منزوع الوجه).',
    },
    milk_lowfat: {
      categoryId: 'milk_lowfat',
      nameEn: 'Milk / Yogurt, Low-Fat',
      nameAr: 'الحليب قليل الدسم',
      carbsG: 12.0,
      proteinG: 8.0,
      fatG: 5.0,
      caloriesKcal: 120,
      clinicalDescriptionEn: '12g CHO, 8g PRO, 5g FAT, 120 kcal (1 cup low-fat milk or commercial low-fat yogurt).',
      clinicalDescriptionAr: '12 جم كربوهيدرات، 8 جم بروتين، 5 جم دهون، 120 سعرة (كوب حليب بقري قليل الدسم أو زبادي 1.5% دسم).',
    },
    milk_whole: {
      categoryId: 'milk_whole',
      nameEn: 'Milk, Whole (Regional Buffalo / Cow Blend)',
      nameAr: 'الحليب كامل الدسم (الجاموسي / البقري البلدي)',
      carbsG: 12.0,
      proteinG: 8.0,
      fatG: 10.0,
      caloriesKcal: 160,
      clinicalDescriptionEn: '12g CHO, 8g PRO, 10g FAT, 160 kcal. NOTE: Regional Egyptian buffalo milk has significantly higher lipid concentration (up to 6.5-7.5% fat) than standard Western Holstein cow milk.',
      clinicalDescriptionAr: '12 جم كربوهيدرات، 8 جم بروتين، 10 جم دهون، 160 سعرة. تنبيه سريري: الحليب الجاموسي البلدي بمصر يمتاز بنسبة دسم مرتفعة تفوق الحليب البقري الغربي القياسي.',
    },
    vegetable_non_starchy: {
      categoryId: 'vegetable_non_starchy',
      nameEn: 'Vegetable, Non-Starchy',
      nameAr: 'الخضروات الطازجة والمطبوخة (بدون مادة دهنية)',
      carbsG: 5.0,
      proteinG: 2.0,
      fatG: 0.0,
      caloriesKcal: 25,
      clinicalDescriptionEn: '5g CHO, 2g PRO, 0g FAT, 25 kcal (e.g. 1/2 cup cooked zucchini/spinach without fat, 1 cup Baladi green salad).',
      clinicalDescriptionAr: '5 جم كربوهيدرات، 2 جم بروتين، 0 جم دهون، 25 سعرة (نصف كوب كوسة/سبانخ سوتيه أو مسلوقة دون زيت، كوب سلطة خضراء بلدية).',
    },
    meat_lean: {
      categoryId: 'meat_lean',
      nameEn: 'Meat / Fish / Quraish Cheese (Very Low to Lean Fat)',
      nameAr: 'اللحوم خفيفة الدسم والأسماك المشوية وجبن القريش',
      carbsG: 0.0,
      proteinG: 7.0,
      fatG: 2.0,
      caloriesKcal: 45,
      clinicalDescriptionEn: '0g CHO, 7g PRO, 2g FAT, 45 kcal (e.g. 1 oz / 28g grilled skinless chicken, grilled tilapia/bolti, 1/4 cup Egyptian Quraish fresh skim cheese).',
      clinicalDescriptionAr: '0 جم كربوهيدرات، 7 جم بروتين، 2 جم دهون، 45 سعرة (أوقية دجاج مخلي مشوي، سمك بلطي مشوي بالردة، قطعة جبن قريش بلدي منزوعة الدسم 50 جم).',
    },
    meat_medium_fat: {
      categoryId: 'meat_medium_fat',
      nameEn: 'Meat / Poultry / Eggs, Medium-Fat',
      nameAr: 'اللحوم والدواجن متوسطة الدهون والبيض',
      carbsG: 0.0,
      proteinG: 7.0,
      fatG: 5.0,
      caloriesKcal: 75,
      clinicalDescriptionEn: '0g CHO, 7g PRO, 5g FAT, 75 kcal (e.g. 1 oz lean beef/veal, 1 whole Baladi egg, 1 oz Istambolli cheese).',
      clinicalDescriptionAr: '0 جم كربوهيدرات، 7 جم بروتين، 5 جم دهون، 75 سعرة (أوقية لحم بقري أحمر قليل الدهن، بيضة بلدية كاملة، أوقية جبن إسطنبولي قليل الملح).',
    },
    meat_high_fat: {
      categoryId: 'meat_high_fat',
      nameEn: 'Meat & Cheeses, High-Fat',
      nameAr: 'اللحوم المصنعة والدسمة والأجبان الصفراء',
      carbsG: 0.0,
      proteinG: 7.0,
      fatG: 8.0,
      caloriesKcal: 100,
      clinicalDescriptionEn: '0g CHO, 7g PRO, 8g FAT, 100 kcal (e.g. 1 oz Egyptian Rumi cheese, fried kofta, lamb chops).',
      clinicalDescriptionAr: '0 جم كربوهيدرات، 7 جم بروتين، 8 جم دهون، 100 سعرة (أوقية جبن رومي مصري قديم، كفتة لحم مقلية، لحم ضأن).',
    },
    plant_protein_legumes: {
      categoryId: 'plant_protein_legumes',
      nameEn: 'Cooked Legumes (Ful Medames, Lentils)',
      nameAr: 'البقوليات المطهية (فول مدمس، عدس، كشري)',
      carbsG: 15.0,
      proteinG: 7.0,
      fatG: 1.0,
      caloriesKcal: 125,
      clinicalDescriptionEn: 'Combined exchange equivalent: 1 Starch + 1 Lean Meat (e.g. 4 tbsp cooked Ful Medames without added oil).',
      clinicalDescriptionAr: 'بديل مركب: يحسب كبديل نشويات واحد + بديل لحوم خفيفة الدسم واحد (مثل 4 ملاعق طعام فول مدمس بدون زيت).',
    },
    fat: {
      categoryId: 'fat',
      nameEn: 'Fats, Oils & Tahini',
      nameAr: 'الدهون والزيوت والطحينة والزيت الحار',
      carbsG: 0.0,
      proteinG: 0.0,
      fatG: 5.0,
      caloriesKcal: 45,
      clinicalDescriptionEn: '0g CHO, 0g PRO, 5g FAT, 45 kcal (1 tsp flaxseed oil / Zait Har, 1 tsp olive oil, 1 tsp butter, 1 tsp sesame tahini paste).',
      clinicalDescriptionAr: '0 جم كربوهيدرات، 0 جم بروتين، 5 جم دهون، 45 سعرة (ملعقة صغيرة زيت حار/بذر الكتان، ملعقة صغيرة زيت زيتون/سمن، ملعقة صغيرة طحينة بيضاء).',
    },
    free_food: {
      categoryId: 'free_food',
      nameEn: 'Free Foods',
      nameAr: 'الأطعمة الحرة والمشروبات التقليدية غير المحلاة',
      carbsG: 0.0,
      proteinG: 0.0,
      fatG: 0.0,
      caloriesKcal: 0,
      clinicalDescriptionEn: '< 20 kcal per serving (e.g. Hibiscus/Karkadeh tea unsweetened, anise tea, mint, cumin, lemon).',
      clinicalDescriptionAr: 'أقل من 20 سعرة للحصة (كركديه مغلي دون سكر، يانسون، نعناع، كمون، عصير ليمون، خل).',
    },
    combination_food: {
      categoryId: 'combination_food',
      nameEn: 'Traditional Composite Dishes (e.g. Koshari, Mahshi)',
      nameAr: 'الوجبات التقليدية المركبة (كشري، محشي، مسقعة)',
      carbsG: 30.0,
      proteinG: 10.0,
      fatG: 8.0,
      caloriesKcal: 232,
      clinicalDescriptionEn: 'Composite representation for popular Egyptian dishes, analyzed by constituent ingredients.',
      clinicalDescriptionAr: 'تمثيل مركب للأطباق الشعبية المصرية؛ يُفضل تفكيكها إلى مكوناتها الدقيقة عند إعداد الحميات العلاجية.',
    },
  },
};

/**
 * Registry of available exchange systems.
 */
export const AVAILABLE_EXCHANGE_SYSTEMS: Record<ExchangeSystemId, ExchangeSystemDefinition> = {
  ada_and: ADA_AND_EXCHANGE_SYSTEM,
  egyptian_nci: EGYPTIAN_NCI_EXCHANGE_SYSTEM,
  custom: {
    systemId: 'custom',
    nameEn: 'Custom / Clinic-Specific Exchange System',
    nameAr: 'نظام بدائل مخصص للعيادة',
    citation: 'Custom Clinical Protocol',
    notesEn: 'Configurable exchange definitions tailored to specialized clinical sub-specialties.',
    notesAr: 'تعريفات بدائل قابلة للتخصيص الكامل وفق البروتوكولات العلاجية الخاصة بكل منشأة طبية.',
    exchangeValues: { ...ADA_AND_EXCHANGE_SYSTEM.exchangeValues },
  },
};

/**
 * Retrieves an exchange system by ID, defaulting safely to ADA_AND.
 */
export function getExchangeSystem(systemId?: ExchangeSystemId): ExchangeSystemDefinition {
  if (systemId && AVAILABLE_EXCHANGE_SYSTEMS[systemId]) {
    return AVAILABLE_EXCHANGE_SYSTEMS[systemId];
  }
  return ADA_AND_EXCHANGE_SYSTEM;
}
