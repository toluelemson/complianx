export interface RecordSuggestionFeedbackCommand {
  projectId: string;
  sectionId: string;
  fieldName: string;
  suggestion: string;
  liked: boolean;
  reason?: string;
}
