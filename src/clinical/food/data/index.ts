/**
 * Nutrition Clinic Pro - Food Catalog: Aggregated Catalog
 * Combines all 8 modular food domain lists into ALL_EXPANDED_FOOD_ITEMS.
 */

import { FoodItemRecord } from '../types';
import { STARCH_FOOD_ITEMS } from './starches';
import { FRUIT_FOOD_ITEMS } from './fruits';
import { VEGETABLE_FOOD_ITEMS } from './vegetables';
import { DAIRY_FOOD_ITEMS } from './dairy';
import { LEGUME_FOOD_ITEMS } from './legumes';
import { MEAT_FOOD_ITEMS } from './meats';
import { FAT_FOOD_ITEMS } from './fats';
import { OCCASION_FOOD_ITEMS } from './occasions';

export {
  STARCH_FOOD_ITEMS,
  FRUIT_FOOD_ITEMS,
  VEGETABLE_FOOD_ITEMS,
  DAIRY_FOOD_ITEMS,
  LEGUME_FOOD_ITEMS,
  MEAT_FOOD_ITEMS,
  FAT_FOOD_ITEMS,
  OCCASION_FOOD_ITEMS,
};

export const ALL_EXPANDED_FOOD_ITEMS: FoodItemRecord[] = [
  ...STARCH_FOOD_ITEMS,
  ...FRUIT_FOOD_ITEMS,
  ...VEGETABLE_FOOD_ITEMS,
  ...DAIRY_FOOD_ITEMS,
  ...LEGUME_FOOD_ITEMS,
  ...MEAT_FOOD_ITEMS,
  ...FAT_FOOD_ITEMS,
  ...OCCASION_FOOD_ITEMS,
];
