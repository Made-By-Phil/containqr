import { Plus, QrCode, Smartphone, Search } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Plus,
    title: 'Create a Container',
    description: 'Add a new container with a name, location, and list of contents. Each container gets a unique short ID.',
  },
  {
    number: '02',
    icon: QrCode,
    title: 'Print the QR Label',
    description: 'Generate and print a QR code label with the container ID. Stick it on your storage bin.',
  },
  {
    number: '03',
    icon: Smartphone,
    title: 'Scan to View',
    description: 'When you need to know what\'s inside, just scan the QR code with your phone camera.',
  },
  {
    number: '04',
    icon: Search,
    title: 'Search Anytime',
    description: 'Looking for something specific? Search your entire inventory and find which container has it.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get organized in minutes with a simple four-step process
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-0.5 bg-border" />
              )}
              
              <div className="text-center">
                <div className="relative inline-flex mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {step.number.slice(-1)}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
