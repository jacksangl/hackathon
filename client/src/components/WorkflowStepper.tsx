const STEPS = ["Upload", "Analyze", "Improve", "Tailor", "Prepare", "Download"];

export const WorkflowStepper = ({ currentStep }: { currentStep: number }) => {
  return (
    <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-6">
      {STEPS.map((step, index) => {
        const done = currentStep > index;
        const active = currentStep === index;

        return (
          <div
            key={step}
            className={`rounded-md border px-3 py-2 text-center text-xs font-medium uppercase tracking-wide ${
              done
                ? "border-primary bg-primary text-primaryForeground"
                : active
                  ? "border-foreground bg-accent text-foreground"
                  : "border-border bg-white text-mutedForeground"
            }`}
          >
            {step}
          </div>
        );
      })}
    </div>
  );
};
