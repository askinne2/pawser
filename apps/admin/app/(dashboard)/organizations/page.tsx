'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface Organization {
  id: string;
  slug: string;
  name: string;
  status: string;
  createdAt: string;
  subscription?: {
    planCode: string;
    status: string;
  };
  _count?: {
    animals: number;
  };
}

interface PaginationInfo {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'disabled', label: 'Disabled' },
];

const PLAN_OPTIONS = [
  { value: '', label: 'All Plans' },
  { value: 'trial', label: 'Trial' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];

export default function OrganizationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  });
  
  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [planFilter, setPlanFilter] = useState(searchParams.get('plan') || '');
  
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('token='))
        ?.split('=')[1];

      const params = new URLSearchParams();
      params.set('page', String(pagination.page));
      params.set('perPage', String(pagination.perPage));
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (planFilter) params.set('plan', planFilter);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/api/v1/organizations?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
      setPagination((prev) => ({
        ...prev,
        total: data.total || 0,
        totalPages: Math.ceil((data.total || 0) / prev.perPage),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, search, statusFilter, planFilter]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Update URL params when filters change
  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`/organizations?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    updateFilters({ search, page: '1' });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(organizations.map((org) => org.id)));
      setIsAllSelected(true);
    } else {
      setSelectedIds(new Set());
      setIsAllSelected(false);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
    setIsAllSelected(newSet.size === organizations.length);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.size === 0) return;

    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

    try {
      const response = await fetch(`${apiUrl}/api/v1/organizations/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          ids: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        throw new Error('Bulk action failed');
      }

      // Refresh data
      setSelectedIds(new Set());
      setIsAllSelected(false);
      fetchOrganizations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      active: { bg: '#dcfce7', text: '#166534' },
      trial: { bg: '#dbeafe', text: '#1e40af' },
      suspended: { bg: '#fef3c7', text: '#92400e' },
      disabled: { bg: '#fee2e2', text: '#991b1b' },
    };
    const color = colors[status] || { bg: '#f3f4f6', text: '#374151' };
    return (
      <span
        style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '500',
          backgroundColor: color.bg,
          color: color.text,
        }}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading && organizations.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading organizations...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.25rem' }}>
            Organizations
          </h1>
          <p style={{ color: '#6b7280' }}>
            {pagination.total} organization{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href="/organizations/new"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          + New Organization
        </Link>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: '1' }}>
          <input
            type="text"
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              minWidth: '250px',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
        </form>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPagination((prev) => ({ ...prev, page: 1 }));
            updateFilters({ status: e.target.value, page: '1' });
          }}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white',
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Plan Filter */}
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setPagination((prev) => ({ ...prev, page: 1 }));
            updateFilters({ plan: e.target.value, page: '1' });
          }}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white',
          }}
        >
          {PLAN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}
        >
          <span style={{ fontWeight: '500', color: '#1e40af' }}>
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => handleBulkAction('suspend')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#fbbf24',
              color: '#78350f',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Suspend
          </button>
          <button
            onClick={() => handleBulkAction('activate')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Activate
          </button>
          <button
            onClick={() => {
              setSelectedIds(new Set());
              setIsAllSelected(false);
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'transparent',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                Organization
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                Status
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                Plan
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                Animals
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                Created
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr
                key={org.id}
                style={{
                  backgroundColor: selectedIds.has(org.id) ? '#eff6ff' : 'transparent',
                }}
              >
                <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(org.id)}
                    onChange={(e) => handleSelectOne(org.id, e.target.checked)}
                  />
                </td>
                <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                  <div>
                    <div style={{ fontWeight: '500' }}>{org.name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{org.slug}.pawser.app</div>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                  {getStatusBadge(org.status)}
                </td>
                <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                    }}
                  >
                    {org.subscription?.planCode?.toUpperCase() || 'TRIAL'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                  {org._count?.animals || 0}
                </td>
                <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: '0.875rem' }}>
                  {formatDate(org.createdAt)}
                </td>
                <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>
                  <Link
                    href={`/organizations/${org.id}`}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                    }}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {organizations.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            No organizations found. Try adjusting your filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '1.5rem',
          }}
        >
          <button
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: pagination.page === 1 ? '#f3f4f6' : 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: pagination.page === 1 ? 'not-allowed' : 'pointer',
              opacity: pagination.page === 1 ? 0.5 : 1,
            }}
          >
            Previous
          </button>
          <span style={{ color: '#6b7280' }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: pagination.page === pagination.totalPages ? '#f3f4f6' : 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: pagination.page === pagination.totalPages ? 'not-allowed' : 'pointer',
              opacity: pagination.page === pagination.totalPages ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
