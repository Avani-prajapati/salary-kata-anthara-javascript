import { Controller, useForm } from 'react-hook-form';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_VALUES = {
  firstName: '',
  lastName: '',
  email: '',
  departmentId: '',
  countryId: '',
  jobLevelId: '',
  salaryMajorUnits: '',
  hireDate: '',
};

function LookupSelect({ name, label, options, control, rules, required }) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          select
          required={required}
          label={label}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message}
        >
          <MenuItem value="">
            <em>Select {label.toLowerCase()}</em>
          </MenuItem>
          {options.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.name ?? option.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}

export function EmployeeForm({ lookups, onSubmit, submitLabel, onCancel, initialValues }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({ defaultValues: { ...DEFAULT_VALUES, ...initialValues } });
  const resolvedSubmitLabel = submitLabel ?? (initialValues ? 'Save changes' : 'Add employee');

  return (
    <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit(onSubmit)}>
      <TextField
        label="First name"
        autoComplete="given-name"
        required
        error={Boolean(errors.firstName)}
        helperText={errors.firstName?.message}
        {...register('firstName', { required: 'First name is required' })}
      />
      <TextField
        label="Last name"
        autoComplete="family-name"
        required
        error={Boolean(errors.lastName)}
        helperText={errors.lastName?.message}
        {...register('lastName', { required: 'Last name is required' })}
      />
      <TextField
        label="Email"
        autoComplete="email"
        required
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        {...register('email', {
          required: 'Email is required',
          pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address' },
        })}
      />
      <LookupSelect
        name="departmentId"
        label="Department"
        options={lookups.departments}
        control={control}
        required
        rules={{ required: 'Department is required' }}
      />
      <LookupSelect
        name="countryId"
        label="Country"
        options={lookups.countries}
        control={control}
        required
        rules={{ required: 'Country is required' }}
      />
      <LookupSelect
        name="jobLevelId"
        label="Job level"
        options={lookups.jobLevels}
        control={control}
        required
        rules={{ required: 'Job level is required' }}
      />
      <TextField
        label="Salary"
        type="number"
        slotProps={{ htmlInput: { step: '0.01' } }}
        required
        error={Boolean(errors.salaryMajorUnits)}
        helperText={errors.salaryMajorUnits?.message}
        {...register('salaryMajorUnits', {
          required: 'Salary is required',
          valueAsNumber: true,
          validate: (value) => value > 0 || 'Salary must be greater than 0',
        })}
      />
      <TextField
        label="Hire date"
        type="date"
        slotProps={{ inputLabel: { shrink: true } }}
        required
        error={Boolean(errors.hireDate)}
        helperText={errors.hireDate?.message}
        {...register('hireDate', { required: 'Hire date is required' })}
      />
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        {onCancel && (
          <Button type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="contained">
          {resolvedSubmitLabel}
        </Button>
      </Stack>
    </Stack>
  );
}
