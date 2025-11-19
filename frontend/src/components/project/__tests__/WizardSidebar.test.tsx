import { render, screen } from '@testing-library/react';
import { WizardSidebar } from '../WizardSidebar';
import { STEP_CONFIG } from '../../../constants/steps';

describe('WizardSidebar', () => {
  it('renders progress and steps', () => {
    const sectionByName = new Map();
    sectionByName.set(STEP_CONFIG[0].id, { updatedAt: new Date().toISOString() });
    const incompleteFieldsByStep = new Map();
    incompleteFieldsByStep.set(STEP_CONFIG[0].id, []);

    render(
      <WizardSidebar
        completionRate={50}
        completedCount={2}
        completedSteps={new Set([STEP_CONFIG[0].id])}
        sectionByName={sectionByName}
        incompleteFieldsByStep={incompleteFieldsByStep}
        activeStepId={STEP_CONFIG[0].id}
        setActiveStepId={() => {}}
        projectQuery={{ data: { industry: 'Tech', riskLevel: 'High', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }}
      />,
    );

    expect(screen.getByText('Wizard Progress')).toBeInTheDocument();
    expect(screen.getByText(STEP_CONFIG[0].title)).toBeInTheDocument();
  });
});
