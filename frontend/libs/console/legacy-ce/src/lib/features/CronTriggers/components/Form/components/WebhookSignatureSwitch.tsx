import React from 'react';
import { IconTooltip } from '../../../../../new-components/Tooltip';
import { useFormContext } from 'react-hook-form';
import { Switch } from '../../../../../new-components/Switch';

export const WebhookSignatureSwitch = () => {
  const { watch, setValue } = useFormContext();
  const webhook_signature = watch('webhook_signature');
  const isEnabled = webhook_signature?.enabled ?? false;

  const setWebhookSignatureStatus = (value: boolean) => {
    setValue('webhook_signature', {
      enabled: value,
    });
  };

  return (
    <>
      <label className="block flex items-center text-gray-600 font-semibold mb-xs">
        Enable Webhook Signature
        <IconTooltip message="If enabled, webhook requests will include an HMAC-SHA256 signature in the X-Hasura-Signature header for verification. Requires HASURA_GRAPHQL_WEBHOOK_SECRET environment variable to be set." />
      </label>
      <div className="relative w-full max-w-xl mb-xs">
        <Switch
          checked={isEnabled}
          onCheckedChange={setWebhookSignatureStatus}
        />
      </div>
    </>
  );
};