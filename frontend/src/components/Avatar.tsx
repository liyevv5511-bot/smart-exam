/** İstifadəçi avatarı — şəkil varsa onu, yoxdursa ad baş hərfini göstərir. */
export function Avatar({
  url,
  name,
  size = 40,
  className = '',
}: {
  url?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={name || 'avatar'}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`grid shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200 ${className}`}
    >
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}
