import {
  BadgeCheck,
  Menu,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import { formatWon } from '../utils/commerce'
import { CartSummaryCard } from './CartSummaryCard'
import { FeaturedSection } from './FeaturedSection'
import { ProductCard } from './ProductCard'
import { SearchGroup } from './SearchGroup'
import { SelectFilter } from './SelectFilter'

export function BuyerApp({
  activeBuyer,
  activeShortcut,
  addToCart,
  adjustedRate,
  applySearch,
  applyShortcut,
  canOrder,
  cartQuantity,
  cartRows,
  categories,
  featuredSections,
  filteredProducts,
  gauges,
  hideUnavailable,
  isSearchOpen,
  materials,
  minOrderGap,
  minOrderProgress,
  moqFilter,
  moqOptions,
  orderMessage,
  orderTotal,
  recentSearches,
  recommendedKeywords,
  removeFromCart,
  searchQuery,
  selectedCategory,
  selectedGauge,
  selectedMaterial,
  setHideUnavailable,
  setIsSearchOpen,
  setMoqFilter,
  setSearchQuery,
  setSelectedCategory,
  setSelectedGauge,
  setSelectedMaterial,
  setSortOption,
  setStatusFilter,
  shortcutItems,
  sortOption,
  sortOptions,
  statusFilter,
  statusOptions,
  updateCartQty,
  onSendOrder,
}) {
  return (
    <div className="shop-shell">
      <header className="shop-header">
        <div className="shop-header-main">
          <div className="brand-lockup">
            <div className="brand-mark">貴</div>
            <div>
              <strong>귀족</strong>
              <span>KIZOKU Jewelry</span>
            </div>
          </div>

          <div className="search-wrap">
            <label className="global-search">
              <Search size={20} />
              <input
                value={searchQuery}
                onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 120)}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applySearch(searchQuery)
                }}
                placeholder="바벨, 라블렛, 링, 체인 주얼리를 검색해보세요"
              />
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => applySearch(searchQuery)}>
                검색
              </button>
            </label>

            {isSearchOpen && (
              <div className="search-suggestions">
                <SearchGroup title="최근 검색어" keywords={recentSearches} onSelect={applySearch} />
                <SearchGroup title="추천 검색어" keywords={recommendedKeywords} onSelect={applySearch} />
              </div>
            )}
          </div>

          <nav className="shop-actions" aria-label="쇼핑 메뉴">
            <button type="button">
              <ShoppingBag size={18} />
              내 주문
            </button>
            <button type="button">
              <UserRound size={18} />
              {activeBuyer.status} 회원
            </button>
            <button type="button" className="cart-pill">
              <ShoppingCart size={18} />
              장바구니
              <span>{cartQuantity}</span>
            </button>
          </nav>

          <button className="mobile-menu" type="button" aria-label="메뉴 열기">
            <Menu size={20} />
          </button>
        </div>
      </header>

      <main className="shop-main">
        <section className="category-shortcuts" aria-label="빠른 카테고리">
          {shortcutItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={activeShortcut === item.label ? 'selected' : ''}
                key={item.label}
                type="button"
                onClick={() => applyShortcut(item)}
              >
                <span>
                  <Icon size={20} />
                </span>
                {item.label}
              </button>
            )
          })}
        </section>

        <section className="benefit-strip" aria-label="거래처 혜택">
          <div>
            <span className="benefit-eyebrow">Member-only jewelry edit</span>
            <strong>예쁜 피어싱 셀렉션을 회원가로 만나보세요</strong>
            <span>
              {activeBuyer.name} · {activeBuyer.grade}등급 {activeBuyer.discount}% 할인 · 환율 {adjustedRate.toFixed(2)} KRW/JPY · 최소주문{' '}
              {formatWon(activeBuyer.minOrder)}
            </span>
          </div>
          <div className="member-chip">
            <BadgeCheck size={17} />
            {activeBuyer.memberType ?? '도매 회원'}
          </div>
        </section>

        <section className="featured-feed naver-style" aria-label="추천 상품 피드">
          {featuredSections.map((section) => (
            <FeaturedSection
              adjustedRate={adjustedRate}
              buyerDiscount={activeBuyer.discount}
              key={section.id}
              onAdd={addToCart}
              section={section}
            />
          ))}
        </section>

        <section className="shop-layout compact-cart">
          <div className="catalog-column">
            <div className="filter-bar">
              <div className="filter-title">
                <SlidersHorizontal size={17} />
                <strong>전체 상품</strong>
                <span>{filteredProducts.length}개 상품</span>
              </div>

              <div className="filter-controls">
                <SelectFilter label="카테고리" value={selectedCategory} options={categories} onChange={setSelectedCategory} />
                <SelectFilter label="소재" value={selectedMaterial} options={materials} onChange={setSelectedMaterial} />
                <SelectFilter label="게이지" value={selectedGauge} options={gauges} onChange={setSelectedGauge} />
                <SelectFilter label="상태" value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
                <SelectFilter label="MOQ" value={moqFilter} options={moqOptions} onChange={setMoqFilter} />
                <SelectFilter label="정렬" value={sortOption} options={sortOptions} onChange={setSortOption} />
                <label className="check-filter">
                  <input
                    checked={hideUnavailable}
                    type="checkbox"
                    onChange={(event) => setHideUnavailable(event.target.checked)}
                  />
                  품절 제외
                </label>
              </div>
            </div>

            <div className="product-grid" aria-label="상품 목록">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  adjustedRate={adjustedRate}
                  buyerDiscount={activeBuyer.discount}
                  key={product.id}
                  onAdd={() => addToCart(product.id)}
                  product={product}
                  rank={index + 1}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="empty-state">
                <strong>조건에 맞는 상품이 없습니다.</strong>
                <span>검색어 또는 필터를 조금 넓혀보세요.</span>
              </div>
            )}
          </div>

          <CartSummaryCard
            adjustedRate={adjustedRate}
            canOrder={canOrder}
            cartRows={cartRows}
            minOrderGap={minOrderGap}
            minOrderProgress={minOrderProgress}
            orderMessage={orderMessage}
            orderTotal={orderTotal}
            removeFromCart={removeFromCart}
            updateCartQty={updateCartQty}
            onSendOrder={onSendOrder}
          />
        </section>
      </main>

      <div className="mobile-cart-bar">
        <div>
          <span>
            {cartRows.length}개 품목 · {minOrderProgress}%
          </span>
          <strong>{formatWon(orderTotal)}</strong>
        </div>
        <button type="button" disabled={!canOrder} onClick={onSendOrder}>
          주문 요청
        </button>
      </div>
    </div>
  )
}
