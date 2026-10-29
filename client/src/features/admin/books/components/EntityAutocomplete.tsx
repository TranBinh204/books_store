'use client';

import { Autocomplete, CircularProgress, TextField, createFilterOptions } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { AUTOCOMPLETE_DEBOUNCE_MS } from '@/lib/constants';
import { errorMessage } from '@/lib/form';
import type { IdName } from '../../catalog-types';
import { namedEntitiesKey, namedEntityApi } from '../../named-entities';

type Option = IdName & { create?: string };

interface BaseProps {
  resource: 'authors' | 'publishers';
  /** vd "tác giả" */
  label: string;
  error?: string;
  required?: boolean;
}

type EntityAutocompleteProps = BaseProps &
  (
    | { multiple: true; value: IdName[]; onChange: (value: IdName[]) => void }
    | { multiple?: false; value: IdName | null; onChange: (value: IdName | null) => void }
  );

const filter = createFilterOptions<Option>();

/**
 * Chọn tác giả / NXB có tìm kiếm phía server.
 * Gõ tên chưa có → hiện "＋ Thêm … mới" → tạo ngay rồi chọn luôn.
 */
export function EntityAutocomplete(props: EntityAutocompleteProps) {
  const { resource, label, error, required } = props;
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const q = useDebounce(input.trim(), AUTOCOMPLETE_DEBOUNCE_MS);
  const [creating, setCreating] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: [...namedEntitiesKey(resource), 'options', q],
    queryFn: async () =>
      (await namedEntityApi.listNamedEntities(resource, { q: q || undefined, page: 1, limit: 20 }))
        .data,
  });
  const options: Option[] = (data ?? []).map(({ id, name }) => ({ id, name }));

  const createAndSelect = async (name: string) => {
    setCreating(true);
    try {
      const created = await namedEntityApi.createNamedEntity(resource, name);
      queryClient.invalidateQueries({ queryKey: namedEntitiesKey(resource) });
      const item = { id: created.id, name: created.name };
      if (props.multiple) props.onChange([...props.value, item]);
      else props.onChange(item);
      enqueueSnackbar(`Đã thêm ${label} "${created.name}"`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(errorMessage(err), { variant: 'error' });
    } finally {
      setCreating(false);
      setInput('');
    }
  };

  const handleChange = (value: Option | Option[] | null) => {
    const list = Array.isArray(value) ? value : value ? [value] : [];
    const toCreate = list.find((option) => option.create);
    if (toCreate?.create) {
      void createAndSelect(toCreate.create);
      return;
    }
    if (props.multiple) props.onChange(list.map(({ id, name }) => ({ id, name })));
    else props.onChange(list[0] ? { id: list[0].id, name: list[0].name } : null);
  };

  return (
    <Autocomplete<Option, boolean>
      multiple={props.multiple}
      value={props.value as Option | Option[] | null}
      options={options}
      loading={isFetching || creating}
      filterSelectedOptions
      isOptionEqualToValue={(option, value) => option.id === value.id}
      getOptionLabel={(option) => option.name}
      inputValue={input}
      onInputChange={(_event, value, reason) => {
        if (reason !== 'reset') setInput(value);
      }}
      onChange={(_event, value) => handleChange(value as Option | Option[] | null)}
      filterOptions={(opts, state) => {
        const filtered = filter(opts, state);
        const name = state.inputValue.trim();
        const exists = opts.some((option) => option.name.toLowerCase() === name.toLowerCase());
        if (name && !exists) {
          filtered.push({ id: -1, name: `＋ Thêm ${label} "${name}"`, create: name });
        }
        return filtered;
      }}
      noOptionsText={`Không tìm thấy ${label}`}
      loadingText="Đang tải..."
      renderInput={(params) => (
        <TextField
          {...params}
          label={label.charAt(0).toUpperCase() + label.slice(1)}
          required={required}
          error={Boolean(error)}
          helperText={error ?? (props.multiple ? 'Thứ tự chọn = thứ tự hiển thị' : undefined)}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {(isFetching || creating) && <CircularProgress size={18} />}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
