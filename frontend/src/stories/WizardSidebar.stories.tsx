import type { Meta, StoryObj } from '@storybook/react';
import { useMemo, useState } from 'react';
import { WizardSidebar } from '../components/project/WizardSidebar';
import { sampleSections, sampleTrackableSteps } from '../storybook/mocks';

const meta: Meta<typeof WizardSidebar> = {
  title: 'Project/WizardSidebar',
  component: WizardSidebar,
};

export default meta;

type Story = StoryObj<typeof WizardSidebar>;

export const Overview: Story = {
  render: () => {
    const [activeStepId, setActiveStepId] = useState(sampleTrackableSteps[0].stepId);
    const incompleteFieldsByStep = useMemo(() => {
      const map = new Map<string, any[]>();
      map.set('system_overview', []);
      map.set('risk_assessment', [{ name: 'dataset' }, { name: 'controls' }]);
      return map;
    }, []);

    const completedSteps = new Set(sampleTrackableSteps.filter((s) => s.missing === 0).map((s) => s.stepId));
    const completionRate = Math.round(
      (completedSteps.size / sampleTrackableSteps.length) * 100,
    );

    return (
      <WizardSidebar
        completionRate={completionRate}
        completedCount={completedSteps.size}
        completedSteps={completedSteps}
        sectionByName={sampleSections}
        incompleteFieldsByStep={incompleteFieldsByStep}
        activeStepId={activeStepId}
        setActiveStepId={setActiveStepId}
        projectQuery={{
          data: {
            industry: 'Healthcare AI',
            riskLevel: 'Medium',
            createdAt: new Date().toISOString(),
          },
        }}
      />
    );
  },
};
