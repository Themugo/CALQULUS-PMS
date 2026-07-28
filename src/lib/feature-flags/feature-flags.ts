/**
 * Feature Flag Management System
 *
 * Implements enterprise feature flags with:
 * - Gradual rollouts
 * - A/B testing support
 * - User targeting
 * - Percentage-based rollouts
 * - Time-based activation
 * - Audit logging
 */

// Feature flag types
export enum FeatureFlagType {
  BOOLEAN = 'boolean',
  ROLLOUT = 'rollout',
  AB_TEST = 'ab_test',
  MULTIVARIATE = 'multivariate',
}

// Feature flag status
export enum FeatureFlagStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
}

// Targeting rules
export interface TargetingRule {
  id: string;
  attribute: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number | boolean | string[] | number[];
}

// User segment
export interface UserSegment {
  id: string;
  name: string;
  description: string;
  rules: TargetingRule[];
  percentage?: number; // For percentage-based segments
}

// A/B test variant
export interface ABVariant {
  id: string;
  name: string;
  weight: number; // 0-100
  config: Record<string, unknown>;
}

// Feature flag definition
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  type: FeatureFlagType;
  status: FeatureFlagStatus;
  defaultValue: boolean | string | Record<string, unknown>;
  variants?: ABVariant[];
  targetSegments?: string[];
  rolloutPercentage?: number;
  rolloutStartDate?: Date;
  rolloutEndDate?: Date;
  environment: 'development' | 'staging' | 'production';
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

// Feature flag evaluation result
export interface FlagEvaluation {
  flagKey: string;
  value: boolean | string | Record<string, unknown>;
  reason: string;
  variantId?: string;
  matchedSegment?: string;
  isDefault: boolean;
}

// User context for targeting
export interface UserContext {
  userId: string;
  email?: string;
  role?: string;
  plan?: string;
  properties?: string[];
  region?: string;
  createdAt?: Date;
  attributes?: Record<string, string | number | boolean>;
}

// Feature flag manager
export class FeatureFlagManager {
  private flags: Map<string, FeatureFlag>;
  private segments: Map<string, UserSegment>;
  private evaluations: Map<string, FlagEvaluation>;

  constructor() {
    this.flags = new Map();
    this.segments = new Map();
    this.evaluations = new Map();
    this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags
   */
  private initializeDefaultFlags(): void {
    const defaultFlags: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'flag_1',
        key: 'new_dashboard',
        name: 'New Dashboard',
        description: 'Enable the new dashboard design',
        type: FeatureFlagType.BOOLEAN,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: false,
        environment: 'production',
      },
      {
        id: 'flag_2',
        key: 'water_billing',
        name: 'Water Billing',
        description: 'Enable water billing feature',
        type: FeatureFlagType.BOOLEAN,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: true,
        environment: 'production',
      },
      {
        id: 'flag_3',
        key: 'mpesa_express',
        name: 'M-Pesa Express',
        description: 'Enable M-Pesa Express payments',
        type: FeatureFlagType.BOOLEAN,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: true,
        environment: 'production',
      },
      {
        id: 'flag_4',
        key: 'dark_mode',
        name: 'Dark Mode',
        description: 'Enable dark mode theme',
        type: FeatureFlagType.ROLLOUT,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: false,
        rolloutPercentage: 50,
        environment: 'production',
      },
      {
        id: 'flag_5',
        key: 'payment_v2',
        name: 'Payment V2',
        description: 'New payment flow A/B test',
        type: FeatureFlagType.AB_TEST,
        status: FeatureFlagStatus.ACTIVE,
        defaultValue: 'control',
        variants: [
          { id: 'control', name: 'Control', weight: 50, config: {} },
          { id: 'variant_a', name: 'Variant A', weight: 50, config: { newFlow: true } },
        ],
        environment: 'production',
      },
    ];

    for (const flag of defaultFlags) {
      this.flags.set(flag.key, {
        ...flag,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Register a feature flag
   */
  registerFlag(flag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): FeatureFlag {
    const fullFlag: FeatureFlag = {
      ...flag,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.flags.set(flag.key, fullFlag);
    return fullFlag;
  }

  /**
   * Get a feature flag
   */
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get active feature flags
   */
  getActiveFlags(): FeatureFlag[] {
    return this.getAllFlags().filter(f => f.status === FeatureFlagStatus.ACTIVE);
  }

  /**
   * Evaluate a feature flag for a user
   */
  evaluate(flagKey: string, context: UserContext): FlagEvaluation {
    const flag = this.flags.get(flagKey);

    if (!flag) {
      return {
        flagKey,
        value: false,
        reason: 'Flag not found',
        isDefault: true,
      };
    }

    if (flag.status !== FeatureFlagStatus.ACTIVE) {
      return {
        flagKey,
        value: flag.defaultValue as boolean,
        reason: 'Flag is not active',
        isDefault: true,
      };
    }

    // Check rollout dates
    const now = new Date();
    if (flag.rolloutStartDate && now < flag.rolloutStartDate) {
      return {
        flagKey,
        value: flag.defaultValue as boolean,
        reason: 'Rollout has not started',
        isDefault: true,
      };
    }
    if (flag.rolloutEndDate && now > flag.rolloutEndDate) {
      return {
        flagKey,
        value: flag.defaultValue as boolean,
        reason: 'Rollout has ended',
        isDefault: true,
      };
    }

    // Check segment targeting
    if (flag.targetSegments?.length) {
      const matchedSegment = this.evaluateSegments(flag.targetSegments, context);
      if (!matchedSegment) {
        return {
          flagKey,
          value: flag.defaultValue as boolean,
          reason: 'User does not match target segments',
          isDefault: true,
        };
      }
    }

    // Evaluate based on flag type
    switch (flag.type) {
      case FeatureFlagType.BOOLEAN:
        return this.evaluateBooleanFlag(flag, context);
      case FeatureFlagType.ROLLOUT:
        return this.evaluateRolloutFlag(flag, context);
      case FeatureFlagType.AB_TEST:
        return this.evaluateABTestFlag(flag, context);
      default:
        return {
          flagKey,
          value: flag.defaultValue,
          reason: 'Unknown flag type',
          isDefault: true,
        };
    }
  }

  /**
   * Evaluate a boolean flag
   */
  private evaluateBooleanFlag(flag: FeatureFlag, _context: UserContext): FlagEvaluation {
    const value = flag.defaultValue as boolean;
    return {
      flagKey: flag.key,
      value,
      reason: 'Boolean flag evaluation',
      isDefault: false,
    };
  }

  /**
   * Evaluate a rollout flag with percentage
   */
  private evaluateRolloutFlag(flag: FeatureFlag, context: UserContext): FlagEvaluation {
    const percentage = flag.rolloutPercentage || 100;
    const hash = this.hashUserId(context.userId);
    const bucket = hash % 100;

    const isEnabled = bucket < percentage;
    return {
      flagKey: flag.key,
      value: isEnabled,
      reason: `Rollout: ${percentage}% bucket`,
      isDefault: false,
    };
  }

  /**
   * Evaluate an A/B test flag
   */
  private evaluateABTestFlag(flag: FeatureFlag, context: UserContext): FlagEvaluation {
    if (!flag.variants || flag.variants.length === 0) {
      return {
        flagKey: flag.key,
        value: flag.defaultValue as string,
        reason: 'No variants defined',
        isDefault: true,
      };
    }

    const hash = this.hashUserId(context.userId);
    const bucket = hash % 100;
    let cumulativeWeight = 0;

    for (const variant of flag.variants) {
      cumulativeWeight += variant.weight;
      if (bucket < cumulativeWeight) {
        return {
          flagKey: flag.key,
          value: variant.id,
          reason: `A/B Test: assigned to ${variant.name}`,
          variantId: variant.id,
          isDefault: false,
        };
      }
    }

    // Fallback to first variant
    return {
      flagKey: flag.key,
      value: flag.variants[0].id,
      reason: 'A/B Test: fallback to control',
      variantId: flag.variants[0].id,
      isDefault: false,
    };
  }

  /**
   * Evaluate user segments
   */
  private evaluateSegments(segmentIds: string[], context: UserContext): string | undefined {
    for (const segmentId of segmentIds) {
      const segment = this.segments.get(segmentId);
      if (segment && this.matchesSegment(segment, context)) {
        return segmentId;
      }
    }
    return undefined;
  }

  /**
   * Check if user matches segment rules
   */
  private matchesSegment(segment: UserSegment, context: UserContext): boolean {
    for (const rule of segment.rules) {
      if (!this.matchesRule(context, rule)) {
        return false;
      }
    }

    // Check percentage if defined
    if (segment.percentage !== undefined) {
      const hash = this.hashUserId(context.userId);
      const bucket = hash % 100;
      if (bucket >= segment.percentage) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if context matches a targeting rule
   */
  private matchesRule(context: UserContext, rule: TargetingRule): boolean {
    const value = this.getAttributeValue(context, rule.attribute);
    if (value === undefined) return false;

    switch (rule.operator) {
      case 'equals':
        return value === rule.value;
      case 'not_equals':
        return value !== rule.value;
      case 'contains':
        return typeof value === 'string' && value.includes(String(rule.value));
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value as string);
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(value as string);
      case 'gt':
        return typeof value === 'number' && value > Number(rule.value);
      case 'lt':
        return typeof value === 'number' && value < Number(rule.value);
      case 'gte':
        return typeof value === 'number' && value >= Number(rule.value);
      case 'lte':
        return typeof value === 'number' && value <= Number(rule.value);
      default:
        return false;
    }
  }

  /**
   * Get attribute value from context
   */
  private getAttributeValue(context: UserContext, attribute: string): unknown {
    switch (attribute) {
      case 'userId':
        return context.userId;
      case 'email':
        return context.email;
      case 'role':
        return context.role;
      case 'plan':
        return context.plan;
      case 'region':
        return context.region;
      default:
        return context.attributes?.[attribute];
    }
  }

  /**
   * Hash user ID for consistent bucketing
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Register a user segment
   */
  registerSegment(segment: UserSegment): void {
    this.segments.set(segment.id, segment);
  }

  /**
   * Get a user segment
   */
  getSegment(id: string): UserSegment | undefined {
    return this.segments.get(id);
  }

  /**
   * Evaluate all flags for a user
   */
  evaluateAll(context: UserContext): Map<string, FlagEvaluation> {
    const results = new Map<string, FlagEvaluation>();
    
    for (const flag of this.getActiveFlags()) {
      const evaluation = this.evaluate(flag.key, context);
      results.set(flag.key, evaluation);
      this.evaluations.set(`${context.userId}:${flag.key}`, evaluation);
    }
    
    return results;
  }

  /**
   * Get evaluation history for a user
   */
  getEvaluationHistory(userId: string): FlagEvaluation[] {
    const evaluations: FlagEvaluation[] = [];
    
    for (const [key, evaluation] of this.evaluations.entries()) {
      if (key.startsWith(`${userId}:`)) {
        evaluations.push(evaluation);
      }
    }
    
    return evaluations;
  }

  /**
   * Update flag status
   */
  updateFlagStatus(key: string, status: FeatureFlagStatus): FeatureFlag | undefined {
    const flag = this.flags.get(key);
    if (flag) {
      flag.status = status;
      flag.updatedAt = new Date();
      this.flags.set(key, flag);
      return flag;
    }
    return undefined;
  }

  /**
   * Update rollout percentage
   */
  updateRolloutPercentage(key: string, percentage: number): FeatureFlag | undefined {
    const flag = this.flags.get(key);
    if (flag && flag.type === FeatureFlagType.ROLLOUT) {
      flag.rolloutPercentage = Math.max(0, Math.min(100, percentage));
      flag.updatedAt = new Date();
      this.flags.set(key, flag);
      return flag;
    }
    return undefined;
  }
}

// Singleton instance
let featureFlagManager: FeatureFlagManager | null = null;

/**
 * Get the feature flag manager instance
 */
export function getFeatureFlagManager(): FeatureFlagManager {
  if (!featureFlagManager) {
    featureFlagManager = new FeatureFlagManager();
  }
  return featureFlagManager;
}

/**
 * Quick flag check
 */
export function isFeatureEnabled(
  flagKey: string,
  context: UserContext,
  defaultValue = false
): boolean {
  const manager = getFeatureFlagManager();
  const evaluation = manager.evaluate(flagKey, context);
  
  if (evaluation.isDefault) {
    return defaultValue;
  }
  
  return evaluation.value as boolean;
}

/**
 * Get flag value
 */
export function getFlagValue<T = boolean>(
  flagKey: string,
  context: UserContext,
  defaultValue: T
): T {
  const manager = getFeatureFlagManager();
  const evaluation = manager.evaluate(flagKey, context);
  
  if (evaluation.isDefault) {
    return defaultValue;
  }
  
  return evaluation.value as T;
}
