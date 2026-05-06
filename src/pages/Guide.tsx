import { MarketingHeader } from '@/components/MarketingHeader';
import { Footer } from '@/components/Footer';
import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-2xl font-bold text-foreground mb-4">
      {children}
    </h2>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-base font-semibold text-foreground mb-2 mt-5">
      {children}
    </h3>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground leading-relaxed mb-3">
      {children}
    </p>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg px-4 py-3 mb-4 text-sm leading-relaxed"
      style={{ background: 'rgba(212,130,10,0.08)', borderLeft: '3px solid #D4820A', color: 'inherit' }}
    >
      {children}
    </div>
  );
}

function ComingSoon() {
  return (
    <span
      className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full ml-2 align-middle"
      style={{ background: 'rgba(212,130,10,0.12)', color: '#D4820A' }}
    >
      Coming soon
    </span>
  );
}

function Divider() {
  return <hr className="border-border my-12" />;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function GettingStarted() {
  const steps = [
    {
      n: '01',
      title: 'Create your containers',
      body: "From the dashboard, add each storage bin, shelf, or box. Give it a name, a location (Attic, Garage, Closet…), a colour, and list what's inside, items, a text description, or a photo.",
    },
    {
      n: '02',
      title: 'Print and attach labels',
      body: "Open a container's detail page and print its QR label. Stick it on the bin. The label shows only the QR code and a short readable ID like GAR01, no branding, no clutter. The label serves you, not us.",
    },
    {
      n: '03',
      title: 'Scan to see contents',
      body: "Point any phone camera at the QR code. No app to install. The container's full contents open instantly in the browser, items, notes, or photos, exactly as you entered them.",
    },
    {
      n: '04',
      title: "Search when you're not sure which box",
      body: "If you know what you're looking for but not where it is, use the household search link to search across every container at once. Type 'fairy lights' and it will tell you which box they are in.",
    },
  ];

  return (
    <section>
      <SectionHeading>The suggested flow</SectionHeading>
      <Prose>
        ContainQR is designed around a simple physical workflow: label your bins once, then
        never dig blindly again. Here's how most people get set up.
      </Prose>
      <div className="space-y-6 mt-6">
        {steps.map((step) => (
          <div key={step.n} className="flex gap-5">
            <span
              className="font-mono text-sm font-semibold flex-shrink-0 mt-0.5 w-7"
              style={{ color: '#D4820A' }}
            >
              {step.n}
            </span>
            <div>
              <p className="font-display font-semibold text-foreground mb-1">{step.title}</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HouseholdSharing() {
  return (
    <section>
      <SectionHeading>Household sharing</SectionHeading>
      <Prose>
        ContainQR is designed for homes, not individuals. Sharing works without requiring
        anyone else to create an account.
      </Prose>

      <SubHeading>How it works</SubHeading>
      <Prose>
        From <Link to="/account" className="underline text-foreground hover:text-primary transition-colors">Account → Household Sharing</Link>, generate
        a shareable link. Send it to family members via text or a group chat. Anyone with
        the link can search all your containers instantly — they see contents but cannot
        add, edit, or delete anything.
      </Prose>
      <Prose>
        The link is a UUID — long, random, and not guessable. You can rotate it at any
        time (the old link stops working immediately) or disable it entirely.
      </Prose>

      <SubHeading>Using a passcode with your sharing link</SubHeading>
      <Prose>
        If you set a household passcode, anyone opening your sharing link is prompted for
        it before they can search. They only have to enter it once per browser session —
        it's seamless after the first time. The passcode is stored in the browser's session
        storage and is never saved permanently on their device.
      </Prose>
      <Prose>
        This is useful when you want to share the link broadly (a family group chat, for
        example) but still want a lightweight layer of control.
      </Prose>
    </section>
  );
}

function PasswordProtection() {
  return (
    <section>
      <SectionHeading>Why we recommend password protecting all containers</SectionHeading>
      <Prose>
        Password protection is optional — but we suggest enabling it on all your containers
        by default, even if the contents aren't sensitive. Here's the reasoning.
      </Prose>

      <Callout>
        <strong className="text-foreground">Your sharing link is a URL.</strong>{' '}
        Unlike a passcode, a URL can be forwarded, screenshot, or accidentally shared with
        someone you didn't intend. Password-protecting your containers means that even if
        your household link ends up somewhere unexpected, nobody can read your contents
        without the passcode.
      </Callout>

      <SubHeading>One passcode covers everything</SubHeading>
      <Prose>
        The household passcode is set once in your account and applies to every
        password-protected container. You don't manage a different code per box — it's the
        same passcode your household already knows.
      </Prose>

      <SubHeading>It's invisible when you know it</SubHeading>
      <Prose>
        Once someone enters the correct passcode, the browser remembers it for the rest of
        that session. Scanning QR codes and clicking search results from then on is
        seamless — the passcode isn't asked for again until they close the browser.
      </Prose>

      <SubHeading>How to enable it</SubHeading>
      <Prose>
        Go to <Link to="/account" className="underline text-foreground hover:text-primary transition-colors">Account → Household Sharing</Link> and
        set a passcode. Then, when creating or editing a container in the dashboard, toggle
        on "Password Protection." The lock icon will appear next to that container in your
        list.
      </Prose>
    </section>
  );
}

function PrivateVsHidden() {
  return (
    <section>
      <SectionHeading>Password protected vs. hidden containers</SectionHeading>
      <Prose>
        These are two different concepts — one available now, one on the roadmap.
      </Prose>

      <SubHeading>Password protected (available now)</SubHeading>
      <Prose>
        A password-protected container is <em>visible</em> in household search results —
        someone searching will see the container's name and location — but its contents
        are hidden behind the passcode. They know the box exists; they just can't read
        what's inside without entering the code.
      </Prose>
      <Prose>
        This is the right choice for most containers. You get protection without
        obscurity.
      </Prose>

      <SubHeading>Hidden containers<ComingSoon /></SubHeading>
      <Prose>
        A hidden container won't appear in household search results at all. Only the owner
        can find it. This is for containers you'd prefer are undiscoverable even by name —
        gifts, personal items, anything you don't want showing up when a family member
        searches.
      </Prose>
      <Callout>
        Hidden containers are distinct from password-protected ones: protection means the
        name is visible but contents are locked; hidden means the container doesn't appear
        at all. You'll eventually be able to combine both.
      </Callout>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: 'Do household members need an account?',
      a: 'No. Anyone with your household link can search your containers. An account is only needed to create and manage containers.',
    },
    {
      q: 'What happens if I rotate my sharing link?',
      a: 'The old link stops working immediately. Anyone who had it bookmarked will need the new link. Your containers and all data are unaffected.',
    },
    {
      q: 'Is there a limit on containers or items?',
      a: 'No. Your subscription includes unlimited containers, items, photos, and notes.',
    },
    {
      q: 'What does the readable ID mean (e.g. GAR01)?',
      a: "It's a short code derived from your container's location and colour. It's printed on the label alongside the QR code so you can reference a specific bin in conversation or writing without needing to scan anything.",
    },
    {
      q: 'Can I use ContainQR for more than one household?',
      a: 'Not yet — one account covers one household. Multi-household support is on the roadmap.',
    },
    {
      q: 'What if I lose my passcode?',
      a: 'Go to Account → Household Sharing and remove the existing passcode, then set a new one. Anyone who had the old passcode cached in their browser will be prompted again on their next visit.',
    },
  ];

  return (
    <section>
      <SectionHeading>Frequently asked questions</SectionHeading>
      <div className="space-y-6">
        {items.map(({ q, a }) => (
          <div key={q}>
            <p className="font-display font-semibold text-foreground mb-1">{q}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const Guide = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketingHeader />

      <main className="flex-1">
        {/* Page header */}
        <div className="border-b border-border py-12">
          <div className="container mx-auto px-4 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide mb-2" style={{ color: '#D4820A' }}>
              Guide
            </p>
            <h1 className="font-display text-4xl font-bold text-foreground mb-3">
              How ContainQR works
            </h1>
            <p className="text-muted-foreground text-lg">
              Everything you need to know to get organised and keep your household on the
              same page.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 max-w-2xl py-14 space-y-0">
          <GettingStarted />
          <Divider />
          <HouseholdSharing />
          <Divider />
          <PasswordProtection />
          <Divider />
          <PrivateVsHidden />
          <Divider />
          <FAQ />

          {/* Footer CTA */}
          <div className="pt-4 pb-2">
            <p className="text-sm text-muted-foreground">
              Something missing?{' '}
              <a href="mailto:support@containqr.com" className="underline text-foreground hover:text-primary transition-colors">
                Let us know
              </a>{' '}
              and we'll add it here.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Guide;
