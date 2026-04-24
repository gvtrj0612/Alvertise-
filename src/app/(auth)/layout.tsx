export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">A</span>
            </div>
            <span className="text-2xl font-bold">Alvertise</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Generate high-converting ads with AI
          </h1>
          <p className="text-lg text-muted-foreground">
            Create compelling ad copy and visuals for every platform in seconds.
            Powered by advanced AI to maximize your campaign performance.
          </p>
          <div className="space-y-4 pt-4">
            <Feature text="AI-powered ad copy generation" />
            <Feature text="Multi-platform support" />
            <Feature text="Performance analytics dashboard" />
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-primary" />
      </div>
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}
