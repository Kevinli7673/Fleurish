import React from 'react';
import { View } from 'react-native';

// This screen is intentionally empty. The tab's tabBarButton (see _layout.tsx)
// intercepts the press and pushes /camera instead of navigating here.
export default function CameraTabPlaceholder() {
  return <View />;
}
