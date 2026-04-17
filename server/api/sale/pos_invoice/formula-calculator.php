<?php
/**
 * Generic Formula Calculator for Tax Regimes
 * Evaluates formula_template with dynamic variables
 */

function calculateTaxFromFormula($formulaTemplate, $basePrice, $ratePercentage) {
    if (!$formulaTemplate || $formulaTemplate === '0') {
        return 0;
    }
    
    // Replace tokens with actual values
    $formula = $formulaTemplate;
    $formula = str_replace('{trade_price}', $basePrice, $formula);
    $formula = str_replace('{mrp}', $basePrice, $formula);
    $formula = str_replace('{rate}', $ratePercentage, $formula);
    
    // Evaluate the formula safely
    return evaluateFormula($formula);
}

function evaluateFormula($formula) {
    // Remove whitespace
    $formula = str_replace(' ', '', $formula);
    
    // Validate formula contains only allowed characters
    if (!preg_match('/^[0-9+\-*\/().]+$/', $formula)) {
        return 0;
    }
    
    try {
        // Use eval with strict validation
        $result = @eval('return ' . $formula . ';');
        return is_numeric($result) ? floatval($result) : 0;
    } catch (Exception $e) {
        return 0;
    }
}
?>
