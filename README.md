# Travel Route Optimizer

A React application that helps users plan the optimal travel route through multiple cities using Google Maps API.

## Features

- Add multiple cities to visit
- Calculate the shortest duration route using Google Maps
- Visual route display on an interactive map
- Route optimization using Google Maps waypoint optimization
- Total travel time calculation

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Get Google Maps API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the following APIs:
     - Maps JavaScript API
     - Directions API
     - Places API
   - Create credentials (API Key)
   - Restrict the API key to your domain for security

3. **Start the development server:**
   ```bash
   npm start
   ```

## Usage

1. Enter your Google Maps API key in the designated field
2. Add cities you want to visit using the input field
3. Click "Calculate Optimal Route" to generate the best route
4. View the optimized route on the map with total duration

## API Key Security

**Important:** Never commit your API key to version control. The app requires you to enter the API key each time for security. In production, consider using environment variables or a secure backend to manage API keys.

## Technologies Used

- React with TypeScript
- Google Maps JavaScript API
- @googlemaps/js-api-loader
- TypeScript for type safety

## Route Optimization

The app uses Google Maps' built-in waypoint optimization which provides good results for most use cases. For larger numbers of cities (10+), you might want to implement a more sophisticated traveling salesman problem solver.
