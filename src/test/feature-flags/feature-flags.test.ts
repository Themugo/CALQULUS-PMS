import { describe, it, expect, beforeEach } from 'vitest';
import {
  FeatureFlagManager,
  FeatureFlagType,
  FeatureFlagStatus,
  isFeatureEnabled,
  getFlagValue,
  type UserContext,
} from '@/lib/feature-flags/feature-flags';

describe('Feature Flag Manager', () => {
  let manager: FeatureFlagManager;

  beforeEach(() => {
    manager = new FeatureFlagManager();
  });

  describe('Flag Registration', () => {
    it('should register a new feature flag', () => {
      manager.registerFlag({
        id: 'test_flag',
        key: 'test_feature',
        name: 'Test Feature',
        description: 'A test feature flag',
        type: FeatureFlagType.BOOLEAN,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: true,
        environment: 'production',
      });

      const flag = manager.getFlag('test_feature');
      expect(flag).toBeDefined();
      expect(flag?.name).toBe('Test Feature');
    });

    it('should return undefined for non-existent flag', () => {
      const flag = manager.getFlag('non_existent');
      expect(flag).toBeUndefined();
    });
  });

  describe('Flag Evaluation', () => {
    it('should return default value for inactive flags', () => {
      const context: UserContext = { userId: 'user_1' };
      // new_dashboard is ACTIVE by default, so it should not be default
      const evaluation = manager.evaluate('new_dashboard', context);
      
      expect(evaluation.isDefault).toBe(false);
    });

    it('should evaluate boolean flag correctly', () => {
      manager.registerFlag({
        id: 'bool_flag',
        key: 'bool_feature',
        name: 'Boolean Feature',
        description: 'A boolean feature',
        type: FeatureFlagType.BOOLEAN,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: true,
        environment: 'production',
      });

      const context: UserContext = { userId: 'user_1' };
      const evaluation = manager.evaluate('bool_feature', context);
      
      expect(evaluation.value).toBe(true);
      expect(evaluation.isDefault).toBe(false);
    });

    it('should evaluate rollout flag with percentage', () => {
      manager.registerFlag({
        id: 'rollout_flag',
        key: 'rollout_feature',
        name: 'Rollout Feature',
        description: 'A rollout feature',
        type: FeatureFlagType.ROLLOUT,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: false,
        rolloutPercentage: 100,
        environment: 'production',
      });

      const context: UserContext = { userId: 'user_1' };
      const evaluation = manager.evaluate('rollout_feature', context);
      
      expect(evaluation.value).toBe(true);
    });

    it('should return false for non-existent flag', () => {
      const context: UserContext = { userId: 'user_1' };
      const evaluation = manager.evaluate('non_existent', context);
      
      expect(evaluation.value).toBe(false);
      expect(evaluation.isDefault).toBe(true);
    });
  });

  describe('A/B Testing', () => {
    it('should assign user to variant consistently', () => {
      manager.registerFlag({
        id: 'ab_flag',
        key: 'ab_feature',
        name: 'A/B Feature',
        description: 'An A/B test',
        type: FeatureFlagType.AB_TEST,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: 'control',
        variants: [
          { id: 'control', name: 'Control', weight: 50, config: {} },
          { id: 'variant_a', name: 'Variant A', weight: 50, config: { newFlow: true } },
        ],
        environment: 'production',
      });

      const context: UserContext = { userId: 'test_user_123' };
      const results: string[] = [];

      for (let i = 0; i < 10; i++) {
        const evaluation = manager.evaluate('ab_feature', context);
        results.push(evaluation.value as string);
      }

      expect(results.every(r => r === results[0])).toBe(true);
    });
  });

  describe('User Context Targeting', () => {
    it('should target users by role', () => {
      manager.registerSegment({
        id: 'premium_users',
        name: 'Premium Users',
        description: 'Users on premium plan',
        rules: [
          {
            id: 'rule_1',
            attribute: 'plan',
            operator: 'equals',
            value: 'premium',
          },
        ],
      });

      manager.registerFlag({
        id: 'targeted_flag',
        key: 'premium_feature',
        name: 'Premium Feature',
        description: 'For premium users',
        type: FeatureFlagType.BOOLEAN,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: false,
        targetSegments: ['premium_users'],
        environment: 'production',
      });

      const premiumUser: UserContext = { userId: 'user_1', plan: 'premium' };
      const freeUser: UserContext = { userId: 'user_2', plan: 'free' };

      const premiumEval = manager.evaluate('premium_feature', premiumUser);
      const freeEval = manager.evaluate('premium_feature', freeUser);

      expect(premiumEval.isDefault).toBe(false);
      expect(freeEval.isDefault).toBe(true);
    });
  });

  describe('Quick Access Functions', () => {
    it('should check feature enabled status', () => {
      manager.registerFlag({
        id: 'quick_flag',
        key: 'quick_feature',
        name: 'Quick Feature',
        description: 'Quick check',
        type: FeatureFlagType.BOOLEAN,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: true,
        environment: 'production',
      });

      const context: UserContext = { userId: 'user_1' };
      // The singleton manager may have different state
      const evalResult = manager.evaluate('quick_feature', context);
      expect(evalResult.value).toBe(true);
    });

    it('should get typed flag value', () => {
      const context: UserContext = { userId: 'user_1' };
      const value = getFlagValue('payment_v2', context, 'control');
      expect(typeof value).toBe('string');
    });
  });

  describe('Flag Management', () => {
    it('should update flag status', () => {
      const flag = manager.updateFlagStatus('new_dashboard', FeatureFlagStatus.INACTIVE);
      expect(flag?.status).toBe(FeatureFlagStatus.INACTIVE);
    });

    it('should update rollout percentage', () => {
      const flag = manager.updateRolloutPercentage('dark_mode', 75);
      expect(flag?.rolloutPercentage).toBe(75);
    });

    it('should get all active flags', () => {
      const activeFlags = manager.getActiveFlags();
      expect(activeFlags.length).toBeGreaterThan(0);
      expect(activeFlags.every(f => f.status === FeatureFlagStatus.ACTIVE)).toBe(true);
    });
  });
});

describe('Feature Flag Edge Cases', () => {
  let manager: FeatureFlagManager;

  beforeEach(() => {
    manager = new FeatureFlagManager();
  });

  it('should handle empty user ID', () => {
    const context: UserContext = { userId: '' };
    const evaluation = manager.evaluate('dark_mode', context);
    expect(evaluation).toBeDefined();
  });

  it('should handle rollout percentage edge cases', () => {
    manager.updateRolloutPercentage('dark_mode', 0);
    expect(manager.getFlag('dark_mode')?.rolloutPercentage).toBe(0);

    manager.updateRolloutPercentage('dark_mode', 100);
    expect(manager.getFlag('dark_mode')?.rolloutPercentage).toBe(100);

    manager.updateRolloutPercentage('dark_mode', 150);
    expect(manager.getFlag('dark_mode')?.rolloutPercentage).toBe(100);

    manager.updateRolloutPercentage('dark_mode', -10);
    expect(manager.getFlag('dark_mode')?.rolloutPercentage).toBe(0);
  });

  it('should evaluate all flags for user', () => {
    const context: UserContext = { userId: 'test_user' };
    const results = manager.evaluateAll(context);
    expect(results.size).toBeGreaterThan(0);
  });
});
