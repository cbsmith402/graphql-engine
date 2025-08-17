import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionVarEntry } from './SessionVarEntry';
import { rowPermissionsContext } from '../RowPermissionsProvider';

// Mock the context
const mockSetValue = jest.fn();
const mockContextValue = {
  operators: {},
  permissions: {},
  comparators: {},
  setValue: mockSetValue,
  setKey: jest.fn(),
  setPermissions: jest.fn(),
  loadRelationships: jest.fn(),
  isLoading: false,
};

const renderWithContext = (component: React.ReactElement) => {
  return render(
    <rowPermissionsContext.Provider value={mockContextValue}>
      {component}
    </rowPermissionsContext.Provider>
  );
};

describe('SessionVarEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('_seq operator', () => {
    it('renders input fields for session variable and value', () => {
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={{ var: 'X-Hasura-User-Id', value: '123' }}
          path={['test']}
        />
      );

      expect(screen.getByDisplayValue('X-Hasura-User-Id')).toBeInTheDocument();
      expect(screen.getByDisplayValue('123')).toBeInTheDocument();
      expect(screen.getByText('Session variable equals')).toBeInTheDocument();
    });

    it('handles empty values gracefully', () => {
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={{}}
          path={['test']}
        />
      );

      expect(screen.getByPlaceholderText('e.g., x-hasura-permissions')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g., view:projects')).toBeInTheDocument();
    });

    it('calls setValue when session variable name changes', () => {
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={{ var: '', value: '' }}
          path={['test']}
        />
      );

      const varInput = screen.getByPlaceholderText('e.g., x-hasura-permissions');
      fireEvent.change(varInput, { target: { value: 'X-Hasura-User-Id' } });

      expect(mockSetValue).toHaveBeenCalledWith(['test', 'var'], 'X-Hasura-User-Id');
    });

    it('calls setValue when value changes', () => {
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={{ var: '', value: '' }}
          path={['test']}
        />
      );

      const valueInput = screen.getByPlaceholderText('e.g., view:projects');
      fireEvent.change(valueInput, { target: { value: '123' } });

      expect(mockSetValue).toHaveBeenCalledWith(['test', 'value'], '123');
    });
  });

  describe('_sne operator', () => {
    it('renders with correct label', () => {
      renderWithContext(
        <SessionVarEntry
          k="_sne"
          v={{ var: 'X-Hasura-Role', value: 'admin' }}
          path={['test']}
        />
      );

      expect(screen.getByText('Session variable not equals')).toBeInTheDocument();
    });
  });

  describe('_scontains operator', () => {
    it('renders with correct label', () => {
      renderWithContext(
        <SessionVarEntry
          k="_scontains"
          v={{ var: 'X-Hasura-Permissions', value: 'view:projects' }}
          path={['test']}
        />
      );

      expect(screen.getByText('Session variable contains')).toBeInTheDocument();
    });
  });

  describe('_sin operator', () => {
    it('renders with correct label and placeholder', () => {
      renderWithContext(
        <SessionVarEntry
          k="_sin"
          v={{ var: 'X-Hasura-Groups', value: 'admin,editor' }}
          path={['test']}
        />
      );

      expect(screen.getByText('Session variable in list')).toBeInTheDocument();
      expect(screen.getByText('Values (comma-separated)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('value1,value2,value3')).toBeInTheDocument();
      expect(screen.getByText('For multiple values, separate with commas')).toBeInTheDocument();
    });

    it('handles comma-separated values', () => {
      renderWithContext(
        <SessionVarEntry
          k="_sin"
          v={{ var: 'X-Hasura-Groups', value: 'admin,editor,viewer' }}
          path={['test']}
        />
      );

      expect(screen.getByDisplayValue('admin,editor,viewer')).toBeInTheDocument();
    });
  });

  describe('Unknown operator', () => {
    it('falls back to operator name when label not found', () => {
      renderWithContext(
        <SessionVarEntry
          k="_sunknown"
          v={{ var: 'X-Hasura-Test', value: 'test' }}
          path={['test']}
        />
      );

      expect(screen.getByText('Session variable _sunknown')).toBeInTheDocument();
    });
  });

  describe('Null/undefined values', () => {
    it('handles null value object', () => {
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={null}
          path={['test']}
        />
      );

      // Should render empty inputs without crashing
      expect(screen.getByPlaceholderText('e.g., x-hasura-permissions')).toBeInTheDocument();
    });

    it('handles undefined value object', () => {
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={undefined}
          path={['test']}
        />
      );

      // Should render empty inputs without crashing
      expect(screen.getByPlaceholderText('e.g., x-hasura-permissions')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for inputs', () => {
      renderWithContext(
        <SessionVarEntry
          k="_seq"
          v={{ var: '', value: '' }}
          path={['test']}
        />
      );

      expect(screen.getByLabelText('Session Variable Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Value')).toBeInTheDocument();
    });

    it('has proper labels for _sin operator', () => {
      renderWithContext(
        <SessionVarEntry
          k="_sin"
          v={{ var: '', value: '' }}
          path={['test']}
        />
      );

      expect(screen.getByLabelText('Session Variable Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Values (comma-separated)')).toBeInTheDocument();
    });
  });
});