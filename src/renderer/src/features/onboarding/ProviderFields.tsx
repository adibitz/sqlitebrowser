import { PROVIDER_KINDS, type ProviderKind } from '@shared/ai/providers'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PROVIDER_LABELS, withKind, type AiDraft, type AiDraftErrors } from './aiSetup'

interface ProviderFieldsProps {
  draft: AiDraft
  errors: AiDraftErrors
  canEncryptKeys: boolean
  onChange: (draft: AiDraft) => void
}

const providerItems = PROVIDER_KINDS.map((kind) => ({ value: kind, label: PROVIDER_LABELS[kind] }))

export function ProviderFields({ draft, errors, canEncryptKeys, onChange }: ProviderFieldsProps) {
  const isLocalCapable = draft.kind === 'openai_compatible'

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="ai-provider">Provider</FieldLabel>
        <Select
          items={providerItems}
          value={draft.kind}
          onValueChange={(kind) => onChange(withKind(draft, kind as ProviderKind))}
        >
          <SelectTrigger id="ai-provider" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {providerItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {isLocalCapable && (
        <Field data-invalid={!!errors.baseUrl}>
          <FieldLabel htmlFor="ai-base-url">Server address</FieldLabel>
          <Input
            id="ai-base-url"
            placeholder="e.g. http://localhost:11434/v1"
            value={draft.baseUrl}
            aria-invalid={!!errors.baseUrl}
            aria-describedby={errors.baseUrl ? 'ai-base-url-error' : undefined}
            onChange={(e) => onChange({ ...draft, baseUrl: e.target.value })}
          />
          <FieldError id="ai-base-url-error">{errors.baseUrl}</FieldError>
        </Field>
      )}

      <Field data-invalid={!!errors.apiKey}>
        <FieldLabel htmlFor="ai-api-key">{isLocalCapable ? 'API key (optional)' : 'API key'}</FieldLabel>
        <Input
          id="ai-api-key"
          type="password"
          autoComplete="off"
          value={draft.apiKey}
          aria-invalid={!!errors.apiKey}
          aria-describedby="ai-api-key-help"
          onChange={(e) => onChange({ ...draft, apiKey: e.target.value })}
        />
        {errors.apiKey ? (
          <FieldError id="ai-api-key-help">{errors.apiKey}</FieldError>
        ) : (
          <FieldDescription id="ai-api-key-help">
            {canEncryptKeys
              ? 'Stored encrypted on this computer.'
              : 'This computer has no secure key storage, so the key is kept only until you close the app.'}
          </FieldDescription>
        )}
      </Field>

      <Field data-invalid={!!errors.model}>
        <FieldLabel htmlFor="ai-model">Model</FieldLabel>
        <Input
          id="ai-model"
          value={draft.model}
          placeholder={isLocalCapable ? 'e.g. llama3.1' : undefined}
          aria-invalid={!!errors.model}
          aria-describedby={errors.model ? 'ai-model-error' : undefined}
          onChange={(e) => onChange({ ...draft, model: e.target.value })}
        />
        <FieldError id="ai-model-error">{errors.model}</FieldError>
      </Field>
    </FieldGroup>
  )
}
