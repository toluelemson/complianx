export interface CreateSectionCommand {
  name: string;
  content: Record<string, unknown>;
}

export interface UpdateSectionCommand {
  content: Record<string, unknown>;
}

export interface CreateSectionCommentCommand {
  body: string;
  mentions?: string[];
  linkedEntityType?: string;
  linkedEntityId?: string;
}

export interface SuggestSectionCommand {
  partialContent?: Record<string, unknown>;
  hint?: string;
  targetField?: string;
}
