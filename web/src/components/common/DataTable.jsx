import { useState } from 'react';
import StatusBadge from './StatusBadge';

export default function DataTable({ columns, data, loading, onAdd, addLabel, actions, searchable = true }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = searchable && search
    ? data.filter(row => columns.some(col => col.searchable !== false &&
        String(row[col.key] ?? '').toLowerCase().includes(search.toLowerCase())))
    : data;

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
          {searchable && (
            <div className="header-search" style={{ maxWidth: 280 }}>
              <span className="search-icon">🔍</span>
              <input placeholder="Cari..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
          )}
        </div>
        {onAdd && (
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            + {addLabel || 'Tambah'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : paginated.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>Tidak ada data</h3>
          <p>Belum ada data yang tersedia</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>No</th>
                  {columns.map(col => <th key={col.key}>{col.label}</th>)}
                  {actions && <th style={{ width: 120 }}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.map((row, i) => (
                  <tr key={row.id || i}>
                    <td style={{ color: 'var(--text-muted)' }}>{(page - 1) * perPage + i + 1}</td>
                    {columns.map(col => (
                      <td key={col.key}>
                        {col.render ? col.render(row[col.key], row) : col.badge
                          ? <StatusBadge status={row[col.key]} />
                          : <span style={{ color: col.primary ? 'var(--text-primary)' : undefined }}>{row[col.key] ?? '-'}</span>}
                      </td>
                    ))}
                    {actions && <td>{actions(row)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>;
              })}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              <button disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
