import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { adminDownload, adminFetch, formatTomanFa } from '../api';
import {
  AdminBarChart, AdminDonutChart, AdminLineChart, PeriodFilter, type FinancePeriod,
} from '../FinanceCharts';

type Sales = {
  period: FinancePeriod;
  totalRevenue: number;
  dailyOrMonthly: Array<{ label: string; value: number }>;
  categories: Array<{ slug: string; label: string; value: number }>;
  paymentMix: Array<{ currency: string; label: string; value: number }>;
};

const PAY_COLORS = ['#0f766e', '#5c4d91', '#c2410c', '#0369a1', '#64748b'];

export function AdminFinanceSalesPage() {
  const [period, setPeriod] = useState<FinancePeriod>('month');
  const [data, setData] = useState<Sales | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await adminFetch<Sales>(`/api/admin/finance/sales?period=${period}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    }
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>نمودارهای فروش</h1>
          <p>فروش روزانه/ماهانه · دسته‌بندی · ترکیب پرداخت</p>
        </div>
        <div className="admin-header-actions">
          <PeriodFilter value={period} onChange={setPeriod} />
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={() => {
              void adminDownload(
                `/api/admin/finance/export?kind=sales&period=${period}`,
                `petdate-sales-${period}.csv`
              ).catch((err) => {
                alert(err instanceof Error ? err.message : 'خروجی ناموفق بود');
              });
            }}
          >
            <Download size={16} /> CSV
          </button>
        </div>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}

      {data ? (
        <>
          <p className="admin-muted" style={{ marginBottom: 12 }}>
            جمع فروش پرداخت‌شده: <strong>{formatTomanFa(data.totalRevenue)}</strong>
          </p>
          <div className="admin-dash-grid">
            <section className="admin-card admin-card--wide">
              <div className="admin-card-head">
                <h2>{period === 'year' ? 'فروش ماهانه' : 'فروش روزانه'}</h2>
              </div>
              <div style={{ padding: 16 }}>
                <AdminLineChart points={data.dailyOrMonthly} />
              </div>
            </section>
            <section className="admin-card">
              <div className="admin-card-head"><h2>فروش بر اساس دسته</h2></div>
              <div style={{ padding: 16 }}>
                <AdminBarChart
                  color="#0369a1"
                  points={data.categories.slice(0, 8).map((c) => ({ label: c.label, value: c.value }))}
                />
              </div>
            </section>
            <section className="admin-card">
              <div className="admin-card-head"><h2>ترکیب پرداخت</h2></div>
              <div style={{ padding: 16 }}>
                <AdminDonutChart
                  slices={data.paymentMix.map((p, i) => ({
                    label: p.label,
                    value: p.value,
                    color: PAY_COLORS[i % PAY_COLORS.length],
                  }))}
                />
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
