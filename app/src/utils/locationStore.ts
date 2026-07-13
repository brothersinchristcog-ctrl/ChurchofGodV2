import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_KEY = '@church_of_god_starting_location';

export interface SavedLocation {
  name: string;
  lat: number;
  lng: number;
}

export const saveStartingLocation = async (loc: SavedLocation) => {
  try {
    await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
  } catch (e) {
    console.warn('Failed to save location', e);
  }
};

export const getStartingLocation = async (): Promise<SavedLocation> => {
  try {
    const data = await AsyncStorage.getItem(LOCATION_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to read location', e);
  }
  
  // Default home location
  return {
    name: 'Church of God, Hyderabad',
    lat: 17.3850,
    lng: 78.4867
  };
};

export const formatDuration = (mins: number) => {
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hrs` : `${h} hrs ${m} mins`;
};