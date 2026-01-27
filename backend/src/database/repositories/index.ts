/**
 * Database Repositories
 *
 * Export all repositories
 */

export * from './natal-chart.repository';
export * from './user.repository';

// Export singleton instances for dependency injection
import { natalChartRepository } from './natal-chart.repository';
import { userRepository } from './user.repository';

export {
  natalChartRepository,
  userRepository
};
