import * as Location from 'expo-location';
import { supabase } from './supabase';

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

let locationSubscription: Location.LocationSubscription | null = null;
let updateTimer: NodeJS.Timeout | null = null;

export async function startGPSTracking(
  userId: string,
  onLocationUpdate?: (location: LocationUpdate) => void,
  updateInterval: number = 30000
): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return false;
    }

    if (locationSubscription) {
      await stopGPSTracking();
    }

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: updateInterval,
        distanceInterval: 50,
      },
      async (location) => {
        const locationData: LocationUpdate = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date(),
        };

        await updateUserLocation(userId, locationData.latitude, locationData.longitude);

        if (onLocationUpdate) {
          onLocationUpdate(locationData);
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error starting GPS tracking:', error);
    return false;
  }
}

export async function stopGPSTracking(): Promise<void> {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
}

export async function updateUserLocation(
  userId: string,
  latitude: number,
  longitude: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        latitude,
        longitude,
        gps_enabled: true,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating location:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating user location:', error);
    return false;
  }
}

export async function getCurrentLocation(): Promise<LocationUpdate | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

export function subscribeToUserLocation(
  userId: string,
  onLocationChange: (location: { latitude: number; longitude: number }) => void
) {
  const subscription = supabase
    .channel(`user_location_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        const newData = payload.new as any;
        if (newData.latitude && newData.longitude) {
          onLocationChange({
            latitude: newData.latitude,
            longitude: newData.longitude,
          });
        }
      }
    )
    .subscribe();

  return subscription;
}
