/** People who can use jibi on a device. Add someone here to give them a profile. */
export const APP_USERS = [
  { username: 'issam', display_name: 'Issam', icon: '🦁' },
  { username: 'azizi', display_name: 'Azizi', icon: '🦊' },
  { username: 'firas', display_name: 'Firas', icon: '🐺' },
  { username: 'adem', display_name: 'Adem', icon: '🐻' },
  { username: 'maryem', display_name: 'Maryem', icon: '🦋' },
] as const;

export type Username = (typeof APP_USERS)[number]['username'];
