"use client";

import { Section, Demo } from "./design-helpers";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
} from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  Info,
  XCircle,
  TextB as Bold,
  TextItalic as Italic,
  TextUnderline as Underline,
  TextAlignLeft as AlignLeft,
  TextAlignCenter as AlignCenter,
  TextAlignRight as AlignRight,
  Star,
  DownloadSimple as Download,
  ShareNetwork as Share2,
  Copy,
  Plus,
  DotsThree as MoreHorizontal,
} from "@phosphor-icons/react";

export function ButtonsSection() {
  return (
    <Section
      id="buttons"
      title="Button"
      description="All variants and sizes of the Button component."
    >
      <div className="space-y-8">
        <Demo label="Variants">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </Demo>

        <Demo label="Sizes">
          <Button size="xs">XSmall</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">
            <Plus />
          </Button>
          <Button size="icon-xs">
            <Plus />
          </Button>
          <Button size="icon-sm">
            <Plus />
          </Button>
          <Button size="icon-lg">
            <Plus />
          </Button>
        </Demo>

        <Demo label="With Icons">
          <Button>
            <Download /> Download
          </Button>
          <Button variant="outline">
            <Share2 /> Share
          </Button>
          <Button variant="secondary">
            <Copy /> Copy
          </Button>
          <Button variant="ghost">
            <Star /> Favourite
          </Button>
        </Demo>

        <Demo label="States">
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>
            Outline Disabled
          </Button>
          <Button variant="ghost" disabled>
            Ghost Disabled
          </Button>
        </Demo>

        <Demo label="Button Group">
          <ButtonGroup>
            <Button variant="outline">
              <Bold />
            </Button>
            <Button variant="outline">
              <Italic />
            </Button>
            <Button variant="outline">
              <Underline />
            </Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button variant="outline">
              <AlignLeft />
            </Button>
            <Button variant="outline">
              <AlignCenter />
            </Button>
            <Button variant="outline">
              <AlignRight />
            </Button>
          </ButtonGroup>
        </Demo>
      </div>
    </Section>
  );
}

export function BadgesSection() {
  return (
    <Section
      id="badges"
      title="Badge"
      description="Label and status indicators."
    >
      <Demo label="Variants">
        <Badge variant="default">Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="ghost">Ghost</Badge>
        <Badge variant="link">Link</Badge>
      </Demo>
    </Section>
  );
}

export function AlertsSection() {
  return (
    <Section
      id="alerts"
      title="Alert"
      description="Contextual feedback and notification messages."
    >
      <div className="space-y-3 w-full">
        <Alert>
          <Info />
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>
            This is the default alert. Use it for informational messages.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <XCircle />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            The destructive alert signals errors or irreversible actions.
          </AlertDescription>
        </Alert>
      </div>
    </Section>
  );
}

export function AvatarsSection() {
  return (
    <Section
      id="avatars"
      title="Avatar"
      description="User profile images with fallback and group support."
    >
      <div className="space-y-8">
        <Demo label="Sizes">
          <Avatar size="sm">
            <AvatarFallback>AB</AvatarFallback>
          </Avatar>
          <Avatar size="default">
            <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>LG</AvatarFallback>
          </Avatar>
        </Demo>

        <Demo label="With Badge">
          <Avatar size="default">
            <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
            <AvatarFallback>SC</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>LG</AvatarFallback>
            <AvatarBadge />
          </Avatar>
        </Demo>

        <Demo label="Group">
          <AvatarGroup>
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
              <AvatarFallback>SC</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>XY</AvatarFallback>
            </Avatar>
            <AvatarGroupCount>+4</AvatarGroupCount>
          </AvatarGroup>
        </Demo>
      </div>
    </Section>
  );
}

export function CardsSection() {
  return (
    <Section
      id="cards"
      title="Card"
      description="Container cards with header, content, footer, and action areas."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Default Card</CardTitle>
            <CardDescription>
              A simple card with header and content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Cards are the fundamental surface for grouping related information
              together.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>With Action</CardTitle>
            <CardDescription>CardAction sits in the header.</CardDescription>
            <CardAction>
              <Button size="icon-sm" variant="ghost">
                <MoreHorizontal />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The CardAction slot anchors to the top-right of the header.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>With Footer</CardTitle>
            <CardDescription>Includes a muted footer area.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Footer is great for actions or metadata.
            </p>
          </CardContent>
          <CardFooter className="justify-between">
            <span className="text-xs text-muted-foreground">
              Updated 2h ago
            </span>
            <Button size="sm" variant="outline">
              View
            </Button>
          </CardFooter>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Small Card</CardTitle>
            <CardDescription>
              size=&ldquo;sm&rdquo; reduces internal padding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Compact cards for dense UIs.
            </p>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
