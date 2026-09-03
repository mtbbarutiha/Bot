import { useNavigate } from 'react-router-dom';
import { BrandMark } from '../../components/BrandMark';
import type { UserRole } from '@petdate/shared';
import { BRAND, USER_ROLE_LABELS, USER_ROLES } from '@petdate/shared';
import { useUserStore } from '../../hooks/useUserStore';

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
  const { saveRoleToApi } = useUserStore();

  const handleSelect = async (role: UserRole) => {
    await saveRoleToApi(role);
    navigate(`/onboarding/wizard/${role}`);
  };

  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <BrandMark iconSize={32} />
        <h1>نقش خودت رو انتخاب کن</h1>
        <p>
          {BRAND.taglineFa} · {BRAND.taglineEn}
        </p>
      </header>

      <div className="role-grid">
        {USER_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            className="role-card"
            onClick={() => handleSelect(role)}
          >
            <span className="role-card-label">{USER_ROLE_LABELS[role]}</span>
            <span className="role-card-desc">{ROLE_DESCRIPTIONS[role]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
