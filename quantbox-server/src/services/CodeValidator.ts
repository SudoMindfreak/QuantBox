/**
 * CodeValidator Service
 * Validates AI-generated strategy code for common errors and anti-patterns
 */

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validates Python strategy code for common mistakes
 * Uses pattern matching (not AST parsing) for flexibility
 */
export function validateStrategyCode(code: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // ==========================================
    // ERRORS (Must fix - blocks execution)
    // ==========================================

    // 1. Required import
    if (!code.includes('from quantbox import QuantBoxStrategy')) {
        errors.push('Missing required import: from quantbox import QuantBoxStrategy');
    }

    // 2. Required class definition
    if (!code.match(/class\s+MyStrategy\s*\(\s*QuantBoxStrategy\s*\)/)) {
        errors.push('Missing MyStrategy class that extends QuantBoxStrategy');
    }

    // 3. Required on_tick method
    if (!code.match(/async\s+def\s+on_tick\s*\(\s*self\s*\)/)) {
        errors.push('Missing async on_tick(self) method');
    }

    // 4. Dangerous operations (file I/O, network, subprocess)
    const dangerousPatterns = [
        { pattern: /import\s+(os|sys|subprocess|socket|requests|urllib)/, msg: 'Dangerous import detected (os, sys, subprocess, socket, requests, urllib)' },
        { pattern: /open\s*\(/, msg: 'File I/O operations (open) are not allowed' },
        { pattern: /exec\s*\(|eval\s*\(/, msg: 'Dynamic code execution (exec/eval) is not allowed' },
        { pattern: /__import__/, msg: 'Dynamic imports (__import__) are not allowed' }
    ];

    for (const { pattern, msg } of dangerousPatterns) {
        if (pattern.test(code)) {
            errors.push(msg);
        }
    }

    // 5. Hardcoded token IDs (20+ digit numbers)
    const hardcodedTokenId = code.match(/\b\d{20,}\b/);
    if (hardcodedTokenId) {
        errors.push(`Hardcoded token ID detected (${hardcodedTokenId[0]}). Use self.bull_id or self.bear_id instead.`);
    }

    // ==========================================
    // WARNINGS (Should fix - allows execution)
    // ==========================================

    // 1. Unsafe dictionary access
    if (code.match(/self\.latest_prices\s*\[\s*[^\]]+\s*\]/) && !code.includes('.get(')) {
        warnings.push('Use .get() to safely access self.latest_prices to prevent KeyError');
    }

    // 2. Missing safety checks
    const safetyChecks = [
        { check: /if\s+not\s+self\.bull_id/, msg: 'Consider checking if self.bull_id exists before using it' },
        { check: /if\s+not\s+self\.strike_price/, msg: 'Consider checking if self.strike_price exists before using it' },
        { check: /\.get\s*\(\s*self\.bull_id\s*\)/, msg: 'Good! Using .get() for safe dictionary access' }
    ];

    let hasTokenIdCheck = false;
    let hasStrikePriceCheck = false;
    let hasSafeAccess = false;

    for (const { check } of safetyChecks) {
        if (check.test(code)) {
            if (check.source.includes('bull_id')) hasTokenIdCheck = true;
            if (check.source.includes('strike_price')) hasStrikePriceCheck = true;
            if (check.source.includes('.get')) hasSafeAccess = true;
        }
    }

    if (!hasTokenIdCheck) {
        warnings.push('Recommended: Add check for self.bull_id existence (if not self.bull_id: return)');
    }

    if (!hasStrikePriceCheck) {
        warnings.push('Recommended: Add check for self.strike_price existence (if not self.strike_price: return)');
    }

    if (!hasSafeAccess && code.includes('latest_prices')) {
        warnings.push('Recommended: Use .get() for safe access to self.latest_prices dictionary');
    }

    // 3. Missing inventory checks before selling
    if (code.includes('await self.sell') && !code.match(/if\s+self\.inventory/)) {
        warnings.push('Consider checking inventory before selling (if self.inventory[asset_id] > 0)');
    }

    // 4. Missing balance checks for position sizing
    if (code.includes('await self.buy') && code.match(/self\.balance\s*\*|self\.balance\s*\//) && !code.includes('if')) {
        warnings.push('Consider adding balance validation when using position sizing');
    }

    // 5. Infinite loops or recursion
    if (code.match(/while\s+True/) || code.match(/for\s+\w+\s+in\s+range\s*\(\s*\d{4,}/)) {
        warnings.push('Avoid infinite loops or long-running loops in on_tick() - it is called frequently');
    }

    // 6. No exit conditions
    const hasBuyLogic = code.includes('await self.buy');
    const hasSellLogic = code.includes('await self.sell');

    if (hasBuyLogic && !hasSellLogic) {
        warnings.push('Consider adding exit logic (sell conditions) to close positions');
    }

    // 7. Unusual imports
    const allowedImports = ['from quantbox import QuantBoxStrategy'];
    const importLines = code.match(/^\s*(import|from)\s+.+$/gm) || [];

    for (const importLine of importLines) {
        if (!allowedImports.some(allowed => importLine.includes(allowed))) {
            warnings.push(`Unusual import detected: ${importLine.trim()}. The framework provides everything you need.`);
        }
    }

    // ==========================================
    // RETURN VALIDATION RESULT
    // ==========================================

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Formats validation results as a human-readable message
 */
export function formatValidationResults(result: ValidationResult): string {
    if (result.valid && result.warnings.length === 0) {
        return '✅ Code validation passed with no issues!';
    }

    let message = '';

    if (result.errors.length > 0) {
        message += '❌ **ERRORS** (Must fix):\n';
        result.errors.forEach((err, i) => {
            message += `  ${i + 1}. ${err}\n`;
        });
        message += '\n';
    }

    if (result.warnings.length > 0) {
        message += '⚠️ **WARNINGS** (Recommended fixes):\n';
        result.warnings.forEach((warn, i) => {
            message += `  ${i + 1}. ${warn}\n`;
        });
    }

    return message.trim();
}
