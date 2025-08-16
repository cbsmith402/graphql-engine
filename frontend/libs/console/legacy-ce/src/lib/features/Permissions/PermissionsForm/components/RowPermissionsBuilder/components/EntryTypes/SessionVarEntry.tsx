import { useContext } from 'react';
import { rowPermissionsContext } from '../RowPermissionsProvider';

export function SessionVarEntry({
  k,
  v,
  path,
}: {
  k: string;
  v: any;
  path: string[];
}) {
  const { setValue } = useContext(rowPermissionsContext);

  // Initialize default structure if needed
  const sessionVarValue = v || { var: '', value: '' };

  const handleVarChange = (newVar: string) => {
    setValue([...path, 'var'], newVar);
  };

  const handleValueChange = (newValue: string) => {
    setValue([...path, 'value'], newValue);
  };

  const operatorLabels: Record<string, string> = {
    '_seq': 'equals',
    '_sne': 'not equals', 
    '_scontains': 'contains',
    '_sin': 'in list'
  };

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600">
        Session variable {operatorLabels[k] || k}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Session Variable Name
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            placeholder="e.g., x-hasura-permissions"
            value={sessionVarValue.var || ''}
            onChange={e => handleVarChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {k === '_sin' ? 'Values (comma-separated)' : 'Value'}
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            placeholder={k === '_sin' ? 'value1,value2,value3' : 'e.g., view:projects'}
            value={sessionVarValue.value || ''}
            onChange={e => handleValueChange(e.target.value)}
          />
          {k === '_sin' && (
            <div className="text-xs text-gray-500 mt-1">
              For multiple values, separate with commas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}