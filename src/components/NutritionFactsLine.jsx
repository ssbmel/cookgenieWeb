import './NutritionTag.css'

/** nutritionFacts()가 만든 {basis, facts} + nutritionSourceLabel()이 만든 source를 한 줄로 보여준다.
 * 기준량은 옅게, kcal은 진하게, 탄단지는 옅게 표시하고 출처 뱃지를 끝에 붙인다. */
export default function NutritionFactsLine({ basis, facts, source }) {
  if (!facts || facts.length === 0) return null
  const kcalFact = facts.find((fact) => fact.type === 'kcal')
  const macroFacts = facts.filter((fact) => fact.type !== 'kcal')
  return (
    <div className="nutrition-facts-line">
      {(basis || kcalFact || source) && (
        <span className="nutrition-facts-primary">
          {basis && <span className="nutrition-facts-basis">{basis}</span>}
          {kcalFact && <span className="nutrition-facts-kcal">{kcalFact.text}</span>}
          {source && <span className={`nutrition-source ${source.className}`}>{source.text}</span>}
        </span>
      )}
      {macroFacts.length > 0 && (
        <span className="nutrition-facts-macros">
          {macroFacts.map((fact, i) =>
            fact.label ? (
              <span key={i} className="nutrition-facts-macro">
                <span className={`nutrition-facts-macro-label nutrition-facts-macro-label--${fact.type}`}>
                  {fact.label}
                </span>
                <span className="nutrition-facts-macro-value">{fact.value}</span>
              </span>
            ) : (
              <span key={i} className="nutrition-facts-macro">
                {fact.text}
              </span>
            )
          )}
        </span>
      )}
    </div>
  )
}
