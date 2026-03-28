'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Badge } from '@pawser/ui';
import { useOrg } from '../context/org-context';

const PER_PAGE = 24;

interface ListedAnimal {
  id: string;
  slug: string;
  name: string;
  species: string;
  status: string;
  published: boolean;
  photoUrl: string | null;
  externalId?: string;
}

interface AnimalsListResponse {
  success?: boolean;
  animals?: ListedAnimal[];
  total?: number;
  page?: number;
  perPage?: number;
  totalPages?: number;
}

export default function PetsPage() {
  const { orgSlug, loading: orgLoading } = useOrg();
  const [page, setPage] = useState(1);
  const [animals, setAnimals] = useState<ListedAnimal[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgSlug) {
      setLoading(false);
      setAnimals([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        orgSlug,
        page: String(page),
        perPage: String(PER_PAGE),
        status: 'available',
      });
      const res = await fetch(`/api/proxy/animals?${params.toString()}`, {
        credentials: 'same-origin',
      });
      const data: AnimalsListResponse = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (data as { message?: string; error?: { message?: string } })?.message ||
          (data as { error?: { message?: string } })?.error?.message ||
          `Request failed (${res.status})`;
        throw new Error(msg);
      }
      setAnimals(data.animals ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? Math.max(1, Math.ceil((data.total ?? 0) / PER_PAGE)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load animals');
      setAnimals([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, page]);

  useEffect(() => {
    if (orgLoading) return;
    void load();
  }, [orgLoading, load]);

  if (orgLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Pet Management" subtitle="Loading…" />
        <div className="h-48 rounded-xl bg-surface-container-low animate-pulse" />
      </div>
    );
  }

  if (!orgSlug) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Pet Management"
          subtitle="View animals synced from ShelterLuv (same list as your public widget)"
        />
        <div className="bg-surface-container-lowest p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <p className="text-on-surface-variant">
            No organization is linked to this account. Log in with a shelter user that has an active membership, or
            create/join an organization first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pet Management"
        subtitle={`Published, available animals synced to Pawser (${total} total). Matches what adopters see on the widget.`}
      />

      {error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-on-surface-variant text-sm">Loading animals…</div>
        ) : animals.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-on-surface-variant text-sm mb-2">No animals match the current filters.</p>
            <p className="text-xs text-on-surface-variant/80">
              Run a sync from Integration if you have not yet, or confirm animals are marked available and published in
              Pawser.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-container-high bg-surface-container-low/50">
                  <th className="px-4 py-3 font-bold text-on-surface-variant w-16">Photo</th>
                  <th className="px-4 py-3 font-bold text-on-surface-variant">Name</th>
                  <th className="px-4 py-3 font-bold text-on-surface-variant">Species</th>
                  <th className="px-4 py-3 font-bold text-on-surface-variant">Status</th>
                  <th className="px-4 py-3 font-bold text-on-surface-variant">Widget</th>
                  <th className="px-4 py-3 font-bold text-on-surface-variant hidden md:table-cell">External ID</th>
                </tr>
              </thead>
              <tbody>
                {animals.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-surface-container-low hover:bg-surface-container-low/30 transition-colors"
                  >
                    <td className="px-4 py-2">
                      <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-surface-container bg-surface-container-high">
                        {a.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- remote ShelterLuv URLs
                          <img
                            src={a.photoUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-on-surface-variant/40">
                            <span className="material-symbols-outlined text-xl">pets</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-semibold text-on-surface">{a.name}</td>
                    <td className="px-4 py-2 text-on-surface-variant capitalize">{a.species}</td>
                    <td className="px-4 py-2 text-on-surface-variant capitalize">{a.status}</td>
                    <td className="px-4 py-2">
                      {a.published ? (
                        <Badge variant="success">Live</Badge>
                      ) : (
                        <Badge variant="info">Hidden</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant font-mono text-xs hidden md:table-cell">
                      {a.externalId ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-container-low bg-surface-container-low/30">
            <p className="text-xs text-on-surface-variant">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container-low text-on-surface disabled:opacity-40 hover:opacity-90"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container-low text-on-surface disabled:opacity-40 hover:opacity-90"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
