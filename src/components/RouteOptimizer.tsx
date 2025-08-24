import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface RouteSegment {
  from: string;
  to: string;
  duration: string;
  distance: string;
  durationValue: number;
  distanceValue: number;
}

const RouteOptimizer: React.FC = () => {
  const [destinations, setDestinations] = useState<string[]>([]);
  const [inputDestination, setInputDestination] = useState<string>('');
  const [origin, setOrigin] = useState<string>('');
  const [inputOrigin, setInputOrigin] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [optimizedRoute, setOptimizedRoute] = useState<string[]>([]);
  const [totalDuration, setTotalDuration] = useState<string>('');
  const [totalDistance, setTotalDistance] = useState<string>('');
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [returnToOrigin, setReturnToOrigin] = useState<boolean>(false);
  const [finalDestination, setFinalDestination] = useState<string>('');
  const [inputFinalDestination, setInputFinalDestination] = useState<string>('');
  const [useStartingAsFinal, setUseStartingAsFinal] = useState<boolean>(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const finalDestinationInputRef = useRef<HTMLInputElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const directionsService = useRef<google.maps.DirectionsService | null>(null);
  const directionsRenderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const destinationAutocomplete = useRef<google.maps.places.Autocomplete | null>(null);
  const originAutocomplete = useRef<google.maps.places.Autocomplete | null>(null);
  const finalDestinationAutocomplete = useRef<google.maps.places.Autocomplete | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const geocoder = useRef<google.maps.Geocoder | null>(null);

  const handleDestinationPlaceSelect = useCallback((): void => {
    const place = destinationAutocomplete.current?.getPlace();
    if (place?.formatted_address) {
      const destinationName = place.formatted_address;
      if (!destinations.includes(destinationName)) {
        setDestinations([...destinations, destinationName]);
        setInputDestination('');
      }
    }
  }, [destinations]);

  const handleOriginPlaceSelect = useCallback((): void => {
    const place = originAutocomplete.current?.getPlace();
    if (place?.formatted_address) {
      setOrigin(place.formatted_address);
      setInputOrigin('');
    }
  }, []);

  const handleFinalDestinationPlaceSelect = useCallback((): void => {
    const place = finalDestinationAutocomplete.current?.getPlace();
    if (place?.formatted_address) {
      setFinalDestination(place.formatted_address);
      setInputFinalDestination('');
    }
  }, []);

  const clearAllMarkers = useCallback((): void => {
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];
  }, []);

  const updateMapBounds = useCallback((): void => {
    if (!map.current || markers.current.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    markers.current.forEach(marker => {
      const position = marker.getPosition();
      if (position) bounds.extend(position);
    });

    map.current.fitBounds(bounds);

    // Set a minimum zoom level to avoid zooming too far out
    google.maps.event.addListenerOnce(map.current, 'bounds_changed', () => {
      if (map.current && map.current.getZoom() && map.current.getZoom()! > 15) {
        map.current.setZoom(15);
      }
    });
  }, []);

  const addMarker = useCallback((address: string, isOrigin: boolean = false): void => {
    if (!geocoder.current || !map.current) return;

    geocoder.current.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const marker = new window.google.maps.Marker({
          position: results[0].geometry.location,
          map: map.current,
          title: address,
          icon: {
            url: isOrigin ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new window.google.maps.Size(32, 32)
          }
        });

        markers.current.push(marker);
        updateMapBounds();
      }
    });
  }, [updateMapBounds]);

  const refreshAllMarkers = useCallback((): void => {
    clearAllMarkers();
    
    // Add origin marker if set
    if (origin) {
      addMarker(origin, true);
    }

    // Add destination markers
    destinations.forEach(destination => {
      addMarker(destination, false);
    });
  }, [origin, destinations, clearAllMarkers, addMarker]);

  const initializeMap = useCallback(async (): Promise<void> => {
    if (!apiKey || !mapRef.current) return;

    const loader = new Loader({
      apiKey: apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry']
    });

    try {
      await loader.load();
      
      map.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 }, // New York City
        zoom: 6,
      });

      directionsService.current = new window.google.maps.DirectionsService();
      directionsRenderer.current = new window.google.maps.DirectionsRenderer();
      directionsRenderer.current.setMap(map.current);

      // Initialize Geocoder for address to coordinates conversion
      geocoder.current = new window.google.maps.Geocoder();

      // Initialize Places Autocomplete for destinations
      if (destinationInputRef.current) {
        destinationAutocomplete.current = new window.google.maps.places.Autocomplete(destinationInputRef.current, {
          types: ['establishment', 'geocode'], // Include businesses, attractions, and geocoded places
          fields: ['place_id', 'formatted_address', 'name', 'types']
        });

        destinationAutocomplete.current.addListener('place_changed', handleDestinationPlaceSelect);
      }

      // Initialize Places Autocomplete for origin
      if (originInputRef.current) {
        originAutocomplete.current = new window.google.maps.places.Autocomplete(originInputRef.current, {
          types: ['establishment', 'geocode'], // Include businesses, attractions, and geocoded places
          fields: ['place_id', 'formatted_address', 'name', 'types']
        });

        originAutocomplete.current.addListener('place_changed', handleOriginPlaceSelect);
      }

      // Initialize Places Autocomplete for final destination
      if (finalDestinationInputRef.current) {
        finalDestinationAutocomplete.current = new window.google.maps.places.Autocomplete(finalDestinationInputRef.current, {
          types: ['establishment', 'geocode'],
          fields: ['place_id', 'formatted_address', 'name', 'types']
        });

        finalDestinationAutocomplete.current.addListener('place_changed', handleFinalDestinationPlaceSelect);
      }
    } catch (error) {
      console.error('Error loading Google Maps:', error);
    }
  }, [apiKey, handleDestinationPlaceSelect, handleOriginPlaceSelect, handleFinalDestinationPlaceSelect]);

  useEffect(() => {
    if (apiKey) {
      initializeMap();
    }
  }, [apiKey, initializeMap]);

  // Update markers when locations change
  useEffect(() => {
    if (map.current) {
      refreshAllMarkers();
    }
  }, [destinations, origin, refreshAllMarkers]);

  const addDestination = (): void => {
    if (inputDestination.trim() && !destinations.includes(inputDestination.trim())) {
      setDestinations([...destinations, inputDestination.trim()]);
      setInputDestination('');
    }
  };

  const removeDestination = (index: number): void => {
    setDestinations(destinations.filter((_, i) => i !== index));
  };

  const addOrigin = (): void => {
    if (inputOrigin.trim()) {
      setOrigin(inputOrigin.trim());
      setInputOrigin('');
    }
  };

  const clearOrigin = (): void => {
    setOrigin('');
  };

  const addFinalDestination = (): void => {
    if (inputFinalDestination.trim()) {
      setFinalDestination(inputFinalDestination.trim());
      setInputFinalDestination('');
    }
  };

  const clearFinalDestination = (): void => {
    setFinalDestination('');
  };

  const calculateOptimalRoute = async (): Promise<void> => {
    // Validation: need origin and at least 1 destination
    if (!origin && destinations.length < 2) {
      alert('Please set a starting location and add at least 1 destination, OR add at least 2 destinations.');
      return;
    }
    
    if (origin && destinations.length < 1) {
      alert('Please add at least 1 destination when using a custom starting location.');
      return;
    }
    
    if (!origin && destinations.length < 2) {
      alert('Please add at least 2 destinations when not using a custom starting location.');
      return;
    }

    if (!directionsService.current) {
      alert('Google Maps is not loaded yet. Please wait a moment and try again.');
      return;
    }

    setIsLoading(true);

    try {
      const routeOrigin = origin || destinations[0]; // Use explicit origin or first destination
      let destination: string;
      let waypoints: google.maps.DirectionsWaypoint[];

      // Determine final destination based on user settings
      let actualFinalDestination: string;
      if (useStartingAsFinal) {
        actualFinalDestination = routeOrigin;
      } else if (finalDestination) {
        actualFinalDestination = finalDestination;
      } else if (returnToOrigin) {
        actualFinalDestination = routeOrigin;
      } else {
        actualFinalDestination = destinations[destinations.length - 1];
      }

      if (returnToOrigin || useStartingAsFinal || (finalDestination && finalDestination === routeOrigin)) {
        // Round trip or ending at start
        destination = actualFinalDestination;
        if (origin) {
          // Custom origin: all destinations become waypoints
          waypoints = destinations.map((dest: string) => ({
            location: dest,
            stopover: true
          }));
        } else {
          // No custom origin: destinations except first become waypoints
          waypoints = destinations.slice(1).map((dest: string) => ({
            location: dest,
            stopover: true
          }));
        }
      } else {
        // One-way trip with specific final destination
        destination = actualFinalDestination;
        if (origin) {
          // Custom origin: filter out final destination from waypoints
          waypoints = destinations.filter(dest => dest !== finalDestination).map((dest: string) => ({
            location: dest,
            stopover: true
          }));
        } else {
          // No custom origin: filter out first and final destinations from waypoints
          waypoints = destinations.slice(1).filter(dest => dest !== finalDestination).map((dest: string) => ({
            location: dest,
            stopover: true
          }));
        }
      }

      const request: google.maps.DirectionsRequest = {
        origin: routeOrigin,
        destination: destination,
        waypoints: waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
      };

      directionsService.current.route(request, (result: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
        if (status === 'OK' && result) {
          directionsRenderer.current?.setDirections(result);
          
          // Extract optimized route
          const route = result.routes[0];
          const waypointOrder = route.waypoint_order || [];
          const optimized = [routeOrigin];
          
          if (returnToOrigin) {
            // For round trip, add all destinations in optimized order, then return to origin
            if (origin) {
              // Custom origin: waypoints are all destinations
              waypointOrder.forEach(index => {
                optimized.push(destinations[index]);
              });
            } else {
              // No custom origin: waypoints are destinations except first
              waypointOrder.forEach(index => {
                optimized.push(destinations[index + 1]);
              });
            }
            optimized.push(routeOrigin); // Return to origin
          } else {
            // One-way trip
            if (origin) {
              // Custom origin: waypoints are destinations except last
              waypointOrder.forEach(index => {
                optimized.push(destinations[index]);
              });
              optimized.push(destination);
            } else {
              // No custom origin: waypoints are destinations except first and last
              waypointOrder.forEach(index => {
                optimized.push(destinations[index + 1]);
              });
              optimized.push(destination);
            }
          }
          
          setOptimizedRoute(optimized);
          
          // Calculate total duration and distance
          let totalSeconds = 0;
          let totalMeters = 0;
          const segments: RouteSegment[] = [];

          route.legs.forEach((leg, index) => {
            if (leg.duration && leg.distance) {
              totalSeconds += leg.duration.value;
              totalMeters += leg.distance.value;

              // Create segment info
              const fromLocation = index === 0 ? routeOrigin : optimized[index];
              const toLocation = optimized[index + 1];
              
              segments.push({
                from: fromLocation,
                to: toLocation,
                duration: leg.duration.text,
                distance: leg.distance.text,
                durationValue: leg.duration.value,
                distanceValue: leg.distance.value
              });
            }
          });
          
          // Format total duration
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          setTotalDuration(`${hours}h ${minutes}m`);

          // Format total distance
          const kilometers = (totalMeters / 1000).toFixed(1);
          const miles = (totalMeters * 0.000621371).toFixed(1);
          setTotalDistance(`${kilometers} km (${miles} mi)`);

          // Set route segments
          setRouteSegments(segments);
        } else {
          console.error('Directions request failed due to ' + status);
          alert('Error calculating route. Please check your city names.');
        }
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Error calculating route:', error);
      setIsLoading(false);
    }
  };

  const handleDestinationKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      addDestination();
    }
  };

  const handleOriginKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      addOrigin();
    }
  };

  const handleFinalDestinationKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      addFinalDestination();
    }
  };

  const isCalculateDisabled = ((origin && destinations.length < 1) || (!origin && destinations.length < 2)) || !apiKey || isLoading;

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      fontFamily: 'Arial, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Map Section - Left Side */}
      <div style={{ 
        flex: '1', 
        minWidth: '60%',
        position: 'relative'
      }}>
        <div 
          ref={mapRef}
          style={{ 
            width: '100%', 
            height: '100%',
            border: 'none'
          }}
        />
      </div>

      {/* Controls Panel - Right Side */}
      <div style={{ 
        width: '400px',
        minWidth: '400px',
        backgroundColor: '#f8f9fa',
        borderLeft: '1px solid #ddd',
        overflow: 'auto',
        padding: '20px'
      }}>
        <h1 style={{ marginTop: 0, fontSize: '24px', marginBottom: '20px' }}>
          Travel Route Optimizer
        </h1>
        
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Google Maps API Key</h3>
          <input
            type="password"
            value={apiKey}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
            placeholder="Enter your Google Maps API key"
            style={{ width: '100%', padding: '8px', marginBottom: '5px', boxSizing: 'border-box' }}
          />
          <small style={{ color: '#666', fontSize: '12px' }}>
            Get your API key from Google Cloud Console
          </small>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Starting Location</h3>
          {!origin ? (
            <>
              <input
                ref={originInputRef}
                type="text"
                value={inputOrigin}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputOrigin(e.target.value)}
                onKeyPress={handleOriginKeyPress}
                placeholder="Enter starting location (optional)..."
                style={{ width: '100%', padding: '8px', marginBottom: '5px', boxSizing: 'border-box' }}
              />
              <button 
                onClick={addOrigin} 
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  backgroundColor: '#FF9800', 
                  color: 'white', 
                  border: 'none', 
                  cursor: 'pointer',
                  marginBottom: '5px'
                }}
              >
                Set Starting Location
              </button>
              <div style={{ fontSize: '11px', color: '#666' }}>
                Optional: If not set, the first destination will be used as starting point
              </div>
            </>
          ) : (
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#E8F5E8', 
              border: '1px solid #4CAF50', 
              borderRadius: '4px',
              marginBottom: '5px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#2E7D32' }}>
                  📍 {origin}
                </span>
                <button 
                  onClick={clearOrigin}
                  style={{ 
                    padding: '4px 8px', 
                    background: '#f44336', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '3px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
            {origin ? 'Add Destinations' : 'Add Destinations (first will be starting point)'}
          </h3>
          <input
            ref={destinationInputRef}
            type="text"
            value={inputDestination}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputDestination(e.target.value)}
            onKeyPress={handleDestinationKeyPress}
            placeholder="Start typing destination (cities, attractions, businesses)..."
            style={{ width: '100%', padding: '8px', marginBottom: '5px', boxSizing: 'border-box' }}
          />
          <button 
            onClick={addDestination} 
            style={{ 
              width: '100%', 
              padding: '8px', 
              backgroundColor: '#2196F3', 
              color: 'white', 
              border: 'none', 
              cursor: 'pointer',
              marginBottom: '5px'
            }}
          >
            Add Destination
          </button>
          <div style={{ fontSize: '11px', color: '#666' }}>
            Select from dropdown suggestions or press Enter to add manually
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
            Destinations to Visit ({destinations.length})
            {origin && destinations.length >= 1 && <span style={{color: '#4CAF50'}}> ✓</span>}
            {!origin && destinations.length >= 2 && <span style={{color: '#4CAF50'}}> ✓</span>}
          </h3>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            border: destinations.length > 0 ? '1px solid #ddd' : 'none',
            borderRadius: '4px',
            backgroundColor: 'white'
          }}>
            {destinations.length === 0 ? (
              <p style={{ color: '#999', fontStyle: 'italic', margin: '10px 0' }}>
                {origin ? 'Add at least 1 destination to start planning' : 'Add at least 2 destinations to start planning'}
              </p>
            ) : (
              <ul style={{ listStyle: 'none', padding: '10px', margin: 0 }}>
                {destinations.map((destination: string, index: number) => (
                  <li key={index} style={{ 
                    marginBottom: '8px', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontSize: '14px' }}>{index + 1}. {destination}</span>
                    <button 
                      onClick={() => removeDestination(index)}
                      style={{ 
                        padding: '4px 8px', 
                        background: '#ff4444', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '3px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Final Destination (Optional)</h3>
          {!finalDestination ? (
            <>
              <input
                ref={finalDestinationInputRef}
                type="text"
                value={inputFinalDestination}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputFinalDestination(e.target.value)}
                onKeyPress={handleFinalDestinationKeyPress}
                placeholder="Enter final destination (optional)..."
                style={{ width: '100%', padding: '8px', marginBottom: '5px', boxSizing: 'border-box' }}
              />
              <button 
                onClick={addFinalDestination} 
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  backgroundColor: '#9C27B0', 
                  color: 'white', 
                  border: 'none', 
                  cursor: 'pointer',
                  marginBottom: '5px'
                }}
              >
                Set Final Destination
              </button>
              <div style={{ fontSize: '11px', color: '#666' }}>
                If not set, the last destination will be the final stop
              </div>
            </>
          ) : (
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#F3E5F5', 
              border: '1px solid #9C27B0', 
              borderRadius: '4px',
              marginBottom: '5px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#7B1FA2' }}>
                  🏁 {finalDestination}
                </span>
                <button 
                  onClick={clearFinalDestination}
                  style={{ 
                    padding: '4px 8px', 
                    background: '#f44336', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '3px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          
          <div style={{ marginTop: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={useStartingAsFinal}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseStartingAsFinal(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '14px' }}>Use starting location as final destination</span>
            </label>
            <small style={{ color: '#666', fontSize: '12px', marginLeft: '24px' }}>
              When enabled, the route will end where it started (overrides final destination above)
            </small>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <input
              type="checkbox"
              checked={returnToOrigin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReturnToOrigin(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontSize: '14px' }}>Return to starting destination (round trip)</span>
          </label>
          <small style={{ color: '#666', fontSize: '12px', marginLeft: '24px' }}>
            When enabled, the route will end at the first destination for a complete round trip
          </small>
        </div>

        <button 
          onClick={calculateOptimalRoute}
          disabled={isCalculateDisabled}
          style={{ 
            width: '100%',
            padding: '12px 20px', 
            background: !isCalculateDisabled ? '#4CAF50' : '#ccc',
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: !isCalculateDisabled ? 'pointer' : 'not-allowed',
            marginBottom: '20px'
          }}
        >
          {isLoading ? 'Calculating...' : `Calculate ${returnToOrigin ? 'Round Trip' : 'Optimal Route'}`}
        </button>

        {optimizedRoute.length > 0 && (
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>
              {returnToOrigin ? 'Optimized Round Trip Route' : 'Optimized Route'}
            </h3>
            <div style={{ marginBottom: '12px', fontSize: '14px' }}>
              <p style={{ margin: '4px 0' }}><strong>Total Duration:</strong> {totalDuration}</p>
              <p style={{ margin: '4px 0' }}><strong>Total Distance:</strong> {totalDistance}</p>
            </div>
            <div style={{ 
              border: '1px solid #ddd', 
              borderRadius: '4px', 
              backgroundColor: 'white',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <ol style={{ padding: '15px', margin: 0 }}>
                {optimizedRoute.map((destination: string, index: number) => (
                  <li key={index} style={{ 
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: index === 0 || ((returnToOrigin || useStartingAsFinal || finalDestination) && index === optimizedRoute.length - 1) ? 'bold' : 'normal',
                    color: index === 0 ? '#2196F3' : ((returnToOrigin || useStartingAsFinal || finalDestination) && index === optimizedRoute.length - 1) ? '#9C27B0' : 'inherit'
                  }}>
                    {destination}
                    {index === 0 && ' (Starting Point)'}
                    {returnToOrigin && index === optimizedRoute.length - 1 && ' (Return to Start)'}
                    {useStartingAsFinal && index === optimizedRoute.length - 1 && ' (Final - Back to Start)'}
                    {finalDestination && index === optimizedRoute.length - 1 && destination === finalDestination && ' (Final Destination)'}
                  </li>
                ))}
              </ol>
            </div>
            {returnToOrigin && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                ✓ Round trip complete - you'll end where you started
              </p>
            )}

            {/* Route Segments Breakdown */}
            {routeSegments.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#333' }}>
                  Route Breakdown
                </h4>
                <div style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '4px', 
                  backgroundColor: 'white',
                  maxHeight: '250px',
                  overflowY: 'auto'
                }}>
                  {routeSegments.map((segment, index) => (
                    <div key={index} style={{ 
                      padding: '10px 15px', 
                      borderBottom: index < routeSegments.length - 1 ? '1px solid #eee' : 'none',
                      fontSize: '13px'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
                        {index + 1}. {segment.from} → {segment.to}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                        <span>🕒 {segment.duration}</span>
                        <span>📏 {segment.distance}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteOptimizer;
