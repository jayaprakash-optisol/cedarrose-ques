export type WorkflowStepState = "done" | "current" | "todo";

export function resolveWorkflowStepState(stepNumber: number, currentStep: number): WorkflowStepState {
  if (stepNumber < currentStep) return "done";
  if (stepNumber === currentStep) return "current";
  return "todo";
}
