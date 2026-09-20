import type { PublicProvider, User } from '@petdate/shared';

/**
 * تبدیل رکورد کامل کاربر به کارت عمومی ارائه‌دهنده (دامپزشک/مربی).
 *
 * فهرست‌های عمومی مستقیماً خروجی `mapUser` را برنمی‌گردانند؛ آن رکورد شامل
 * phone، telegramId، موجودی کیف پول و وضعیت احراز هویت است. فقط فیلدهای
 * نمایشی این‌جا allowlist می‌شوند — هر فیلد جدید کاربر به‌صورت پیش‌فرض خصوصی
 * می‌ماند مگر این‌که عمداً به این تابع اضافه شود.
 */
export function toPublicProvider(user: User): PublicProvider {
  return {
    id: user.id,
    publicId: user.publicId,
    name: user.name,
    avatarUrl: user.avatarUrl,
    city: user.city,
    province: user.province,
    bio: user.bio,
    roles: user.roles?.length ? user.roles : user.role ? [user.role] : [],
    vetOnline: user.vetOnline,
    vetEnabled: user.vetEnabled,
    vetCredentialStatus: user.vetCredentialStatus,
    avgRating: user.avgRating,
    ratingCount: user.ratingCount,
  };
}

export function toPublicProviders(users: User[]): PublicProvider[] {
  return users.map(toPublicProvider);
}
