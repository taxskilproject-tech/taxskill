export interface ReportingRpcArguments {
  p_organization_id: string;
  p_request_id?: string;
  p_stage?: "start" | "finish";
  p_resource?: string;
  p_input: Record<string, unknown>;
}
