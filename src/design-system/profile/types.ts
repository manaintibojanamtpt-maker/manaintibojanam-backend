export interface ProfileQuickTileViewModel {
  readonly id: string;
  readonly label: string;
}

export interface ProfilePreferenceViewModel {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly value: string;
}

export interface ProfileGuestViewModel {
  readonly title: string;
  readonly description: string;
  readonly signInLabel: string;
  readonly browseLabel: string;
  readonly benefits: readonly string[];
}

export interface ProfileMemberViewModel {
  readonly displayName: string;
  readonly contactLine: string;
  readonly initials: string;
  readonly photoUrl?: string;
  readonly quickTiles: readonly ProfileQuickTileViewModel[];
  readonly preferences: readonly ProfilePreferenceViewModel[];
  readonly showProfileError: boolean;
}
