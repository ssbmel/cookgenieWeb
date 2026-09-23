/** FridgeItemResponse의 calories/carbohydrateG/proteinG/fatG는 재료의 단위가 영양정보 기준 단위와
 * 일치할 때만 채워지고, 그렇지 않으면 넷 다 null로 온다. 하나라도 값이 있으면 표시 대상으로 본다. */
export function hasNutrition(item) {
  return (
    item.calories != null || item.carbohydrateG != null || item.proteinG != null || item.fatG != null
  )
}

export function formatNutrition(item) {
  const parts = []
  if (item.calories != null) parts.push(`${item.calories}kcal`)
  if (item.carbohydrateG != null) parts.push(`탄 ${item.carbohydrateG}g`)
  if (item.proteinG != null) parts.push(`단 ${item.proteinG}g`)
  if (item.fatG != null) parts.push(`지 ${item.fatG}g`)
  return parts.join(' · ')
}

/** IngredientResponse의 reference* 필드는 재료 마스터에 등록된 "기준량당" 영양정보다 (예: 100g당).
 * 수동으로 등록한 재료(공식 데이터와 동기화되지 않은 재료)는 전부 null. */
export function hasReferenceNutrition(ingredient) {
  return (
    ingredient.referenceCalories != null ||
    ingredient.referenceCarbohydrateG != null ||
    ingredient.referenceProteinG != null ||
    ingredient.referenceFatG != null
  )
}

/** 기준량 영양정보를 { basis: '100g당', parts: ['47kcal', '탄 10g', ...] } 로 나눈다. */
export function referenceNutritionParts(ingredient) {
  const parts = []
  if (ingredient.referenceCalories != null) parts.push(`${ingredient.referenceCalories}kcal`)
  if (ingredient.referenceCarbohydrateG != null) parts.push(`탄 ${ingredient.referenceCarbohydrateG}g`)
  if (ingredient.referenceProteinG != null) parts.push(`단 ${ingredient.referenceProteinG}g`)
  if (ingredient.referenceFatG != null) parts.push(`지 ${ingredient.referenceFatG}g`)
  const basis =
    ingredient.referenceAmount != null && ingredient.referenceUnit
      ? `${ingredient.referenceAmount}${ingredient.referenceUnit}당`
      : ''
  return { basis, parts }
}

export function formatReferenceNutrition(ingredient) {
  const { basis, parts } = referenceNutritionParts(ingredient)
  return (basis ? `${basis} ` : '') + parts.join(' · ')
}

/** 영양정보를 칼로리(강조)/탄단지(보조)로 타입 태그를 붙여 나눈다. 기준량(100g당 등) 값만 있으면 그쪽을 쓴다. */
export function nutritionFacts(item) {
  const facts = []
  let basis = null
  if (hasNutrition(item)) {
    if (item.calories != null) facts.push({ type: 'kcal', text: `${item.calories}kcal` })
    if (item.carbohydrateG != null)
      facts.push({ type: 'carb', label: '탄', value: `${item.carbohydrateG}g`, text: `탄 ${item.carbohydrateG}g` })
    if (item.proteinG != null)
      facts.push({ type: 'protein', label: '단', value: `${item.proteinG}g`, text: `단 ${item.proteinG}g` })
    if (item.fatG != null)
      facts.push({ type: 'fat', label: '지', value: `${item.fatG}g`, text: `지 ${item.fatG}g` })
  } else if (hasReferenceNutrition(item)) {
    if (item.referenceAmount != null && item.referenceUnit) {
      basis = `${item.referenceAmount}${item.referenceUnit}당`
    }
    if (item.referenceCalories != null) facts.push({ type: 'kcal', text: `${item.referenceCalories}kcal` })
    if (item.referenceCarbohydrateG != null)
      facts.push({
        type: 'carb',
        label: '탄',
        value: `${item.referenceCarbohydrateG}g`,
        text: `탄 ${item.referenceCarbohydrateG}g`,
      })
    if (item.referenceProteinG != null)
      facts.push({
        type: 'protein',
        label: '단',
        value: `${item.referenceProteinG}g`,
        text: `단 ${item.referenceProteinG}g`,
      })
    if (item.referenceFatG != null)
      facts.push({ type: 'fat', label: '지', value: `${item.referenceFatG}g`, text: `지 ${item.referenceFatG}g` })
  }
  return facts.length > 0 ? { basis, facts } : null
}

/**
 * 영양정보가 실제 DB(정부 공식 데이터)에서 온 건지, Claude가 추정한 건지, 사용자가 직접 입력한 건지를
 * 뱃지로 보여주기 위한 라벨. dataSource가 없으면(영양정보 자체가 없는 재료) null.
 */
export function nutritionSourceLabel(dataSource, isVerified) {
  if (dataSource === 'OFFICIAL_DB') return { text: '공식 데이터', className: 'nutrition-source--official' }
  if (dataSource === 'LLM_ESTIMATED') return { text: 'AI 추정', className: 'nutrition-source--ai' }
  if (dataSource === 'USER_INPUT' && isVerified) return { text: '직접 입력', className: 'nutrition-source--manual' }
  return null
}
