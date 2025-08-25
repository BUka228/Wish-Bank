import { backgroundServices } from './background-services';

/**
 * Initialize background services
 * This should be called when the application starts
 */
export function initializeBackgroundServices(): void {
  // Only start in production or when explicitly enabled
  const shouldStart = process.env.NODE_ENV === 'production' || 
                     process.env.ENABLE_BACKGROUND_SERVICES === 'true';

  if (shouldStart) {
    console.log('Initializing background services...');
    backgroundServices.start();
  } else {
    console.log('Background services disabled in development mode');
    console.log('Set ENABLE_BACKGROUND_SERVICES=true to enable in development');
  }
}

/**
 * Gracefully shutdown background services
 * This should be called when the application is shutting down
 */
export function shutdownBackgroundServices(): void {
  console.log('Shutting down background services...');
  backgroundServices.stop();
}

// Handle process termination signals
if (typeof process !== 'undefined') {
  process.on('SIGTERM', shutdownBackgroundServices);
  process.on('SIGINT', shutdownBackgroundServices);
  process.on('exit', shutdownBackgroundServices);
}