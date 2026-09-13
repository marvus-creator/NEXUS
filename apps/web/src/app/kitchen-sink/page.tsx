'use client';

import {
  Avatar,
  AvatarStack,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  Eyebrow,
  Field,
  Input,
  Progress,
  Ring,
  SectionHeading,
  Separator,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeToggle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@nexus/ui';
import { ArrowRight, Compass, Inbox, Plus, Search, Sparkles } from 'lucide-react';

const surfaces = [
  { name: 'ground', token: '--ground', className: 'bg-ground' },
  { name: 'surface', token: '--surface', className: 'bg-surface' },
  { name: 'surface-raised', token: '--surface-raised', className: 'bg-surface-raised' },
  { name: 'surface-hover', token: '--surface-hover', className: 'bg-surface-hover' },
  { name: 'line', token: '--border', className: 'bg-line' },
  { name: 'line-strong', token: '--border-strong', className: 'bg-line-strong' },
];

const signal = [
  { name: 'accent', className: 'bg-accent' },
  { name: 'accent-strong', className: 'bg-accent-strong' },
  { name: 'accent-soft', className: 'bg-accent-soft' },
  { name: 'success', className: 'bg-success' },
  { name: 'warning', className: 'bg-warning' },
  { name: 'danger', className: 'bg-danger' },
];

const modules = [
  { name: 'Home', className: 'bg-module-home' },
  { name: 'Discover', className: 'bg-module-discover' },
  { name: 'People', className: 'bg-module-people' },
  { name: 'Events', className: 'bg-module-events' },
  { name: 'Nearby', className: 'bg-module-nearby' },
  { name: 'Learn', className: 'bg-module-learn' },
  { name: 'AI', className: 'bg-module-ai' },
];

const people = [
  { name: 'Malvyn Andagijimana' },
  { name: 'Aline Uwase' },
  { name: 'Kevin Mugisha' },
  { name: 'Sandrine Ingabire' },
  { name: 'Eric Habimana' },
  { name: 'Diane Umutoni' },
];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-24">
      <Eyebrow className="mb-4">{title}</Eyebrow>
      {children}
    </section>
  );
}

export default function KitchenSinkPage() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-dvh">
        <header className="border-line bg-ground/80 sticky top-0 z-40 border-b backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-baseline gap-3">
              <span className="text-lg font-semibold tracking-tight">NEXUS</span>
              <span className="text-ink-subtle text-xs">Design System</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto flex max-w-5xl flex-col gap-14 px-6 py-12">
          <Block title="Foundation">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {surfaces.map((surface) => (
                <div key={surface.name} className="flex flex-col gap-2">
                  <div className={`border-line h-16 rounded-md border ${surface.className}`} />
                  <div>
                    <p className="text-xs font-medium">{surface.name}</p>
                    <p className="text-ink-subtle font-mono text-[0.6875rem]">{surface.token}</p>
                  </div>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Signal">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {signal.map((color) => (
                <div key={color.name} className="flex flex-col gap-2">
                  <div className={`border-line h-16 rounded-md border ${color.className}`} />
                  <p className="text-xs font-medium">{color.name}</p>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Module tints">
            <div className="flex flex-wrap gap-2">
              {modules.map((module) => (
                <span
                  key={module.name}
                  className="border-line bg-surface inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                >
                  <span className={`size-2 rounded-full ${module.className}`} />
                  {module.name}
                </span>
              ))}
            </div>
          </Block>

          <Separator />

          <Block title="Typography">
            <div className="flex flex-col gap-5">
              <p className="text-display font-semibold">Your world</p>
              <h1 className="text-4xl font-semibold tracking-tight">Discover what matters today</h1>
              <h2 className="text-2xl font-semibold tracking-tight">Circles near you</h2>
              <h3 className="text-lg font-semibold tracking-tight">Kigali Developers</h3>
              <p className="text-ink-muted max-w-prose text-[0.9375rem] leading-relaxed">
                Body copy sits at fifteen pixels with generous leading so long passages in Learning
                and Circles stay readable. Secondary text drops to the muted ink token rather than
                shrinking further.
              </p>
              <p className="text-micro text-ink-subtle font-semibold uppercase">Eyebrow label</p>
              <p className="text-ink-muted font-mono text-sm">2,481 members · 14 events</p>
            </div>
          </Block>

          <Separator />

          <Block title="Buttons">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-3">
                <Button>
                  Explore Nexus <ArrowRight />
                </Button>
                <Button variant="secondary">Create Account</Button>
                <Button variant="outline">Sign In</Button>
                <Button variant="ghost">Skip</Button>
                <Button variant="danger">Delete</Button>
                <Button variant="link">Learn more</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" variant="secondary">
                  <Plus />
                </Button>
                <Button loading>Saving</Button>
                <Button disabled>Disabled</Button>
              </div>
            </div>
          </Block>

          <Block title="Inputs">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Search" hint="Searches people, circles, events and places.">
                <Input placeholder="Find anything in Nexus" icon={<Search />} />
              </Field>
              <Field label="Username" error="That username is already taken.">
                <Input defaultValue="malvyn" invalid />
              </Field>
              <Field label="Bio" className="sm:col-span-2">
                <Textarea placeholder="Tell people what you are working on" />
              </Field>
              <div className="border-line bg-surface flex items-center justify-between rounded-md border p-4 sm:col-span-2">
                <div>
                  <p className="text-sm font-medium">Show my activity to friends</p>
                  <p className="text-ink-muted mt-0.5 text-xs">
                    Controls what appears on your profile activity tab.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </Block>

          <Separator />

          <Block title="Cards">
            <div className="grid gap-4 md:grid-cols-3">
              <Card interactive>
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="bg-accent-soft text-module-discover flex size-9 items-center justify-center rounded-md">
                      <Compass className="size-4" />
                    </span>
                    <Badge variant="accent">New</Badge>
                  </div>
                  <CardTitle>Kigali Developers</CardTitle>
                  <CardDescription>2,481 members building software across Rwanda.</CardDescription>
                </CardHeader>
                <CardFooter>
                  <AvatarStack people={people} max={4} />
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Java exam</CardTitle>
                  <CardDescription>Friday · 4 study sessions planned</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Progress value={62} />
                  <div className="text-ink-muted flex items-center justify-between text-xs">
                    <span>Revision progress</span>
                    <span className="text-ink font-mono font-medium">62%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>This week</CardTitle>
                  <CardDescription>Goals across learning and fitness</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-5">
                  <Ring value={78} tint="var(--module-learn)">
                    78%
                  </Ring>
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">7-day streak</span>
                    <span className="text-ink-muted text-xs">Longest yet</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Block>

          <Block title="Badges, avatars, overlays">
            <div className="flex flex-wrap items-center gap-3">
              <Badge>Neutral</Badge>
              <Badge variant="accent">Accent</Badge>
              <Badge variant="success">Online</Badge>
              <Badge variant="warning">Pending</Badge>
              <Badge variant="danger">Reported</Badge>
              <Badge variant="solid">
                <Sparkles /> AI
              </Badge>
              <Separator orientation="vertical" className="h-6" />
              <Avatar name="Malvyn Andagijimana" size="sm" />
              <Avatar name="Aline Uwase" size="md" />
              <Avatar name="Kevin Mugisha" size="lg" ring />
              <Separator orientation="vertical" className="h-6" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary" size="sm">
                    Hover me
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tooltips use the raised surface</TooltipContent>
              </Tooltip>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Open dialog
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Move your study session?</DialogTitle>
                    <DialogDescription>
                      Nexus wants to move Java revision to 8:00 PM because a meeting was added at
                      6:30 PM. Nothing changes until you confirm.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" size="sm">
                      Keep as is
                    </Button>
                    <Button size="sm">Move session</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Block>

          <Separator />

          <Block title="Tabs">
            <Tabs defaultValue="for-you">
              <TabsList>
                <TabsTrigger value="for-you">For You</TabsTrigger>
                <TabsTrigger value="trending">Trending</TabsTrigger>
                <TabsTrigger value="places">Places</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="people">People</TabsTrigger>
              </TabsList>
              <TabsContent value="for-you" className="pt-5">
                <p className="text-ink-muted text-sm">
                  Personalized content, ranked from interests you confirmed during onboarding.
                </p>
              </TabsContent>
              <TabsContent value="trending" className="pt-5">
                <p className="text-ink-muted text-sm">What is moving in your city right now.</p>
              </TabsContent>
              <TabsContent value="places" className="pt-5">
                <p className="text-ink-muted text-sm">Cafés, venues and attractions near you.</p>
              </TabsContent>
              <TabsContent value="events" className="pt-5">
                <p className="text-ink-muted text-sm">Things happening this week.</p>
              </TabsContent>
              <TabsContent value="people" className="pt-5">
                <p className="text-ink-muted text-sm">People worth knowing.</p>
              </TabsContent>
            </Tabs>
          </Block>

          <Block title="Loading and empty">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="flex flex-col gap-4 pt-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-28 w-full rounded-lg" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                </CardContent>
              </Card>
              <EmptyState
                icon={<Inbox />}
                title="No messages yet"
                description="When you start a conversation with someone in Nexus, it will appear here."
                action={<Button size="sm">Find people</Button>}
              />
            </div>
          </Block>

          <Separator />

          <Block title="Section heading">
            <SectionHeading
              eyebrow="Near you"
              title="Happening in Kigali this week"
              description="Events pulled from circles you joined and interests you follow."
              action={
                <Button variant="ghost" size="sm">
                  See all <ArrowRight />
                </Button>
              }
            />
          </Block>

          <footer className="text-ink-subtle border-line border-t pt-8 pb-4 text-xs">
            Nexus design system · checkpoint 1.1
          </footer>
        </main>
      </div>
    </TooltipProvider>
  );
}
