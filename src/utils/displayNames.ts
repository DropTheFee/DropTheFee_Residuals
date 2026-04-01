const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  'bd5c661b-dc02-479d-95df-65a445de99b7': 'Venture Apps',
};

export function getRepDisplayName(userId: string, fullName: string | null | undefined): string {
  return DISPLAY_NAME_OVERRIDES[userId] ?? fullName ?? 'Unknown';
}
