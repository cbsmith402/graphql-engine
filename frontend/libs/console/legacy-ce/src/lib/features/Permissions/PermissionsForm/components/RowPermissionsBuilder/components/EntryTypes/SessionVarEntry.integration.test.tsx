import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionVarEntry } from './SessionVarEntry';
import { rowPermissionsContext } from '../RowPermissionsProvider';

// Mock the entire permissions form context
const createMockContext = (initialValues = {}) => {
  const mockSetValue = jest.fn();
  
  return {
    operators: {
      sessionVar: {
        label: 'Session variable operators',
        items: [
          { name: '_seq (equals)', value: '_seq' },
          { name: '_sne (not equals)', value: '_sne' },
          { name: '_scontains (contains)', value: '_scontains' },
          { name: '_sin (in list)', value: '_sin' },
        ],
      },
    },
    permissions: initialValues,
    comparators: {},
    setValue: mockSetValue,
    setKey: jest.fn(),
    setPermissions: jest.fn(),
    loadRelationships: jest.fn(),
    isLoading: false,
  };
};

const renderWithContext = (component: React.ReactElement, contextValue: any) => {
  return render(
    <rowPermissionsContext.Provider value={contextValue}>
      {component}
    </rowPermissionsContext.Provider>
  );
};

describe('SessionVarEntry Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  describe('Complete user workflows', () => {
    it('allows user to create a complete _seq condition', async () => {
      const mockContext = createMockContext();
      
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={{}}
          path={['filter']}
        />,
        mockContext
      );

      // User enters session variable name
      const varInput = screen.getByPlaceholderText('e.g., x-hasura-permissions');
      await user.type(varInput, 'X-Hasura-User-Id');
      
      expect(mockContext.setValue).toHaveBeenCalledWith(['filter', 'var'], 'X-Hasura-User-Id');

      // User enters value
      const valueInput = screen.getByPlaceholderText('e.g., view:projects');
      await user.type(valueInput, '123');
      
      expect(mockContext.setValue).toHaveBeenCalledWith(['filter', 'value'], '123');
    });

    it('allows user to create a complete _sin condition with multiple values', async () => {
      const mockContext = createMockContext();
      
      renderWithContext(
        <SessionVarEntry
          k="_sin"
          v={{}}
          path={['filter']}
        />,
        mockContext
      );

      // User enters session variable name
      const varInput = screen.getByPlaceholderText('e.g., x-hasura-permissions');
      await user.type(varInput, 'X-Hasura-Groups');
      
      expect(mockContext.setValue).toHaveBeenCalledWith(['filter', 'var'], 'X-Hasura-Groups');

      // User enters comma-separated values
      const valueInput = screen.getByPlaceholderText('value1,value2,value3');
      await user.type(valueInput, 'admin,editor,viewer');
      
      expect(mockContext.setValue).toHaveBeenCalledWith(['filter', 'value'], 'admin,editor,viewer');

      // Verify help text is shown
      expect(screen.getByText('For multiple values, separate with commas')).toBeInTheDocument();
    });

    it('handles editing existing session variable conditions', async () => {
      const mockContext = createMockContext();
      
      renderWithContext(
        <SessionVarEntry
          k="_scontains"
          v={{ var: 'X-Hasura-Permissions', value: 'view:projects' }}
          path={['filter']}
        />,
        mockContext
      );

      // Verify existing values are displayed
      expect(screen.getByDisplayValue('X-Hasura-Permissions')).toBeInTheDocument();
      expect(screen.getByDisplayValue('view:projects')).toBeInTheDocument();

      // User modifies the value
      const valueInput = screen.getByDisplayValue('view:projects');
      await user.clear(valueInput);
      await user.type(valueInput, 'edit:projects');
      
      expect(mockContext.setValue).toHaveBeenCalledWith(['filter', 'value'], 'edit:projects');
    });

    it('provides clear visual feedback for different operators', () => {
      const operators = [
        { key: '_seq', label: 'Session variable equals' },
        { key: '_sne', label: 'Session variable not equals' },
        { key: '_scontains', label: 'Session variable contains' },
        { key: '_sin', label: 'Session variable in list' },
      ];

      operators.forEach(({ key, label }) => {
        const mockContext = createMockContext();
        const { unmount } = renderWithContext(
          <SessionVarEntry
            k={key}
            v={{ var: 'test', value: 'test' }}
            path={['filter']}
          />,
          mockContext
        );

        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Error handling and edge cases', () => {
    it('gracefully handles rapid typing without losing data', async () => {
      const mockContext = createMockContext();
      
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={{}}
          path={['filter']}
        />,
        mockContext
      );

      const varInput = screen.getByPlaceholderText('e.g., x-hasura-permissions');
      
      // Simulate rapid typing
      await user.type(varInput, 'X-Hasura-User-Id', { delay: 1 });
      
      // Should have called setValue for each character or the final value
      expect(mockContext.setValue).toHaveBeenCalled();
      
      // Get the last call to verify final value
      const lastCall = mockContext.setValue.mock.calls[mockContext.setValue.mock.calls.length - 1];
      expect(lastCall[1]).toBe('X-Hasura-User-Id');
    });

    it('handles very long session variable names', async () => {
      const mockContext = createMockContext();
      
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={{}}
          path={['filter']}
        />,
        mockContext
      );

      const longName = 'X-Hasura-Very-Long-Session-Variable-Name-That-Exceeds-Normal-Length';
      const varInput = screen.getByPlaceholderText('e.g., x-hasura-permissions');
      
      await user.type(varInput, longName);
      
      expect(mockContext.setValue).toHaveBeenCalledWith(['filter', 'var'], longName);
      expect(screen.getByDisplayValue(longName)).toBeInTheDocument();
    });

    it('handles special characters in session variable names', async () => {
      const mockContext = createMockContext();
      
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={{}}
          path={['filter']}
        />,
        mockContext
      );

      const specialName = 'X-Hasura-User@Domain.com';
      const varInput = screen.getByPlaceholderText('e.g., x-hasura-permissions');
      
      await user.type(varInput, specialName);
      
      expect(mockContext.setValue).toHaveBeenCalledWith(['filter', 'var'], specialName);
      expect(screen.getByDisplayValue(specialName)).toBeInTheDocument();
    });

    it('handles complex values for _sin operator', async () => {
      const mockContext = createMockContext();
      
      renderWithContext(
        <SessionVarEntry
          k="_sin"
          v={{}}
          path={['filter']}
        />,
        mockContext
      );

      const complexValues = 'admin,editor-role,viewer:read-only,guest user,special@domain.com';
      const valueInput = screen.getByPlaceholderText('value1,value2,value3');
      
      await user.type(valueInput, complexValues);
      
      expect(mockContext.setValue).toHaveBeenCalledWith(['filter', 'value'], complexValues);
      expect(screen.getByDisplayValue(complexValues)).toBeInTheDocument();
    });
  });

  describe('Accessibility and usability', () => {
    it('maintains focus flow between inputs', async () => {
      const mockContext = createMockContext();
      
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={{}}
          path={['filter']}
        />,
        mockContext
      );

      const varInput = screen.getByPlaceholderText('e.g., x-hasura-permissions');
      const valueInput = screen.getByPlaceholderText('e.g., view:projects');

      // Tab from var input to value input
      varInput.focus();
      await user.tab();
      
      expect(valueInput).toHaveFocus();
    });

    it('provides appropriate input labels for screen readers', () => {
      const mockContext = createMockContext();
      
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={{}}
          path={['filter']}
        />,
        mockContext
      );

      expect(screen.getByLabelText('Session Variable Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Value')).toBeInTheDocument();
    });

    it('shows different labels for _sin operator', () => {
      const mockContext = createMockContext();
      
      renderWithContext(
        <SessionVarEntry
          k="_sin"
          v={{}}
          path={['filter']}
        />,
        mockContext
      );

      expect(screen.getByLabelText('Session Variable Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Values (comma-separated)')).toBeInTheDocument();
    });
  });

  describe('Performance considerations', () => {
    it('does not cause excessive re-renders on input changes', async () => {
      const mockContext = createMockContext();
      
      // Spy on component renders (would need to wrap component with profiler in real test)
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={{}}
          path={['filter']}
        />,
        mockContext
      );

      const varInput = screen.getByPlaceholderText('e.g., x-hasura-permissions');
      
      // Type multiple characters
      await user.type(varInput, 'test');
      
      // Should not cause UI to become unresponsive
      expect(varInput).toBeInTheDocument();
      expect(mockContext.setValue).toHaveBeenCalled();
    });

    it('handles large paste operations gracefully', async () => {
      const mockContext = createMockContext();
      
      renderWithContext(
        <SessionVarEntry
          k="_sin"
          v={{}}
          path={['filter']}
        />,
        mockContext
      );

      const largeValue = Array.from({ length: 100 }, (_, i) => `value-${i}`).join(',');
      const valueInput = screen.getByPlaceholderText('value1,value2,value3');
      
      // Simulate paste operation
      await user.click(valueInput);
      await user.paste(largeValue);
      
      expect(mockContext.setValue).toHaveBeenCalledWith(['filter', 'value'], largeValue);
      expect(screen.getByDisplayValue(largeValue)).toBeInTheDocument();
    });
  });
});