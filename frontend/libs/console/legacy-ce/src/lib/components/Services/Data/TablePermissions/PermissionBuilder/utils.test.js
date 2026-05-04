import {
  sessionVarOperatorsInfo,
  sessionVarOperators,
  isSessionVarOperator,
  allOperators,
  boolOperators,
  existOperators,
} from './utils';

describe('PermissionBuilder Utils - Session Variables', () => {
  describe('sessionVarOperatorsInfo', () => {
    it('defines all session variable operators with correct structure', () => {
      expect(sessionVarOperatorsInfo).toEqual({
        _seq: {
          type: 'sessionVar',
          inputStructure: 'object',
        },
        _sne: {
          type: 'sessionVar',
          inputStructure: 'object',
        },
        _scontains: {
          type: 'sessionVar',
          inputStructure: 'object',
        },
        _sin: {
          type: 'sessionVar',
          inputStructure: 'object',
        },
      });
    });

    it('has consistent structure with other operator info objects', () => {
      Object.values(sessionVarOperatorsInfo).forEach(operatorInfo => {
        expect(operatorInfo).toHaveProperty('type');
        expect(operatorInfo).toHaveProperty('inputStructure');
        expect(operatorInfo.type).toBe('sessionVar');
        expect(operatorInfo.inputStructure).toBe('object');
      });
    });
  });

  describe('sessionVarOperators', () => {
    it('exports all session variable operator names', () => {
      expect(sessionVarOperators).toEqual(['_seq', '_sne', '_scontains', '_sin']);
    });

    it('matches keys from sessionVarOperatorsInfo', () => {
      const infoKeys = Object.keys(sessionVarOperatorsInfo);
      expect(sessionVarOperators.sort()).toEqual(infoKeys.sort());
    });
  });

  describe('isSessionVarOperator', () => {
    it('returns true for valid session variable operators', () => {
      expect(isSessionVarOperator('_seq')).toBe(true);
      expect(isSessionVarOperator('_sne')).toBe(true);
      expect(isSessionVarOperator('_scontains')).toBe(true);
      expect(isSessionVarOperator('_sin')).toBe(true);
    });

    it('returns false for non-session variable operators', () => {
      expect(isSessionVarOperator('_eq')).toBe(false);
      expect(isSessionVarOperator('_and')).toBe(false);
      expect(isSessionVarOperator('_exists')).toBe(false);
      expect(isSessionVarOperator('_unknown')).toBe(false);
      expect(isSessionVarOperator('')).toBe(false);
      expect(isSessionVarOperator(null)).toBe(false);
      expect(isSessionVarOperator(undefined)).toBe(false);
    });
  });

  describe('allOperators integration', () => {
    it('includes session variable operators in allOperators', () => {
      sessionVarOperators.forEach(op => {
        expect(allOperators).toContain(op);
      });
    });

    it('maintains distinct operator lists', () => {
      // No overlap between different operator types
      sessionVarOperators.forEach(sessionOp => {
        expect(boolOperators).not.toContain(sessionOp);
        expect(existOperators).not.toContain(sessionOp);
      });
    });

    it('allOperators contains all operator types', () => {
      const expectedLength = 
        boolOperators.length + 
        sessionVarOperators.length + 
        existOperators.length +
        Object.keys(require('./utils').columnOperatorsInfo).length;
      
      expect(allOperators.length).toBe(expectedLength);
    });
  });

  describe('Operator naming conventions', () => {
    it('follows _s* naming pattern for session variable operators', () => {
      sessionVarOperators.forEach(op => {
        expect(op).toMatch(/^_s\w+$/);
      });
    });

    it('has unique operator names', () => {
      const uniqueOperators = new Set(sessionVarOperators);
      expect(uniqueOperators.size).toBe(sessionVarOperators.length);
    });
  });

  describe('TypeScript compatibility', () => {
    it('operators can be used as object keys', () => {
      const testObj = {};
      sessionVarOperators.forEach(op => {
        testObj[op] = true;
      });
      
      expect(Object.keys(testObj)).toEqual(sessionVarOperators);
    });

    it('operator info can be accessed dynamically', () => {
      sessionVarOperators.forEach(op => {
        const info = sessionVarOperatorsInfo[op];
        expect(info).toBeDefined();
        expect(info.type).toBe('sessionVar');
      });
    });
  });

  describe('Integration with existing operator functions', () => {
    it('isSessionVarOperator is consistent with other operator type functions', () => {
      const { isBoolOperator, isExistOperator, isColumnOperator } = require('./utils');
      
      // Session var operators should not be identified as other types
      sessionVarOperators.forEach(op => {
        expect(isBoolOperator(op)).toBe(false);
        expect(isExistOperator(op)).toBe(false);
        expect(isColumnOperator(op)).toBe(false);
        expect(isSessionVarOperator(op)).toBe(true);
      });
    });

    it('other operators should not be identified as session var operators', () => {
      const { isBoolOperator, isExistOperator } = require('./utils');
      
      boolOperators.forEach(op => {
        if (isBoolOperator(op)) {
          expect(isSessionVarOperator(op)).toBe(false);
        }
      });

      existOperators.forEach(op => {
        if (isExistOperator(op)) {
          expect(isSessionVarOperator(op)).toBe(false);
        }
      });
    });
  });
});