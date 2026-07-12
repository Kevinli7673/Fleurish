import React, { createContext, useContext, useState, ReactNode } from 'react';

type ProfileData = {
  photoUri: string | null;
  location: string;
  bio: string;
};

type ProfileContextValue = ProfileData & {
  updateProfile: (data: Partial<ProfileData>) => void;
};

const defaultProfile: ProfileData = {
  photoUri: null,
  location: 'Orlando, FL',
  bio: 'This is where niche bio would be.',
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);

  const updateProfile = (data: Partial<ProfileData>) => {
    setProfile((prev) => ({ ...prev, ...data }));
  };

  return (
    <ProfileContext.Provider value={{ ...profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}