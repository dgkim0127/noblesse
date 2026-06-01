export function SearchGroup({ keywords, onSelect, title }) {
  return (
    <div className="search-group">
      <strong>{title}</strong>
      <div>
        {keywords.map((keyword) => (
          <button key={keyword} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(keyword)}>
            {keyword}
          </button>
        ))}
      </div>
    </div>
  )
}
