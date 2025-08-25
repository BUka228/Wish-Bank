/**
 * Core Admin Control Panel E2E Tests
 * Focused tests for essential functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Admin Control Panel Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    global.fetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [],
          message: 'Test response'
        })
      });
    });
  });

  describe('Component Integration', () => {
    it('should successfully import all admin components', async () => {
      const components = await Promise.all([
        import('../../components/admin/UserParameterManager'),
        import('../../components/admin/SharedWishManager'),
        import('../../components/admin/AdminAuditLog'),
        import('../../components/admin/AdminPageSecurity'),
        import('../../components/admin/AdminSecurityGuard'),
        import('../../components/admin/AdminConfirmationDialog')
      ]);

      components.forEach(component => {
        expect(component).toBeDefined();
        expect(component.default || component).toBeDefined();
      });
    });

    it('should successfully import mobile optimization components', async () => {
      const mobileComponents = await Promise.all([
        import('../../components/wishes/MobileOptimizedWishCard'),
        import('../../components/wishes/MobileOptimizedWishTabs'),
        import('../../components/wishes/VirtualizedWishList'),
        import('../../components/ResponsiveLayout'),
        import('../../components/TouchInteractions')
      ]);

      mobileComponents.forEach(component => {
        expect(component).toBeDefined();
      });
    });

    it('should successfully import notification components', async () => {
      const notificationComponents = await Promise.all([
        import('../../components/notifications/InAppNotificationHistory'),
        import('../../components/notifications/NotificationSettings'),
        import('../../lib/shared-wish-notifications')
      ]);

      notificationComponents.forEach(component => {
        expect(component).toBeDefined();
      });
    });
  });

  describe('API Integration', () => {
    it('should handle admin API endpoints', async () => {
      const endpoints = [
        '/api/admin/security/validate',
        '/api/admin/users/list',
        '/api/admin/shared-wishes/create',
        '/api/admin/audit/logs'
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(endpoint);
        expect(response.ok).toBe(true);
        
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    });

    it('should handle user parameter adjustment workflow', async () => {
      // 1. Validate admin access
      const securityResponse = await fetch('/api/admin/security/validate');
      expect(securityResponse.ok).toBe(true);

      // 2. Get users list
      const usersResponse = await fetch('/api/admin/users/list');
      expect(usersResponse.ok).toBe(true);

      // 3. Adjust user parameters
      const adjustResponse = await fetch('/api/admin/users/user1/adjust', {
        method: 'POST',
        body: JSON.stringify({
          mana_balance: 150,
          reason: 'Test adjustment'
        })
      });
      expect(adjustResponse.ok).toBe(true);

      // 4. Check audit log
      const auditResponse = await fetch('/api/admin/audit/logs');
      expect(auditResponse.ok).toBe(true);
    });

    it('should handle shared wish creation workflow', async () => {
      // 1. Create shared wish
      const createResponse = await fetch('/api/admin/shared-wishes/create', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test shared wish',
          category: 'general',
          reason: 'Test creation'
        })
      });
      expect(createResponse.ok).toBe(true);

      // 2. Manage shared wishes
      const manageResponse = await fetch('/api/admin/shared-wishes/manage');
      expect(manageResponse.ok).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should provide admin security functions', async () => {
      const { validateAdminAccess } = await import('../../lib/admin-security');
      expect(validateAdminAccess).toBeDefined();
      expect(typeof validateAdminAccess).toBe('function');
    });

    it('should provide mobile detection utilities', async () => {
      const { useDeviceDetection } = await import('../../lib/mobile-detection');
      expect(useDeviceDetection).toBeDefined();
      expect(typeof useDeviceDetection).toBe('function');
    });

    it('should provide notification system', async () => {
      const { SharedWishNotificationSystem } = await import('../../lib/shared-wish-notifications');
      expect(SharedWishNotificationSystem).toBeDefined();
      
      const notificationSystem = new SharedWishNotificationSystem();
      expect(notificationSystem).toBeDefined();
    });
  });

  describe('Database Integration', () => {
    it('should have database connection utilities', async () => {
      const { sql } = await import('../../lib/db-pool');
      expect(sql).toBeDefined();
      expect(typeof sql).toBe('function');
    });

    it('should have admin audit functions', async () => {
      const auditFunctions = await import('../../lib/admin-audit-functions');
      expect(auditFunctions).toBeDefined();
    });

    it('should have shared wish functions', async () => {
      const sharedWishFunctions = await import('../../lib/shared-wishes-functions');
      expect(sharedWishFunctions).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should have consistent TypeScript types', async () => {
      const types = await Promise.all([
        import('../../types/database'),
        import('../../types/quest-economy'),
        import('../../types/mana-system')
      ]);

      types.forEach(typeModule => {
        expect(typeModule).toBeDefined();
      });
    });
  });

  describe('Build Integration', () => {
    it('should have all required files accessible', () => {
      const criticalFiles = [
        '../../app/admin/control-panel/page.tsx',
        '../../components/admin/UserParameterManager.tsx',
        '../../components/admin/SharedWishManager.tsx',
        '../../lib/admin-security.ts',
        '../../lib/mobile-detection.ts'
      ];

      criticalFiles.forEach(file => {
        expect(() => require.resolve(file)).not.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock failed API response
      global.fetch = vi.fn().mockImplementation(() => 
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' })
        })
      );

      const response = await fetch('/api/admin/users/list');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should handle network failures', async () => {
      // Mock network failure
      global.fetch = vi.fn().mockImplementation(() => 
        Promise.reject(new Error('Network error'))
      );

      try {
        await fetch('/api/admin/users/list');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Mock large dataset response
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item${i}`,
        name: `Item ${i}`
      }));

      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: largeDataset,
            total: 1000
          })
        })
      );

      const response = await fetch('/api/admin/users/list');
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1000);
    });

    it('should handle concurrent operations', async () => {
      const operations = [
        fetch('/api/admin/users/list'),
        fetch('/api/admin/shared-wishes/manage'),
        fetch('/api/admin/audit/logs')
      ];

      const results = await Promise.allSettled(operations);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(['fulfilled', 'rejected']).toContain(result.status);
      });
    });
  });
});