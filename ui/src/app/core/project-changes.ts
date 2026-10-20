import { ProjectFieldDef } from '../models/api.models';
import { Project } from '../models/portfolio.models';

/**
 * The PATCH body for a project edit: every contract field whose value differs between the baseline and the edited project.
 * A contract field reads from the Project property named by its exportKey, or by its own key when there is none.
 * The API needs the program whenever the portfolio changes, so programKey always rides along with portfolioKey.
 */
export function changedProjectFields(
  baseline: Project,
  edited: Project,
  fields: ProjectFieldDef[],
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const field of fields) {
    const prop = (field.exportKey ?? field.key) as keyof Project;
    if (!(prop in edited) || baseline[prop] === edited[prop]) continue;
    changes[field.key] = edited[prop];
  }
  if ('portfolioKey' in changes) {
    changes['programKey'] = edited.programKey;
  }
  return changes;
}
