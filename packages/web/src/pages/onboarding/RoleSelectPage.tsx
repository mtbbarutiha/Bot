import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from '../../components/BrandMark';
import type { UserRole } from '@petdate/shared';
import {
  BRAND,
  ROLE_CONFIRM_LABEL,
  USER_ROLE_LABELS,
  USER_ROLES,
  primaryRole,
} from '@petdate/shared';
import { useAuthStore } from '../../hooks/useAuthStore';

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  pet_owner: 'پت داری و دنبال همبازی برایش هستی',
  vet: 'دامپزشک هستی و می‌خوای مشاوره بدی',
  no_pet: 'فعلاً پت نداری ولی علاقه‌مند به دنیای پت‌ها هستی',
  pet_seeker: 'دنبال پت مناسب برای خانه‌ات هستی',
  community_seeker: 'می‌خوای با جامعه پت‌داران ارتباط بگیری',
  trainer: 'مربی یا آموزش‌دهنده حیوانات هستی',
  pet_sitter: 'نگهبان پت هستی یا دنبال این خدمت هستی',
};

export function RoleSelectPage() {
  const navigate = useNavigate();
  const { saveRoles, isLoggedIn } = useAuthStore();
  const [selected, setSelected] = useState<UserRole[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoggedIn) {
    navigate('/auth/login', { replace: true });
    return null;
  }

  const toggleRole = (role: UserRole) => {
    setSelected((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
    setError(null);
  };

  const handleConfirm = async () => {
    if (!selected.length) {
      setError('حداقل یک نقش انتخاب کن');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveRoles(selected);
      const next = primaryRole(selected) ?? selected[0]!;
      if (next === 'pet_owner') {
        navigate('/onboarding/profile');
      } else {
        navigate('/onboarding/profile');
      }
    } catch {
      setError('ثبت نقش‌ها ناموفق بود. دوباره امتحان کن.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <BrandMark iconSize={32} />
        <h1>نقش‌هات رو انتخاب کن</h1>
        <p>می‌تونی چند نقش داشته باشی · {BRAND.taglineFa}</p>
      </header>

      <div className="role-grid">
        {USER_ROLES.map((role) => {
          const active = selected.includes(role);
          return (
            <button
              key={role}
              type="button"
              className={`role-card${active ? ' role-card--selected' : ''}`}
              onClick={() => toggleRole(role)}
              aria-pressed={active}
            >
              <span className="role-card-label">
                {active ? '✓ ' : ''}
                {USER_ROLE_LABELS[role]}
              </span>
              <span className="role-card-desc">{ROLE_DESCRIPTIONS[role]}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="role-select-error">{error}</p>}

      <button
        type="button"
        className="cta-btn cta-btn--spaced"
        onClick={handleConfirm}
        disabled={saving || selected.length === 0}
      >
        {saving ? 'در حال ثبت…' : ROLE_CONFIRM_LABEL}
      </button>
    </div>
  );
}
