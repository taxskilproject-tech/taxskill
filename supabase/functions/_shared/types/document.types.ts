export interface FilePolicy { allowed_formats: string[]; max_file_bytes: number }
export interface ValidationResult {
  schema_version: number;
  status: string;
  actual_bytes: number;
  actual_mime: string;
  extension: string;
  sha256: string;
  validated_at: string;
  error_code: null;
  validator_version: string;
  checks: { size: boolean; signature: boolean; office_container: boolean | null };
}
