export interface FileSizeFieldProps {
  id: string;
  name: string;
  label: string;
  maximum: number;
  defaultValue?: number;
  value?: number;
  onChange?: (bytes: number) => void;
}
