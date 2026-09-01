import { Link } from 'react-router-dom';
import { Cat, Dog, Mail, PawPrint, Plus, Users } from 'lucide-react';
import { usePetStore } from '../../hooks/usePetStore';

export function AdminDashboardPage() {
  const { pets, matches, owners } = usePetStore();

  const pending = matches.filter((m) => m.status === 'pending').length;
  const dogs = pets.filter((p) => p.type === 'dog').length;
  const cats = pets.filter((p) => p.type === 'cat').length;

  const stats = [
    { label: 'کل پت‌ها', value: pets.length + 1, icon: PawPrint, color: 'blue' },
    { label: 'سگ', value: dogs + 1, icon: Dog, color: 'orange' },
    { label: 'گربه', value: cats, icon: Cat, color: 'purple' },
    { label: 'درخواست باز', value: pending, icon: Mail, color: 'green' },
    { label: 'کاربران', value: owners.length, icon: Users, color: 'slate' },
  ];

  const recent = [...pets].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>داشبورد</h1>
          <p>خلاصه وضعیت petdate</p>
        </div>
        <Link to="/admin/pets/new" className="admin-btn admin-btn--primary">
          <Plus size={16} />
          پت جدید
        </Link>
      </header>

      <div className="admin-stats">
        {stats.map((s) => (
          <div key={s.label} className={`admin-stat admin-stat--${s.color}`}>
            <div className="admin-stat-icon"><s.icon size={20} /></div>
            <div>
              <div className="admin-stat-value">{s.value}</div>
              <div className="admin-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2>آخرین پت‌های ثبت‌شده</h2>
          <Link to="/admin/pets">مشاهده همه</Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>عکس</th>
                <th>نام</th>
                <th>نوع</th>
                <th>نژاد</th>
                <th>محله</th>
                <th>فاصله</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((pet) => (
                <tr key={pet.id}>
                  <td>
                    <img src={pet.imageUrl} alt={pet.name} className="admin-thumb" />
                  </td>
                  <td><Link to={`/admin/pets/${pet.id}/edit`}>{pet.name}</Link></td>
                  <td>{pet.type}</td>
                  <td>{pet.breed}</td>
                  <td>{pet.neighborhood}</td>
                  <td>{pet.distanceKm} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
