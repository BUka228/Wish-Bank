// Currency Converter for Mana Economy System Migration
// Converts old currency balances (green, blue, red) to new Mana system

import { sql } from './db-pool';
import { User } from '../types/quest-economy';
import { MigrationError, LEGACY_CONVERSION_RATES } from '../types/mana-system';

export class CurrencyConverter {
  /**
   * Calculate conversion rates for legacy currencies to Mana
   * Green wishes = 10 Mana, Blue wishes = 100 Mana, Red wishes = 1000 Mana
   */
  calculateConversionRate(): { green: number; blue: number; red: number } {
    return LEGACY_CONVERSION_RATES;
  }

  /**
   * Convert user's legacy balances to Mana amount
   * @param user User object with legacy balances
   * @returns Total Mana amount after conversion
   */
  convertBalancesToMana(user: User): number {
    const rates = this.calculateConversionRate();
    
    const greenMana = user.green_balance * rates.green;
    const blueMana = user.blue_balance * rates.blue;
    const redMana = user.red_balance * rates.red;
    
    return greenMana + blueMana + redMana;
  }

  /**
   * Migrate a single user from legacy currency system to Mana
   * @param userId User ID to migrate
   * @throws MigrationError if migration fails
   */
  async migrateUserEconomy(userId: string): Promise<void> {
    try {
      await sql`BEGIN`;

      // Step 1: Get current user data
      const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;

      if (userResult.length === 0) {
        throw new MigrationError(userId, 'user_not_found');
      }

      const user = userResult[0] as User;

      // Step 2: Check if already migrated
      if (user.legacy_migration_completed) {
        console.log(`User ${userId} already migrated, skipping`);
        await sql`COMMIT`;
        return;
      }

      // Step 3: Calculate Mana conversion
      const totalMana = this.convertBalancesToMana(user);

      // Step 4: Create backup transaction record
      await sql`
        INSERT INTO transactions (
          user_id, type, wish_type, amount, mana_amount, reason, 
          transaction_category, transaction_source, experience_gained
        ) VALUES (
          ${userId}, 'credit', 'green', 
          ${user.green_balance + user.blue_balance + user.red_balance},
          ${totalMana}, 'Legacy currency conversion to Mana',
          'migration', 'currency_converter', 0
        )
      `;

      // Step 5: Update user with new Mana balance and mark as migrated
      await sql`
        UPDATE users 
        SET mana_balance = ${totalMana}, 
            legacy_migration_completed = ${true},
            updated_at = NOW()
        WHERE id = ${userId}
      `;

      // Step 6: Log the migration details
      console.log(`Migration completed for user ${userId}:`, {
        green_balance: user.green_balance,
        blue_balance: user.blue_balance,
        red_balance: user.red_balance,
        total_mana: totalMana,
        conversion_rates: this.calculateConversionRate()
      });

      await sql`COMMIT`;

    } catch (error) {
      await sql`ROLLBACK`;
      
      if (error instanceof MigrationError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new MigrationError(userId, `database_error: ${errorMessage}`);
    }
  }

  /**
   * Rollback migration for a user (restore legacy balances)
   * @param userId User ID to rollback
   * @throws MigrationError if rollback fails
   */
  async rollbackUserMigration(userId: string): Promise<void> {
    try {
      await sql`BEGIN`;

      // Step 1: Get current user data
      const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;

      if (userResult.length === 0) {
        throw new MigrationError(userId, 'user_not_found_for_rollback');
      }

      const user = userResult[0] as User;

      // Step 2: Check if user was actually migrated
      if (!user.legacy_migration_completed) {
        console.log(`User ${userId} was not migrated, nothing to rollback`);
        await sql`COMMIT`;
        return;
      }

      // Step 3: Find the original migration transaction
      const migrationTxResult = await sql`
        SELECT * FROM transactions 
        WHERE user_id = ${userId}
          AND transaction_source = 'currency_converter'
          AND reason = 'Legacy currency conversion to Mana'
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      if (migrationTxResult.length === 0) {
        throw new MigrationError(userId, 'migration_transaction_not_found');
      }

      // Step 4: Calculate original balances from the migration transaction
      // This is a simplified approach - in a real system you might want to store
      // the original balances in the transaction metadata
      const migrationTx = migrationTxResult[0];
      const totalOriginalWishes = migrationTx.amount;
      
      // For rollback, we'll need to reverse-engineer the original balances
      // This is a limitation of not storing original balances in metadata
      // For now, we'll set mana_balance to 0 and mark as not migrated
      
      // Step 5: Reset user to pre-migration state
      await sql`
        UPDATE users 
        SET mana_balance = 0,
            legacy_migration_completed = ${false},
            updated_at = NOW()
        WHERE id = ${userId}
      `;

      // Step 6: Create rollback transaction record
      await sql`
        INSERT INTO transactions (
          user_id, type, wish_type, amount, mana_amount, reason, 
          transaction_category, transaction_source, experience_gained
        ) VALUES (
          ${userId}, 'debit', 'green', 0, ${migrationTx.mana_amount},
          'Rollback of legacy currency conversion', 'migration_rollback',
          'currency_converter', 0
        )
      `;

      console.log(`Migration rollback completed for user ${userId}`);

      await sql`COMMIT`;

    } catch (error) {
      await sql`ROLLBACK`;
      
      if (error instanceof MigrationError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new MigrationError(userId, `rollback_error: ${errorMessage}`);
    }
  }

  /**
   * Validate data integrity before migration
   * @param userId User ID to validate
   * @returns Validation result with details
   */
  async validateUserDataIntegrity(userId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    userData?: User;
    calculatedMana?: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get user data
      const userResult = await sql`SELECT * FROM users WHERE id = ${userId}`;

      if (userResult.length === 0) {
        errors.push('User not found');
        return { isValid: false, errors, warnings };
      }

      const user = userResult[0] as User;

      // Validate balances are non-negative
      if (user.green_balance < 0) {
        errors.push('Green balance is negative');
      }
      if (user.blue_balance < 0) {
        errors.push('Blue balance is negative');
      }
      if (user.red_balance < 0) {
        errors.push('Red balance is negative');
      }

      // Check if already migrated
      if (user.legacy_migration_completed) {
        warnings.push('User already migrated');
      }

      // Calculate expected Mana
      const calculatedMana = this.convertBalancesToMana(user);

      // Warn about large conversions
      if (calculatedMana > 100000) {
        warnings.push(`Large Mana conversion detected: ${calculatedMana}`);
      }

      // Warn about zero balance users
      if (calculatedMana === 0) {
        warnings.push('User has zero balance, will receive 0 Mana');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        userData: user,
        calculatedMana
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Validation error: ${errorMessage}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Batch migrate multiple users with progress tracking
   * @param userIds Array of user IDs to migrate
   * @param onProgress Optional progress callback
   * @returns Migration results summary
   */
  async batchMigrateUsers(
    userIds: string[], 
    onProgress?: (completed: number, total: number, currentUserId: string) => void
  ): Promise<{
    successful: string[];
    failed: { userId: string; error: string }[];
    skipped: string[];
    totalManaConverted: number;
  }> {
    const successful: string[] = [];
    const failed: { userId: string; error: string }[] = [];
    const skipped: string[] = [];
    let totalManaConverted = 0;

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      
      try {
        // Validate before migration
        const validation = await this.validateUserDataIntegrity(userId);
        
        if (!validation.isValid) {
          failed.push({ userId, error: validation.errors.join(', ') });
          continue;
        }

        if (validation.userData?.legacy_migration_completed) {
          skipped.push(userId);
          continue;
        }

        // Perform migration
        await this.migrateUserEconomy(userId);
        successful.push(userId);
        
        if (validation.calculatedMana) {
          totalManaConverted += validation.calculatedMana;
        }

      } catch (error) {
        const errorMessage = error instanceof MigrationError 
          ? error.message 
          : `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
        failed.push({ userId, error: errorMessage });
      }

      // Report progress
      if (onProgress) {
        onProgress(i + 1, userIds.length, userId);
      }
    }

    return {
      successful,
      failed,
      skipped,
      totalManaConverted
    };
  }

  /**
   * Get migration statistics for all users
   * @returns Migration statistics
   */
  async getMigrationStatistics(): Promise<{
    totalUsers: number;
    migratedUsers: number;
    pendingUsers: number;
    totalManaInSystem: number;
    averageManaPerUser: number;
  }> {
    // Get total user count
    const totalResult = await sql`SELECT COUNT(*) as count FROM users`;
    const totalUsers = parseInt(totalResult[0].count);

    // Get migrated user count and total mana
    const migratedResult = await sql`
      SELECT 
        COUNT(*) as migrated_count,
        COALESCE(SUM(mana_balance), 0) as total_mana
      FROM users 
      WHERE legacy_migration_completed = true
    `;
    
    const migratedUsers = parseInt(migratedResult[0].migrated_count);
    const totalManaInSystem = parseInt(migratedResult[0].total_mana);
    const pendingUsers = totalUsers - migratedUsers;
    const averageManaPerUser = migratedUsers > 0 ? totalManaInSystem / migratedUsers : 0;

    return {
      totalUsers,
      migratedUsers,
      pendingUsers,
      totalManaInSystem,
      averageManaPerUser
    };
  }
}

// Export singleton instance
export const currencyConverter = new CurrencyConverter();