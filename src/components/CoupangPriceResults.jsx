import { useEffect, useState } from 'react'
import * as shoppingApi from '../api/shopping'
import './CoupangPriceResults.css'

// 상품 이미지 로딩에 실패했을 때(광고 차단 확장 프로그램이 쿠팡 이미지 도메인을 막는 경우가 흔함) 대신 보여줄 아이콘.
const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="14" fill="#e1e8ff"/><path d="M16 20h24l-2 16H18l-2-16Z" fill="none" stroke="#8f7069" stroke-width="2"/><path d="M22 20v-3a6 6 0 0 1 12 0v3" fill="none" stroke="#8f7069" stroke-width="2"/></svg>'
  )

export default function CoupangPriceResults({ keyword }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    shoppingApi
      .searchCoupangProducts(keyword)
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [keyword])

  return (
    <div className="coupang-results">
      <p className="coupang-disclaimer">쿠팡 파트너스 활동의 일환으로 일정액의 수수료를 제공받을 수 있습니다.</p>

      {loading && <p className="coupang-hint">검색 중...</p>}
      {error && <div className="form-error">{error}</div>}
      {!loading && !error && products.length === 0 && (
        <p className="coupang-hint">검색 결과가 없어요.</p>
      )}

      <ul className="coupang-list">
        {products.map((product) => (
          <li key={product.productId} className="coupang-item">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="coupang-item-image"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = PLACEHOLDER_IMAGE
              }}
            />
            <div className="coupang-item-main">
              <span className="coupang-item-name">{product.name}</span>
              <span className="coupang-item-price">{product.price.toLocaleString('ko-KR')}원</span>
              <span className="coupang-item-badges">
                {product.rocket && <span className="coupang-badge coupang-badge--rocket">🚀 로켓</span>}
                {product.freeShipping && <span className="coupang-badge">무료배송</span>}
              </span>
            </div>
            <a
              href={product.productUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost coupang-item-link"
            >
              보러가기 ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
