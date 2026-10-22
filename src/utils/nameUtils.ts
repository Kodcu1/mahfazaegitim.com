export function formatStudentName(
  first_name?: string | null,
  last_name?: string | null,
  full_name?: string | null,
  name?: string | null
): { first_name: string; last_name: string; full_name: string } {
  const fullName = full_name || name || [first_name, last_name].filter(Boolean).join(' ') || 'Öğrenci';
  
  const firstName = first_name || (fullName.includes(' ') ? fullName.split(' ')[0] : fullName);
  const lastName = last_name || (fullName.includes(' ') ? fullName.split(' ').slice(1).join(' ') : '');
  
  return { first_name: firstName, last_name: lastName, full_name: fullName };
}
