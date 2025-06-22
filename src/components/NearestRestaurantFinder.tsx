'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RestaurantData {
  restaurant: {
    name: string;
    isChain: boolean;
    chainName: string | null;
    address: string;
    website: string;
    hours: string[];
    phone: string;
    rating: number;
    placeId: string;
  };
  analysis: {
    place_names: string[];
    multiple_locations: boolean;
    activity_type: string;
    foods_shown: string[];
    tags: string[];
    context_clues: string[];
  };
  processing: {
    frameCount: number;
    originalPlaceCount: number;
    validatedPlaceCount: number;
    geocodedPlaceCount: number;
  };
}

interface Location {
  lat: number;
  lng: number;
}

interface MemberLocation {
  userId: string;
  displayName?: string;
  location: Location;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

interface ApiResponse {
  success: boolean;
  data: {
    restaurant: RestaurantData['restaurant'];
    analysis: RestaurantData['analysis'];
    processing: RestaurantData['processing'];
    location: {
      centroid: Location;
      memberLocations: MemberLocation[];
      distanceToRestaurant: number;
    };
  };
}

interface NearestRestaurantFinderProps {
  partyId: string;
  restaurantData?: RestaurantData;
  onRestaurantFound?: (data: ApiResponse['data']) => void;
}

export const NearestRestaurantFinder: React.FC<NearestRestaurantFinderProps> = ({
  partyId,
  restaurantData,
  onRestaurantFound
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFindRestaurant = async () => {
    if (!user) {
      setError('You must be logged in to find restaurants');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/find-nearest-restaurant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partyId,
          restaurantData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'No members with addresses found') {
          setError(`No members have completed their address information. Please ask party members to complete their profile with their full address (street, city, state).`);
        } else if (data.error === 'Could not geocode any member addresses') {
          setError(`Unable to find the locations for member addresses. Please ensure addresses are complete and valid (street, city, state, zip code).`);
        } else if (data.error === 'Google Maps API key is missing') {
          setError(`Google Maps API is not configured. Please contact the administrator.`);
        } else {
          setError(data.error || 'Failed to find nearest restaurant');
        }
        return;
      }

      if (data.success) {
        setResult(data.data);
        onRestaurantFound?.(data.data);
      } else {
        throw new Error('Failed to find nearest restaurant');
      }
    } catch (err) {
      console.error('Error finding restaurant:', err);
      setError('Failed to connect to the restaurant finder service');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: any) => {
    if (!address) return 'No address';
    return [
      address.street,
      address.city,
      address.state,
      address.zipCode,
      address.country
    ].filter(Boolean).join(', ');
  };

  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)} meters`;
    }
    return `${distance.toFixed(1)} km`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Find Nearest Restaurant</h3>
          <p className="text-sm text-gray-500">
            Find the best restaurant location based on party member addresses
          </p>
        </div>
        <button
          onClick={handleFindRestaurant}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Finding...' : 'Find Restaurant'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Unable to find restaurant</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                {error.includes('address') && (
                  <div className="mt-2">
                    <p className="font-medium">To fix this:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Complete your profile with your full address (street, city, state)</li>
                      <li>Ask other party members to add their complete addresses</li>
                      <li>Ensure addresses include street, city, and state for best results</li>
                      <li>Use valid, complete addresses that Google Maps can recognize</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Restaurant Found!</h3>
              <div className="mt-2 text-sm text-green-700">
                <p><strong>{result.restaurant.name}</strong></p>
                <p>{result.restaurant.address}</p>
                {result.restaurant.rating && (
                  <p>Rating: {result.restaurant.rating}/5</p>
                )}
                {result.location && (
                  <p className="mt-2 text-xs">
                    Distance from party center: {result.location.distanceToRestaurant.toFixed(1)} km
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 