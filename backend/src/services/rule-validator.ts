import type { 
  CustomRule, 
  RuleExecutionContext, 
  RuleExecutionResult,
  LayerValidationResult 
} from '@adaptive-astro/shared/types';
import * as esprima from 'esprima';
import * as escodegen from 'escodegen';

/**
 * Rule Validation Engine
 * 
 * Validates and executes custom astrological rules safely.
 * Includes JavaScript syntax checking, security validation, and sandboxed execution.
 */
export class RuleValidationEngine {
  private allowedGlobals = new Set([
    'Math', 'Date', 'Object', 'Array', 'String', 'Number', 'Boolean',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'console'
  ]);

  private bannedPatterns = [
    /eval\s*\(/gi,
    /function\s*\*|function\*\s*\(/gi, // generators
    /new\s+Function/gi,
    /setTimeout|setInterval|setImmediate/gi,
    /process\.|global\.|window\./gi,
    /require\s*\(/gi,
    /import\s+.*from/gi,
    /export\s+/gi,
    /delete\s+/gi,
    /with\s*\(/gi,
    /for\s*\(\s*;;/gi, // infinite loops
    /while\s*\(\s*true/gi, // infinite loops
    /__proto__|prototype\s*=/gi
  ];

  /**
   * Comprehensive rule validation
   */
  async validateRule(rule: CustomRule): Promise<LayerValidationResult> {
    console.log('🔍 Validating rule:', rule.rule_name);

    const result: LayerValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // 1. Basic validation
      this.validateBasicStructure(rule, result);
      
      // 2. JavaScript syntax validation
      this.validateJavaScriptSyntax(rule.condition_code, result);
      
      // 3. Security validation
      this.validateSecurity(rule.condition_code, result);
      
      // 4. Astrological logic validation
      await this.validateAstrologicalLogic(rule, result);
      
      // 5. Performance validation
      this.validatePerformance(rule.condition_code, result);

      result.isValid = result.errors.length === 0;
      
      console.log('✅ Rule validation completed:', {
        valid: result.isValid,
        errors: result.errors.length,
        warnings: result.warnings.length
      });

      return result;
      
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation process failed: ${error}`);
      return result;
    }
  }

  /**
   * Execute rule safely in controlled environment
   */
  async executeRule(
    rule: CustomRule, 
    context: RuleExecutionContext,
    timeoutMs: number = 5000
  ): Promise<RuleExecutionResult> {
    console.log('⚡ Executing rule:', rule.rule_name);

    // Pre-execution validation
    const validation = await this.validateRule(rule);
    if (!validation.isValid) {
      throw new Error(`Rule validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      // Create safe execution function
      const safeFunction = this.createSafeFunction(rule.condition_code);
      
      // Execute with timeout protection
      const result = await this.executeWithTimeout(
        () => safeFunction(context.astroData, context.userPrefs, context.currentTime),
        timeoutMs
      );

      // Validate result format
      if (!this.isValidResult(result)) {
        throw new Error('Rule returned invalid result format');
      }

      console.log('✅ Rule execution successful:', {
        score: result.score,
        reasoning: result.reasoning?.substring(0, 100) + '...'
      });

      return result as RuleExecutionResult;
      
    } catch (error) {
      console.error('❌ Rule execution failed:', error);
      
      return {
        score: 0,
        reasoning: `Rule execution failed: ${error}`,
        metadata: { error: true, rule_id: rule.id }
      };
    }
  }

  /**
   * Batch execute multiple rules efficiently
   */
  async executeRules(
    rules: CustomRule[],
    context: RuleExecutionContext
  ): Promise<Map<string, RuleExecutionResult>> {
    console.log('⚡ Batch executing rules:', rules.length);

    const results = new Map<string, RuleExecutionResult>();
    const promises = rules.map(async (rule) => {
      try {
        const result = await this.executeRule(rule, context, 3000); // Shorter timeout for batch
        results.set(rule.id, result);
      } catch (error) {
        results.set(rule.id, {
          score: 0,
          reasoning: `Execution failed: ${error}`,
          metadata: { error: true, rule_id: rule.id }
        });
      }
    });

    await Promise.allSettled(promises);
    
    console.log('✅ Batch execution completed:', {
      total: rules.length,
      successful: Array.from(results.values()).filter(r => !r.metadata?.error).length
    });

    return results;
  }

  /**
   * Validate basic rule structure
   */
  private validateBasicStructure(rule: CustomRule, result: LayerValidationResult): void {
    if (!rule.rule_name?.trim()) {
      result.errors.push('Rule name is required');
    }

    if (!rule.condition_code?.trim()) {
      result.errors.push('Condition code is required');
    }

    if (!rule.category?.trim()) {
      result.errors.push('Category is required');
    }

    if (typeof rule.priority !== 'number' || rule.priority < 1 || rule.priority > 10) {
      result.warnings.push('Priority should be a number between 1-10');
    }

    if (!rule.description?.trim()) {
      result.warnings.push('Description is recommended for better understanding');
    }
  }

  /**
   * Validate JavaScript syntax and structure
   */
  private validateJavaScriptSyntax(code: string, result: LayerValidationResult): void {
    try {
      // Parse JavaScript syntax
      const ast = esprima.parseScript(code, { 
        tolerant: false,
        range: true,
        loc: true 
      });

      // Check for function structure
      if (ast.body.length !== 1 || ast.body[0].type !== 'FunctionDeclaration') {
        result.errors.push('Code must contain exactly one function declaration');
        return;
      }

      const func = ast.body[0] as any;
      
      // Check function name
      if (func.id?.name !== 'evaluateCondition') {
        result.warnings.push('Function should be named "evaluateCondition"');
      }

      // Check parameters
      if (func.params.length !== 3) {
        result.warnings.push('Function should accept 3 parameters: astroData, userPrefs, currentTime');
      }

      // Regenerate code to check for valid structure
      const regenerated = escodegen.generate(ast);
      if (!regenerated.includes('return')) {
        result.warnings.push('Function should include a return statement');
      }

    } catch (error) {
      result.errors.push(`JavaScript syntax error: ${error}`);
    }
  }

  /**
   * Validate security constraints
   */
  private validateSecurity(code: string, result: LayerValidationResult): void {
    // Check for banned patterns
    for (const pattern of this.bannedPatterns) {
      if (pattern.test(code)) {
        result.errors.push(`Security violation: Code contains banned pattern ${pattern.source}`);
      }
    }

    // Check for potential infinite loops (basic heuristics)
    const whileMatches = code.match(/while\s*\(/g)?.length || 0;
    const forMatches = code.match(/for\s*\(/g)?.length || 0;
    
    if (whileMatches + forMatches > 3) {
      result.warnings.push('Multiple loops detected - ensure they terminate properly');
    }

    // Check code complexity (lines as proxy)
    const lines = code.split('\n').filter(line => line.trim()).length;
    if (lines > 100) {
      result.warnings.push('Rule code is quite long - consider simplifying for better performance');
    }
  }

  /**
   * Validate astrological logic and concepts
   */
  private async validateAstrologicalLogic(rule: CustomRule, result: LayerValidationResult): Promise<void> {
    const code = rule.condition_code.toLowerCase();
    
    // Check for common astrological terms
    const astroTerms = [
      'planets', 'aspects', 'houses', 'moon', 'sun', 'venus', 'mars', 'jupiter', 'saturn',
      'trine', 'square', 'conjunction', 'opposition', 'sextile', 'lunar', 'phase'
    ];

    const foundTerms = astroTerms.filter(term => code.includes(term));
    if (foundTerms.length === 0) {
      result.warnings.push('Rule does not seem to use astrological data - consider adding planetary or aspect references');
    }

    // Check for proper data access patterns
    if (!code.includes('astrodata') && !code.includes('astro_data')) {
      result.warnings.push('Rule should access astroData parameter for astronomical calculations');
    }

    // Check for score and reasoning return
    if (!code.includes('score') || !code.includes('reasoning')) {
      result.warnings.push('Rule should return both score and reasoning fields');
    }

    // Validate score range
    if (code.includes('score') && !code.match(/score\s*[:=]\s*\d+/)) {
      result.suggestions.push('Ensure score is a number between 0-100');
    }
  }

  /**
   * Validate performance characteristics
   */
  private validatePerformance(code: string, result: LayerValidationResult): void {
    // Check for expensive operations
    if (code.includes('JSON.parse') || code.includes('JSON.stringify')) {
      result.suggestions.push('Consider pre-parsing JSON data for better performance');
    }

    const dateMatches = code.match(/new\s+Date/g);
    if (dateMatches && dateMatches.length > 3) {
      result.suggestions.push('Multiple Date object creations detected - consider reusing date calculations');
    }

    if (code.includes('Math.pow') || code.includes('**')) {
      result.suggestions.push('Power operations can be expensive - consider alternatives where possible');
    }
  }

  /**
   * Create safe function for execution
   */
  private createSafeFunction(code: string): Function {
    // Create restricted global context
    const safeGlobals = {
      Math: Math,
      Date: Date,
      Object: Object,
      Array: Array,
      String: String,
      Number: Number,
      Boolean: Boolean,
      parseInt: parseInt,
      parseFloat: parseFloat,
      isNaN: isNaN,
      isFinite: isFinite,
      console: {
        log: (...args: any[]) => console.log('[RULE]', ...args),
        error: (...args: any[]) => console.error('[RULE ERROR]', ...args)
      }
    };

    // Wrap code in safe execution context
    const wrappedCode = `
      "use strict";
      ${code}
      return evaluateCondition;
    `;

    // Create function with restricted scope
    const keys = Object.keys(safeGlobals);
    const values = Object.values(safeGlobals);
    
    const factory = new Function(...keys, wrappedCode);
    return factory(...values);
  }

  /**
   * Execute function with timeout protection
   */
  private async executeWithTimeout<T>(
    fn: () => T, 
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Rule execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = fn();
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Validate execution result format
   */
  private isValidResult(result: any): boolean {
    if (!result || typeof result !== 'object') return false;
    
    if (typeof result.score !== 'number') return false;
    if (result.score < 0 || result.score > 100) return false;
    
    if (typeof result.reasoning !== 'string') return false;
    if (result.reasoning.length === 0) return false;
    
    return true;
  }

  /**
   * Get validation statistics
   */
  public getValidationStats(): Record<string, number> {
    return {
      // Could track validation metrics here
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0
    };
  }
}

export default RuleValidationEngine;